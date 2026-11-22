import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseRepairSnapshot, repairFingerprint, repairId, type RepairManifest } from "./rolling-meals-repair";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1" && process.env.POSTGRES_INTEGRATION_DISPOSABLE === "1";
const exec = promisify(execFile);
const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
const script = fileURLToPath(new URL("../../prisma/repair-rolling-meals.ts", import.meta.url));

describe.skipIf(!enabled)("repair CLI PostgreSQL integration (explicit local disposable DB only)", () => {
  let client: Client;
  let connection: string;
  let directory: string;
  const users: string[] = [];

  beforeAll(async () => {
    // Never import dotenv/application DB config or fall back to any ambient repair URL.
    const explicit = process.env.DATABASE_URL;
    if (!explicit) throw new Error("Explicit local disposable DATABASE_URL required");
    let target: URL;
    try { target = new URL(explicit); }
    catch { throw new Error("Invalid disposable DATABASE_URL (details suppressed)"); }
    if (!["postgres:", "postgresql:"].includes(target.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.username || target.pathname === "/" ||
      [...target.searchParams].some(([key, value]) => key !== "sslmode" || value !== "disable")) {
      throw new Error("Repair integration refuses non-local or overridden connection targets");
    }
    connection = explicit;
    client = new Client({ connectionString: connection, connectionTimeoutMillis: 5000 });
    await client.connect().catch(() => { throw new Error("Disposable database connection failed (details suppressed)"); });
    await client.query("SET search_path TO pg_catalog, public, pg_temp");
    directory = await mkdtemp(join(tmpdir(), "rolling-repair-test-"));
  });

  afterAll(async () => {
    if (client) {
      // Remove only IDs created by this suite; terminal unit FKs intentionally restrict deletion.
      for (const userId of users) {
        await client.query(`DELETE FROM rolling_meal_placements WHERE unit_id IN
          (SELECT u.id FROM rolling_meal_units u JOIN rolling_meal_entries e ON e.id=u.entry_id WHERE e.user_id=$1)`, [userId]);
        await client.query(`DELETE FROM rolling_meal_units WHERE entry_id IN (SELECT id FROM rolling_meal_entries WHERE user_id=$1)`, [userId]);
        await client.query(`DELETE FROM stored_meal_events WHERE user_id=$1`, [userId]);
        await client.query(`DELETE FROM stored_meal_lots WHERE user_id=$1`, [userId]);
        await client.query(`DELETE FROM users WHERE id=$1`, [userId]);
      }
      await client.end();
    }
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  async function cli(userId: string, manifest?: RepairManifest, apply = false) {
    const args = [tsx, script, "--user-id", userId];
    if (manifest) {
      const path = join(directory, `${randomUUID()}.json`);
      await writeFile(path, JSON.stringify(manifest), { mode: 0o600 });
      args.push("--manifest", path);
    }
    if (apply) args.push("--apply");
    try {
      const { stdout } = await exec(process.execPath, args, {
        env: { ...process.env, DATABASE_URL: "not-used-by-cli", REPAIR_DATABASE_URL: connection },
        timeout: 20000, maxBuffer: 4 * 1024 * 1024,
      });
      return { code: 0, report: JSON.parse(stdout) };
    } catch (error) {
      const failed = error as { code?: number; stdout?: string };
      return { code: failed.code ?? 1, report: failed.stdout?.trim() ? JSON.parse(failed.stdout) : null };
    }
  }

  async function fixture(cooked = false) {
    const userId = `repair-pg-'opaque-${randomUUID()}`;
    const recipeId = randomUUID();
    const planId = randomUUID();
    const batchId = randomUUID();
    const entryId = randomUUID();
    users.push(userId);
    await client.query(`INSERT INTO users (id,clerk_id) VALUES ($1,$1)`, [userId]);
    await client.query(`INSERT INTO recipes (id,user_id,name,slug,hands_on_time,total_time,servings,notes)
      VALUES ($1,$2,'Repair integration batch',$1,1,1,1,'{}')`, [recipeId, userId]);
    await client.query(`INSERT INTO plans (id,user_id,start_date,end_date) VALUES ($1,$2,'2026-11-23','2026-11-29')`, [planId, userId]);
    await client.query(`INSERT INTO plan_batches (id,plan_id,recipe_id) VALUES ($1,$2,$3)`, [batchId, planId, recipeId]);
    await client.query(`INSERT INTO plan_slots (id,plan_id,date,meal_type,recipe_id,used,batch_group_id)
      VALUES ($1,$2,'2026-11-23','DINNER',$3,$4,$5)`, [randomUUID(), planId, recipeId, cooked, batchId]);
    await client.query(`INSERT INTO plan_batch_storage_rows (id,plan_batch_id,count,position) VALUES ($1,$2,2,0)`, [randomUUID(), batchId]);
    await client.query(`INSERT INTO rolling_meal_entries (id,user_id,identity,recipe_id,count) VALUES ($1,$2,$3,$4,3)`,
      [entryId, userId, `recipe:${recipeId}`, recipeId]);
    const dry = await cli(userId);
    expect(dry.code).toBe(0);
    const snapshot = parseRepairSnapshot(dry.report.snapshot);
    const manifest: RepairManifest = {
      formatVersion: 1, userId, snapshotFingerprint: dry.report.snapshotFingerprint,
      reviewedBy: "disposable integration test", rationale: "Independent scheduled and remainder units",
      groups: [{ identity: { kind: "recipe", recipeId }, expectedEligibleCount: cooked ? 0 : 3,
        units: snapshot.sources.map((source, index) => ({ key: `unit-${index}`, history: [source.key], current: source.key,
          state: cooked ? source.slotId ? "COMPLETED" : "CONVERTED" : "PENDING", eligible: !cooked,
          rationale: "Explicit fixture portion" })) }],
      legacyQueue: [{ entryId, version: 1, unitKeys: snapshot.sources.map((_, index) => `unit-${index}`) }],
      excludedHistory: [], leftovers: cooked ? [{ batchId, decision: "import", cookedAt: "2026-11-23T12:00:00Z", rationale: "Approved fixture food" }] : [],
    };
    return { userId, planId, entryId, batchId, manifest, snapshot };
  }

  async function allocationFixture() {
    const data = await fixture(true);
    const recipeId = data.snapshot.recipes[0].id;
    const destinationPlan = randomUUID();
    const destinationBatch = randomUUID();
    await client.query(`UPDATE plans SET start_date='2026-11-16',end_date='2026-11-22' WHERE id=$1`, [data.planId]);
    await client.query(`UPDATE plan_slots SET date='2026-11-16' WHERE plan_id=$1`, [data.planId]);
    await client.query(`INSERT INTO plans (id,user_id,start_date,end_date) VALUES ($1,$2,'2026-11-23','2026-11-29')`,
      [destinationPlan, data.userId]);
    await client.query(`INSERT INTO plan_batches (id,plan_id,recipe_id) VALUES ($1,$2,$3)`, [destinationBatch, destinationPlan, recipeId]);
    for (const day of [23, 24]) await client.query(`INSERT INTO plan_slots
      (id,plan_id,date,meal_type,recipe_id,used,already_cooked,batch_group_id)
      VALUES ($1,$2,$3,'DINNER',$4,false,false,$5)`,
    [randomUUID(), destinationPlan, `2026-11-${day}`, recipeId, destinationBatch]);
    const memberId = randomUUID();
    const logId = randomUUID();
    const logEntryId = randomUUID();
    const logRecipeId = randomUUID();
    await client.query(`INSERT INTO family_members (id,user_id,name,sort_order) VALUES ($1,$2,'Historical nutrition',0)`, [memberId, data.userId]);
    await client.query(`INSERT INTO logs (id,plan_id) VALUES ($1,$2)`, [logId, data.planId]);
    await client.query(`INSERT INTO log_entries (id,log_id,date,meal_type,family_member_id)
      VALUES ($1,$2,'2026-11-16','DINNER',$3)`, [logEntryId, logId, memberId]);
    await client.query(`INSERT INTO log_entry_recipes (id,entry_id,source_recipe_id,plan_slot_id) VALUES ($1,$2,$3,$4)`,
      [logRecipeId, logEntryId, recipeId, data.snapshot.sources.find((source) => source.slotId)!.slotId]);
    await client.query(`INSERT INTO log_ingredients (id,entry_id,entry_recipe_id,amount) VALUES ($1,$2,$3,123.5)`,
      [randomUUID(), logEntryId, logRecipeId]);
    const dry = await cli(data.userId);
    data.snapshot = parseRepairSnapshot(dry.report.snapshot);
    data.manifest.snapshotFingerprint = dry.report.snapshotFingerprint;
    data.manifest.leftovers = [{ batchId: data.batchId, decision: "allocate", cookedAt: "2026-11-16T00:00:00Z",
      destinationSources: data.snapshot.sources.filter((source) => source.planId === destinationPlan).map((source) => source.key).reverse(),
      rationale: "Reviewed historical approximation from source plan date; both portions reused" }];
    return { ...data, destinationPlan, destinationBatch };
  }

  it("allocates exactly two cooked portions with preserved done flags, no fresh units or inventory, durable audit and zero-write rerun", async () => {
    const { userId, manifest, snapshot, batchId, destinationPlan, destinationBatch } = await allocationFixture();
    const nutrition = async () => (await client.query(`SELECT row_to_json(l) AS log,row_to_json(e) AS entry,
      row_to_json(r) AS recipe,row_to_json(i) AS ingredient FROM logs l JOIN plans p ON p.id=l.plan_id
      LEFT JOIN log_entries e ON e.log_id=l.id LEFT JOIN log_entry_recipes r ON r.entry_id=e.id
      LEFT JOIN log_ingredients i ON i.entry_id=e.id WHERE p.user_id=$1 ORDER BY l.id,e.id,r.id,i.id`, [userId])).rows;
    const nutritionBefore = await nutrition();
    expect((await cli(userId, manifest)).report.validation.issues).toEqual([]);
    expect((await cli(userId, manifest, true)).code).toBe(0);
    const after = (await cli(userId)).report.snapshot;
    const destinations = snapshot.sources.filter((source) => source.planId === destinationPlan).sort((a, b) => a.key < b.key ? -1 : 1);
    expect(after.evidence.slots.filter((slot: { plan_id: string }) => slot.plan_id === destinationPlan)).toHaveLength(2);
    for (const destination of destinations) {
      expect(after.evidence.slots.find((slot: { id: string }) => slot.id === destination.slotId)).toMatchObject({
        used: false, already_cooked: true, is_rolled_over: true, batch_group_id: null, placement_id: destination.placementId,
      });
      expect(after.evidence.mappings.some((mapping: { placement_id: string }) => mapping.placement_id === destination.placementId)).toBe(false);
    }
    expect(after.entries[0].count).toBe(0);
    expect(after.evidence.units).toHaveLength(3);
    expect(after.evidence.units.filter((unit: { state: string }) => unit.state === "CONVERTED")).toHaveLength(2);
    expect(after.evidence.units.filter((unit: { state: string }) => unit.state === "COMPLETED")).toHaveLength(1);
    expect(after.evidence.units.filter((unit: { state: string }) => unit.state === "PENDING")).toHaveLength(0);
    expect(after.evidence.lots).toEqual([]);
    expect(await nutrition()).toEqual(nutritionBefore);
    const scheduledSource = snapshot.sources.find((source) => source.slotId && source.planId !== destinationPlan)!;
    expect(after.evidence.slots.find((slot: { id: string }) => slot.id === scheduledSource.slotId)).toMatchObject({ used: true, already_cooked: false });
    expect(after.evidence.events).toHaveLength(4);
    const remainders = snapshot.sources.filter((source) => !source.slotId).sort((a, b) => a.key < b.key ? -1 : 1);
    for (const [index, source] of remainders.entries()) {
      const lotId = repairId(userId, repairFingerprint(manifest), `lot:${batchId}:${source.key}`);
      const destination = destinations[index];
      const raw = (snapshot.evidence.slots as { id: string; date: string; meal_type: string }[]).find((slot) => slot.id === destination.slotId)!;
      expect(after.evidence.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: "CREATED", lot_id: null, source_lot_id: lotId, quantity: 1, previous_count: 0, next_count: 1 }),
        expect.objectContaining({ type: "TRANSFERRED", lot_id: null, source_lot_id: lotId, quantity: 1, previous_count: 1, next_count: 0,
          placement_id: destination.placementId, destination_plan_id: destinationPlan, destination_date: raw.date, destination_meal: raw.meal_type }),
      ]));
      expect(after.evidence.units).toEqual(expect.arrayContaining([expect.objectContaining({
        state: "CONVERTED", eligible: false, current_plan_id: source.planId, batch_id: batchId,
      })]));
    }
    expect(after.evidence.resolutions).toEqual(expect.arrayContaining([
      { plan_id: snapshot.sources.find((source) => !source.slotId)!.planId, batch_id: batchId },
      { plan_id: destinationPlan, batch_id: destinationBatch },
    ]));
    expect(after.plans.every((plan: { id: string; version: number }) => plan.version === snapshot.plans.find((before) => before.id === plan.id)!.version + 1)).toBe(true);
    expect((await cli(userId, manifest, true)).report).toMatchObject({ status: "already-migrated", writes: 0, manifestMatch: true });
    expect((await cli(userId)).report.snapshotFingerprint).toBe(repairFingerprint(after));
  }, 30000);

  it.each(["count", "foreign", "duplicate", "completed", "partial-batch", "remainder", "event", "fresh-unit"])(
    "rejects allocation conflict %s without writes", async (conflict) => {
      const { userId, manifest, snapshot, destinationPlan, destinationBatch } = await allocationFixture();
      const decision = manifest.leftovers[0];
      if (decision.decision !== "allocate") throw new Error("Expected allocation fixture");
      const destination = snapshot.sources.find((source) => source.planId === destinationPlan)!;
      if (conflict === "count") decision.destinationSources.pop();
      if (conflict === "foreign") decision.destinationSources[0] = "slot:foreign";
      if (conflict === "duplicate") decision.destinationSources[1] = decision.destinationSources[0];
      if (conflict === "completed") await client.query(`UPDATE plan_slots SET used=true WHERE id=$1`, [destination.slotId]);
      if (conflict === "partial-batch") await client.query(`INSERT INTO plan_slots
        (id,plan_id,date,meal_type,recipe_id,batch_group_id) VALUES ($1,$2,'2026-11-25','DINNER',$3,$4)`,
      [randomUUID(), destinationPlan, snapshot.recipes[0].id, destinationBatch]);
      if (conflict === "remainder") await client.query(`INSERT INTO plan_batch_storage_rows
        (id,plan_batch_id,count,position) VALUES ($1,$2,1,0)`, [randomUUID(), destinationBatch]);
      if (conflict === "event") await client.query(`INSERT INTO stored_meal_events
        (id,user_id,recipe_id,recipe_name,type,quantity,placement_id) VALUES ($1,$2,$3,'Previous transfer','TRANSFERRED',1,$4)`,
      [randomUUID(), userId, snapshot.recipes[0].id, destination.placementId]);
      if (conflict === "fresh-unit") manifest.groups[0].units.push({ key: "fresh", current: destination.key,
        history: [destination.key], state: "PENDING", eligible: false, rationale: "Conflicting uncooked ledger unit" });
      const before = await cli(userId);
      manifest.snapshotFingerprint = before.report.snapshotFingerprint;
      expect((await cli(userId, manifest, true)).code).not.toBe(0);
      expect((await cli(userId)).report.snapshotFingerprint).toBe(before.report.snapshotFingerprint);
    }, 30000,
  );

  it("rolls back allocation flags, lots, audit, resolutions and ledger on a late transfer event collision", async () => {
    const target = await allocationFixture();
    const foreign = await fixture();
    const source = target.snapshot.sources.filter((row) => !row.slotId).sort((a, b) => a.key < b.key ? -1 : 1)[0];
    const collision = repairId(target.userId, repairFingerprint(target.manifest), `transfer:${target.batchId}:${source.key}`);
    await client.query(`INSERT INTO stored_meal_events (id,user_id,recipe_id,recipe_name,type,quantity)
      VALUES ($1,$2,$3,'Foreign retained event','CREATED',1)`, [collision, foreign.userId, foreign.snapshot.recipes[0].id]);
    expect((await cli(target.userId, target.manifest, true)).code).not.toBe(0);
    expect((await cli(target.userId)).report.snapshotFingerprint).toBe(target.manifest.snapshotFingerprint);
    expect((await client.query(`SELECT user_id FROM stored_meal_events WHERE id=$1`, [collision])).rows).toEqual([{ user_id: foreign.userId }]);
  }, 30000);

  it("dry-runs without writes, rejects collapse, bootstraps and repeats with zero writes", async () => {
    const { userId, manifest, snapshot } = await fixture();
    const preview = await cli(userId, manifest);
    expect(preview.code).toBe(0);
    expect(preview.report.validation.issues).toEqual([]);
    expect(preview.report.snapshotFingerprint).toBe(manifest.snapshotFingerprint);
    const remainders = snapshot.sources.filter((source) => !source.slotId);
    const collapsed = structuredClone(manifest);
    const units = collapsed.groups[0].units;
    const first = units.find((unit) => unit.current === remainders[0].key)!;
    first.history.push(remainders[1].key);
    collapsed.groups[0].units = units.filter((unit) => unit.current !== remainders[1].key);
    expect((await cli(userId, collapsed, true)).code).not.toBe(0);
    expect((await cli(userId)).report.snapshotFingerprint).toBe(manifest.snapshotFingerprint);
    const applied = await cli(userId, manifest, true);
    expect(applied.code).toBe(0);
    expect(applied.report.status).toBe("applied");
    const migrated = await cli(userId);
    expect(migrated.report.status).toBe("already-migrated");
    expect(migrated.report.snapshot.existingUnits).toBe(3);
    const repeated = await cli(userId, manifest, true);
    expect(repeated.report).toMatchObject({ status: "already-migrated", writes: 0, manifestMatch: true });
    expect((await cli(userId)).report.snapshotFingerprint).toBe(migrated.report.snapshotFingerprint);
    expect((await cli(userId, { ...manifest, rationale: "Unrelated manifest" }, true)).code).not.toBe(0);
  }, 30000);

  it("rejects a stale snapshot and foreign scope without any partial bootstrap", async () => {
    const { userId, planId, manifest } = await fixture();
    await client.query(`UPDATE plans SET version=version+1 WHERE id=$1`, [planId]);
    expect((await cli(userId, manifest, true)).code).not.toBe(0);
    const after = await cli(userId);
    expect(after.report.snapshot.lifecycleVersion).toBe(0);
    expect(after.report.snapshot.existingUnits).toBe(0);
    expect((await cli(userId, { ...manifest, userId: "foreign" }, true)).code).not.toBe(0);
  }, 30000);

  it("imports approved cooked portions once with terminal units, events and a resolution", async () => {
    const { userId, manifest, batchId } = await fixture(true);
    expect((await cli(userId, manifest, true)).code).toBe(0);
    const after = (await cli(userId)).report.snapshot;
    expect(after.evidence.lots).toHaveLength(2);
    expect(after.evidence.events).toHaveLength(2);
    expect(after.evidence.units.filter((unit: { state: string }) => unit.state === "CONVERTED")).toHaveLength(2);
    expect(after.evidence.resolutions).toEqual([{ plan_id: after.plans[0].id, batch_id: batchId }]);
    expect(after.evidence.slots[0].used).toBe(true);
    expect((await cli(userId, manifest, true)).report.writes).toBe(0);
    expect((await cli(userId)).report.snapshotFingerprint).toBe(repairFingerprint(after));
  }, 30000);

  it("rolls back entry updates on a deterministic ID collision rather than adopting foreign units", async () => {
    const target = await fixture();
    const foreign = await fixture();
    const collision = repairId(target.userId, repairFingerprint(target.manifest), `unit:${target.manifest.groups[0].units[0].key}`);
    await client.query(`INSERT INTO rolling_meal_units (id,entry_id) VALUES ($1,$2)`, [collision, foreign.entryId]);
    expect((await cli(target.userId, target.manifest, true)).code).not.toBe(0);
    expect((await cli(target.userId)).report.snapshotFingerprint).toBe(target.manifest.snapshotFingerprint);
    const retained = await client.query(`SELECT entry_id FROM rolling_meal_units WHERE id=$1`, [collision]);
    expect(retained.rows).toEqual([{ entry_id: foreign.entryId }]);
  }, 30000);

  it("serializes concurrent applies into one migration and one verified zero-write rerun", async () => {
    const { userId, manifest } = await fixture();
    const results = await Promise.all([cli(userId, manifest, true), cli(userId, manifest, true)]);
    expect(results.map((result) => result.code)).toEqual([0, 0]);
    expect(results.map((result) => result.report.status).sort()).toEqual(["already-migrated", "applied"]);
    expect(results.find((result) => result.report.status === "already-migrated")?.report)
      .toMatchObject({ writes: 0, manifestMatch: true });
    expect((await cli(userId)).report.snapshot.existingUnits).toBe(3);
  }, 30000);
});
