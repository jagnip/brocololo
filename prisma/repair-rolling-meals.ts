import { readFile } from "node:fs/promises";
import { Client } from "pg";
import {
  parseRepairManifest, parseRepairSnapshot, repairAllocationSlotSchema, repairId, repairIdentity, rollingMealsRepairReport,
  validateRollingMealsRepair, type RepairSnapshot, type RepairSource,
} from "../lib/db/rolling-meals-repair";

const usage = "Usage: npx tsx prisma/repair-rolling-meals.ts --user-id <id> [--manifest <reviewed.json>] [--apply]";

type LifecycleSchema = { lifecycle_version: boolean; units: boolean; mappings: boolean };

async function snapshot(client: Client, userId: string, schema: LifecycleSchema): Promise<RepairSnapshot> {
  const rows = async <T>(sql: string): Promise<T[]> => (await client.query(sql, [userId])).rows;
  const plans = await rows<RepairSnapshot["plans"][number]>(`SELECT * FROM plans WHERE user_id = $1`);
  const entries = await rows<RepairSnapshot["entries"][number]>(`SELECT * FROM rolling_meal_entries WHERE user_id = $1`);
  // Preserve row existence and the exact post-migration evidence shape, without hashing schema readiness.
  const states = schema.lifecycle_version
    ? await rows<{ lifecycle_version: number }>(`SELECT lifecycle_version FROM rolling_queue_states WHERE user_id = $1`)
    : (await rows<{ user_id: string }>(`SELECT user_id FROM rolling_queue_states WHERE user_id = $1`))
      .map(() => ({ lifecycle_version: 0 }));
  const slots = await rows<{
    id: string; plan_id: string; placement_id: string | null; recipe_id: string | null; custom_name: string | null;
    meal_type: "BREAKFAST" | "LUNCH" | "DINNER"; used: boolean; already_cooked: boolean; batch_group_id: string | null;
  }>(`SELECT s.* FROM plan_slots s JOIN plans p ON p.id = s.plan_id WHERE p.user_id = $1`);
  const customIngredients = await rows<{
    plan_slot_id: string; ingredient_id: string; unit_id: string | null; amount: number | null;
  }>(`SELECT i.* FROM plan_slot_custom_ingredients i JOIN plan_slots s ON s.id = i.plan_slot_id
      JOIN plans p ON p.id = s.plan_id WHERE p.user_id = $1`);
  const slotAudience = await rows<{ plan_slot_id: string; family_member_id: string }>(
    `SELECT a.* FROM plan_slot_audience_members a JOIN plan_slots s ON s.id = a.plan_slot_id
     JOIN plans p ON p.id = s.plan_id WHERE p.user_id = $1`);
  const batches = await rows<{ id: string; plan_id: string; recipe_id: string }>(
    `SELECT b.* FROM plan_batches b JOIN plans p ON p.id = b.plan_id WHERE p.user_id = $1`);
  const storageRows = await rows<{ id: string; plan_batch_id: string; count: number; position: number }>(
    `SELECT r.* FROM plan_batch_storage_rows r JOIN plan_batches b ON b.id = r.plan_batch_id
     JOIN plans p ON p.id = b.plan_id WHERE p.user_id = $1`);
  const remainderAudience = await rows<{ storage_row_id: string; family_member_id: string }>(
    `SELECT a.* FROM plan_batch_storage_row_audience_members a JOIN plan_batch_storage_rows r ON r.id = a.storage_row_id
     JOIN plan_batches b ON b.id = r.plan_batch_id JOIN plans p ON p.id = b.plan_id WHERE p.user_id = $1`);
  const resolutions = await rows(`SELECT r.* FROM plan_batch_remainder_resolutions r JOIN plans p ON p.id = r.plan_id WHERE p.user_id = $1`);
  const lots = await rows(`SELECT * FROM stored_meal_lots WHERE user_id = $1`);
  const events = await rows(`SELECT * FROM stored_meal_events WHERE user_id = $1`);
  const lotAudience = await rows(`SELECT a.* FROM stored_meal_lot_audience_members a JOIN stored_meal_lots l ON l.id = a.lot_id WHERE l.user_id = $1`);
  const capturedPlans = await rows(`SELECT * FROM rolling_captured_plans WHERE user_id = $1`);
  const units = schema.units
    ? await rows(`SELECT u.* FROM rolling_meal_units u JOIN rolling_meal_entries e ON e.id = u.entry_id WHERE e.user_id = $1`) : [];
  const mappings = schema.mappings
    ? await rows(`SELECT m.* FROM rolling_meal_placements m JOIN rolling_meal_units u ON u.id = m.unit_id
      JOIN rolling_meal_entries e ON e.id = u.entry_id WHERE e.user_id = $1`) : [];
  const recipes = await rows<RepairSnapshot["recipes"][number]>(`SELECT id, user_id, name FROM recipes WHERE user_id = $1`);
  const ingredients = await rows<RepairSnapshot["ingredients"][number]>(`SELECT id, user_id FROM ingredients WHERE user_id IS NULL OR user_id = $1`);
  const measurementUnits = await rows<{ id: string }>(`SELECT id FROM units WHERE $1::text IS NOT NULL`);
  const family = await rows<{ id: string }>(`SELECT id FROM family_members WHERE user_id = $1`);
  const sources: RepairSource[] = slots.filter((slot) => slot.recipe_id || slot.custom_name).map((slot) => ({
    key: `slot:${slot.id}`, slotId: slot.id, planId: slot.plan_id,
    placementId: slot.placement_id ?? repairId(userId, "placement", slot.id), batchId: slot.batch_group_id,
    identity: slot.recipe_id ? { kind: "recipe", recipeId: slot.recipe_id } : {
      kind: "custom", mealType: slot.meal_type, customMeal: {
        name: slot.custom_name!, ingredients: customIngredients.filter((row) => row.plan_slot_id === slot.id)
          .map((row) => ({ ingredientId: row.ingredient_id, unitId: row.unit_id, amount: row.amount })),
      },
    },
    used: slot.used, alreadyCooked: slot.already_cooked,
    audience: slotAudience.filter((row) => row.plan_slot_id === slot.id).map((row) => row.family_member_id),
  }));
  for (const batch of batches) {
    let index = 0;
    for (const row of storageRows.filter((row) => row.plan_batch_id === batch.id)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))) {
      if (!Number.isSafeInteger(row.count) || row.count < 0 || row.count > 10000) throw new Error("INVALID_REMAINDER_COUNT");
      for (let n = 0; n < row.count; n++) {
        const placementId = `rolling-remainder:${batch.id}:${index++}`;
        sources.push({ key: `${batch.plan_id}:${placementId}`, slotId: null, planId: batch.plan_id,
          placementId, batchId: batch.id, identity: { kind: "recipe", recipeId: batch.recipe_id },
          used: false, alreadyCooked: false,
          audience: remainderAudience.filter((item) => item.storage_row_id === row.id).map((item) => item.family_member_id) });
      }
    }
  }
  // JSON round-trip normalizes pg Date objects before hashing and date comparisons.
  return parseRepairSnapshot(JSON.parse(JSON.stringify({ userId, lifecycleVersion: states[0]?.lifecycle_version ?? 0,
    existingUnits: units.length, existingMappings: mappings.length, plans, entries, sources, recipes,
    ingredients, familyMemberIds: family.map((row) => row.id),
    evidence: { states, slots, customIngredients, slotAudience, batches, storageRows, remainderAudience,
      resolutions, lots, events, lotAudience, capturedPlans, units, mappings, measurementUnits },
  })));
}

async function apply(client: Client, state: RepairSnapshot, input: unknown) {
  const result = validateRollingMealsRepair(state, input);
  if (result.issues.length) {
    console.log(JSON.stringify({ status: "rejected", issues: result.issues }));
    throw new Error("MANIFEST_REJECTED");
  }
  if (result.alreadyMigrated) return { status: "already-migrated", writes: 0, manifestMatch: result.manifestMatch };
  const { manifest, fingerprint } = result;
  const id = (key: string) => repairId(state.userId, fingerprint, key);
  const sourceByKey = new Map(state.sources.map((source) => [source.key, source]));
  let writes = 0;
  const execute = async (sql: string, values: unknown[]) => {
    const affected = (await client.query(sql, values)).rowCount;
    if (affected !== 1) throw new Error("WRITE_PRECONDITION_FAILED");
    writes += affected;
  };
  const changedPlans = new Set(state.plans.map((plan) => plan.id));
  const entryIds = new Map<string, string>();
  for (const group of manifest.groups) {
    const identity = repairIdentity(group.identity);
    const existing = state.entries.find((entry) => entry.identity === identity);
    const entryId = existing?.id ?? id(`entry:${identity}`);
    entryIds.set(identity, entryId);
    const count = result.projections.find((projection) => projection.identity === identity)!.count;
    if (existing) {
      await execute(`UPDATE rolling_meal_entries SET count = $2, version = version + 1 WHERE id = $1 AND user_id = $3 AND version = $4`,
        [entryId, count, state.userId, existing.version]);
    } else {
      await execute(`INSERT INTO rolling_meal_entries (id,user_id,identity,recipe_id,meal_type,custom_meal,count,version)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,1)`, [entryId, state.userId, identity,
        group.identity.kind === "recipe" ? group.identity.recipeId : null,
        group.identity.kind === "custom" ? group.identity.mealType : null,
        group.identity.kind === "custom" ? JSON.stringify(group.identity.customMeal) : null, count]);
    }
    for (const unit of group.units) {
      const current = unit.current ? sourceByKey.get(unit.current)! : null;
      const source = unit.history.length ? sourceByKey.get(unit.history[0])! : null;
      await execute(`INSERT INTO rolling_meal_units
        (id,entry_id,state,eligible,current_plan_id,placement_id,batch_id,source_plan_id,source_placement_id,completed_at)
        VALUES ($1,$2,$3::"RollingMealUnitState",$4,$5,$6,$7,$8,$9,CASE WHEN $3::"RollingMealUnitState" = 'PENDING' THEN NULL ELSE CURRENT_TIMESTAMP END)`,
      [id(`unit:${unit.key}`), entryId, unit.state, unit.eligible, current?.planId ?? null,
        current?.slotId ? current.placementId : null, current?.batchId ?? null, source?.planId ?? null, source?.placementId ?? null]);
      for (const key of unit.history) {
        const placement = sourceByKey.get(key)!;
        if (placement.slotId) {
          const update = await client.query(`UPDATE plan_slots SET placement_id = $2 WHERE id = $1 AND plan_id = $3 AND placement_id IS NULL
            AND EXISTS (SELECT 1 FROM plans WHERE id = $3 AND user_id = $4)`,
            [placement.slotId, placement.placementId, placement.planId, state.userId]);
          writes += update.rowCount ?? 0;
          if (update.rowCount) changedPlans.add(placement.planId);
        }
        await execute(`INSERT INTO rolling_meal_placements (plan_id,placement_id,unit_id,batch_id) VALUES ($1,$2,$3,$4)`,
          [placement.planId, placement.placementId, id(`unit:${unit.key}`), placement.batchId]);
      }
    }
  }
  for (const exclusion of manifest.excludedHistory) {
    const source = sourceByKey.get(exclusion.source)!;
    const unitId = id(`excluded:${source.key}`);
    await execute(`INSERT INTO rolling_meal_units
      (id,entry_id,state,eligible,current_plan_id,placement_id,batch_id,source_plan_id,source_placement_id,completed_at)
      VALUES ($1,$2,'DISCARDED',false,$3,$4,$5,$3,$4,CURRENT_TIMESTAMP)`,
    [unitId, entryIds.get(repairIdentity(source.identity)), source.planId, source.placementId, source.batchId]);
    const update = await client.query(`UPDATE plan_slots SET placement_id = $2 WHERE id = $1 AND plan_id = $3 AND placement_id IS NULL
      AND EXISTS (SELECT 1 FROM plans WHERE id = $3 AND user_id = $4)`,
      [source.slotId, source.placementId, source.planId, state.userId]);
    writes += update.rowCount ?? 0;
    if (update.rowCount) changedPlans.add(source.planId);
    await execute(`INSERT INTO rolling_meal_placements (plan_id,placement_id,unit_id,batch_id) VALUES ($1,$2,$3,$4)`,
      [source.planId, source.placementId, unitId, source.batchId]);
  }
  // Retain legacy zero-count entries rather than deleting historical data.
  for (const entry of state.entries) {
    if (!manifest.groups.some((group) => repairIdentity(group.identity) === entry.identity)) {
      await execute(`UPDATE rolling_meal_entries SET count = 0, version = version + 1 WHERE id = $1 AND user_id = $2 AND version = $3`,
        [entry.id, state.userId, entry.version]);
    }
  }
  const resolvedDestinationBatches = new Set<string>();
  for (const decision of manifest.leftovers) {
    const sources = state.sources.filter((source) => source.batchId === decision.batchId && !source.slotId)
      .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    await execute(`INSERT INTO plan_batch_remainder_resolutions (plan_id,batch_id) VALUES ($1,$2)`, [sources[0].planId, decision.batchId]);
    if (decision.decision === "unavailable") continue;
    // One lot per explicit source unit preserves heterogeneous remainder audiences.
    for (const [index, source] of sources.entries()) {
      if (source.identity.kind !== "recipe") throw new Error("INVALID_BATCH_IDENTITY");
      const lotId = id(`lot:${decision.batchId}:${source.key}`);
      const recipeId = source.identity.recipeId;
      await execute(`INSERT INTO stored_meal_lots
        (id,user_id,recipe_id,source_plan_id,source_plan_batch_id,count,version,cooked_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,1,1,$6,CURRENT_TIMESTAMP)`,
      [lotId, state.userId, recipeId, source.planId, decision.batchId, decision.cookedAt]);
      for (const memberId of source.audience) {
        await execute(`INSERT INTO stored_meal_lot_audience_members (lot_id,family_member_id) VALUES ($1,$2)`, [lotId, memberId]);
      }
      await execute(`INSERT INTO stored_meal_events
        (id,user_id,lot_id,source_lot_id,recipe_id,recipe_name,type,quantity,previous_count,next_count)
        VALUES ($1,$2,$3,$3,$4,$5,'CREATED',1,0,1)`,
      [id(`event:${decision.batchId}:${source.key}`), state.userId, lotId, recipeId,
        state.recipes.find((recipe) => recipe.id === recipeId)!.name]);
      if (decision.decision === "allocate") {
        const destination = sourceByKey.get([...decision.destinationSources].sort()[index])!;
        const rawSlots = state.evidence.slots as unknown[];
        const slot = repairAllocationSlotSchema.parse(rawSlots.find((row) =>
          typeof row === "object" && row !== null && "id" in row && row.id === destination.slotId));
        await execute(`UPDATE plan_slots SET placement_id=$2,already_cooked=true,is_rolled_over=true,batch_group_id=NULL
          WHERE id=$1 AND plan_id=$3 AND recipe_id=$4 AND used=false AND already_cooked=false
          AND placement_id IS NOT DISTINCT FROM $5 AND batch_group_id IS NOT DISTINCT FROM $6
          AND date=$7 AND meal_type=$8::"PlannerMealType"
          AND EXISTS (SELECT 1 FROM plans WHERE id=$3 AND user_id=$9)`,
        [destination.slotId, destination.placementId, destination.planId, recipeId, slot.placement_id,
          destination.batchId, slot.date, slot.meal_type, state.userId]);
        await execute(`INSERT INTO stored_meal_events
          (id,user_id,lot_id,source_lot_id,recipe_id,recipe_name,type,quantity,previous_count,next_count,
           placement_id,destination_plan_id,destination_date,destination_meal)
          VALUES ($1,$2,$3,$3,$4,$5,'TRANSFERRED',1,1,0,$6,$7,$8,$9::"PlannerMealType")`,
        [id(`transfer:${decision.batchId}:${source.key}`), state.userId, lotId, recipeId,
          state.recipes.find((recipe) => recipe.id === recipeId)!.name, destination.placementId,
          destination.planId, slot.date, slot.meal_type]);
        await execute(`DELETE FROM stored_meal_lots WHERE id=$1 AND user_id=$2 AND count=1`, [lotId, state.userId]);
        if (destination.batchId && !resolvedDestinationBatches.has(destination.batchId)) {
          await execute(`INSERT INTO plan_batch_remainder_resolutions (plan_id,batch_id) VALUES ($1,$2)`,
            [destination.planId, destination.batchId]);
          resolvedDestinationBatches.add(destination.batchId);
        }
      }
    }
  }
  for (const planId of changedPlans) await execute(`UPDATE plans SET version = version + 1 WHERE id = $1 AND user_id = $2 AND version = $3`,
    [planId, state.userId, state.plans.find((plan) => plan.id === planId)!.version]);
  await execute(`INSERT INTO rolling_queue_states (user_id,lifecycle_version) VALUES ($1,1)
    ON CONFLICT (user_id) DO UPDATE SET lifecycle_version = 1 WHERE rolling_queue_states.lifecycle_version = 0`, [state.userId]);
  return { status: "applied", writes, manifestFingerprint: fingerprint, projections: result.projections };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") { console.log(usage); return; }
  let userId: string | undefined;
  let manifestPath: string | undefined;
  let shouldApply = false;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error("INVALID_FLAGS");
    seen.add(flag);
    if (flag === "--apply") shouldApply = true;
    else if ((flag === "--user-id" || flag === "--manifest") && args[i + 1] && !args[i + 1].startsWith("--")) {
      const value = args[++i];
      if (flag === "--user-id") userId = value;
      else manifestPath = value;
    } else throw new Error("INVALID_FLAGS");
  }
  if (!userId || (shouldApply && !manifestPath)) throw new Error("INVALID_FLAGS");
  const manifest = manifestPath ? parseRepairManifest(JSON.parse(await readFile(manifestPath, "utf8"))) : undefined;
  if (manifest && manifest.userId !== userId) throw new Error("INVALID_SCOPE");
  const connectionString = process.env.REPAIR_DATABASE_URL;
  if (!connectionString) throw new Error("EXPLICIT_CONNECTION_REQUIRED");
  const target = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(target.protocol) || !target.hostname || !target.username ||
    !target.pathname || target.pathname === "/") throw new Error("INVALID_EXPLICIT_CONNECTION");
  // No Prisma, dotenv, application configuration, or DATABASE_URL fallback.
  const client = new Client({ connectionString, application_name: "reviewed-rolling-repair", connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query(shouldApply ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL search_path TO pg_catalog, public, pg_temp");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '10s'");
    const schema = (await client.query<LifecycleSchema>(`SELECT
      EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'rolling_queue_states' AND column_name = 'lifecycle_version') AS lifecycle_version,
      to_regclass('public.rolling_meal_units') IS NOT NULL AS units,
      to_regclass('public.rolling_meal_placements') IS NOT NULL AS mappings`)).rows[0];
    const schemaReady = schema?.lifecycle_version === true && schema.units === true && schema.mappings === true;
    if (shouldApply && !schemaReady) {
      console.log(JSON.stringify({ status: "rejected", issues: ["Lifecycle schema is incomplete; apply the additive migration before repair apply"] }));
      throw new Error("LIFECYCLE_SCHEMA_REQUIRED");
    }
    const user = await client.query(`SELECT id FROM users WHERE id = $1${shouldApply ? " FOR UPDATE" : ""}`, [userId]);
    if (user.rowCount !== 1) throw new Error("UNKNOWN_USER");
    const state = await snapshot(client, userId, schema);
    const report = shouldApply ? await apply(client, state, manifest) : rollingMealsRepairReport(state, manifest);
    await client.query(shouldApply ? "COMMIT" : "ROLLBACK");
    console.log(JSON.stringify({ ...report, schemaReady }, null, 2));
    if (!shouldApply && manifest && validateRollingMealsRepair(state, manifest).issues.length) process.exitCode = 1;
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    throw new Error("REPAIR_ABORTED");
  } finally {
    await client.end();
  }
}

main().catch(() => {
  // Driver/config/JSON errors can contain credentials or private manifest content. Never print them.
  console.error(`Repair aborted. Check flags, explicit REPAIR_DATABASE_URL, reviewed manifest and database preconditions. ${usage}`);
  process.exitCode = 1;
});
