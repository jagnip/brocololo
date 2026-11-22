import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { repairFingerprint, type RepairManifest, type RepairSnapshot } from "../lib/db/rolling-meals-repair";

const driver = vi.hoisted(() => ({
  connect: vi.fn(), query: vi.fn(), end: vi.fn(), readFile: vi.fn(),
}));
vi.mock("pg", () => ({ Client: class {
  connect = driver.connect;
  query = driver.query;
  end = driver.end;
} }));
vi.mock("node:fs/promises", () => ({ readFile: driver.readFile }));

type Schema = { lifecycle_version: boolean; units: boolean; mappings: boolean };
const ready: Schema = { lifecycle_version: true, units: true, mappings: true };
const legacy: Schema = { lifecycle_version: false, units: false, mappings: false };

describe("repair CLI pre-lifecycle snapshots (mocked pg, no database connection)", () => {
  let schema: Schema;
  let stateExists: boolean;
  let planVersion: number;
  let output: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    schema = { ...legacy };
    stateExists = true;
    planVersion = 1;
    vi.stubEnv("REPAIR_DATABASE_URL", "postgresql://mock:mock@localhost/mock_repair");
    output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    driver.query.mockImplementation(async (sql: string, values?: unknown[]) => {
      let rows: unknown[] = [];
      if (sql.includes("information_schema.columns")) {
        expect(sql).toContain("to_regclass('public.rolling_meal_units')");
        expect(sql).toContain("to_regclass('public.rolling_meal_placements')");
        rows = [schema];
      } else if (sql.startsWith("SELECT")) {
        if (sql.includes("FROM users")) rows = [{ id: values?.[0] }];
        else if (sql.includes("FROM rolling_queue_states")) {
          if (sql.includes("SELECT lifecycle_version") && !schema.lifecycle_version) throw new Error("missing column");
          rows = stateExists ? [schema.lifecycle_version ? { lifecycle_version: 0 } : { user_id: values?.[0] }] : [];
        } else if (sql.includes("FROM rolling_meal_units")) {
          if (!schema.units) throw new Error("missing units table");
        } else if (sql.includes("FROM rolling_meal_placements")) {
          if (!schema.mappings || !schema.units) throw new Error("missing lineage table");
        } else if (sql.includes("FROM plans WHERE")) rows = [{
          id: "plan", user_id: values?.[0], version: planVersion, start_date: "2026-11-23", end_date: "2026-11-29",
        }];
        else if (sql.includes("FROM rolling_meal_entries WHERE")) rows = [{
          id: "entry", user_id: values?.[0], identity: "recipe:recipe", recipe_id: "recipe",
          meal_type: null, custom_meal: null, count: 1, version: 1,
        }];
        else if (sql.includes("FROM plan_slots s JOIN")) rows = [{
          id: "slot", plan_id: "plan", placement_id: null, recipe_id: "recipe", custom_name: null,
          meal_type: "DINNER", used: false, already_cooked: false, batch_group_id: null,
        }];
        else if (sql.includes("FROM recipes WHERE")) rows = [{ id: "recipe", user_id: values?.[0], name: "Meal" }];
      }
      return { rows, rowCount: /^(INSERT|UPDATE|DELETE)\b/.test(sql) ? 1 : rows.length };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function cli(userId = "owner", manifest?: RepairManifest, apply = false) {
    driver.end.mockClear();
    output.mockClear();
    vi.stubGlobal("process", Object.assign(Object.create(process), {
      argv: [process.execPath, "repair-rolling-meals.ts", "--user-id", userId,
        ...(manifest ? ["--manifest", "reviewed.json"] : []), ...(apply ? ["--apply"] : [])],
      exitCode: 0,
    }));
    driver.readFile.mockResolvedValue(JSON.stringify(manifest));
    vi.resetModules();
    try {
      await import("./repair-rolling-meals");
      await vi.waitFor(() => expect(driver.end).toHaveBeenCalledOnce());
      await vi.waitFor(() => expect(output).toHaveBeenCalled());
      return JSON.parse(output.mock.calls.at(-1)![0] as string);
    } finally {
      vi.unstubAllGlobals();
    }
  }

  function manifestFor(snapshot: RepairSnapshot): RepairManifest {
    return {
      formatVersion: 1, userId: snapshot.userId, snapshotFingerprint: repairFingerprint(snapshot),
      reviewedBy: "test operator", rationale: "Reviewed legacy unit",
      groups: [{ identity: { kind: "recipe", recipeId: "recipe" }, expectedEligibleCount: 1,
        units: [{ key: "unit", history: [snapshot.sources[0].key], current: snapshot.sources[0].key,
          state: "PENDING", eligible: true, rationale: "Independent portion" }] }],
      legacyQueue: [{ entryId: "entry", version: 1, unitKeys: ["unit"] }], excludedHistory: [], leftovers: [],
    };
  }

  const mutations = () => driver.query.mock.calls.filter(([sql]) => /^(INSERT|UPDATE|DELETE)\b/.test(sql));

  it.each(["owner-a", "owner-b"])("preserves existing legacy state evidence and fingerprint across additive migration for %s", async (userId) => {
    const before = await cli(userId);
    expect(before.schemaReady).toBe(false);
    expect(before.snapshot).toMatchObject({ lifecycleVersion: 0, existingUnits: 0, existingMappings: 0,
      evidence: { states: [{ lifecycle_version: 0 }], units: [], mappings: [] } });
    expect(before.snapshotFingerprint).toBe(repairFingerprint(before.snapshot));
    expect(driver.query.mock.calls.some(([sql]) => sql === "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")).toBe(true);
    expect(driver.query.mock.calls.some(([sql]) => /SELECT user_id FROM rolling_queue_states/.test(sql))).toBe(true);
    expect(driver.query.mock.calls.some(([sql]) => /FROM rolling_meal_(units|placements)/.test(sql))).toBe(false);
    const manifest = manifestFor(before.snapshot);
    expect((await cli(userId, manifest)).validation.issues).toEqual([]);
    schema = { ...ready };
    const after = await cli(userId, manifest);
    expect(after.schemaReady).toBe(true);
    expect(after.snapshot).toEqual(before.snapshot);
    expect(after.snapshotFingerprint).toBe(before.snapshotFingerprint);
    expect(after.validation.issues).toEqual([]);
    expect(mutations()).toEqual([]);
    expect((await cli(userId, manifest, true)).status).toBe("applied");
    expect(mutations().length).toBeGreaterThan(0);
  });

  it("preserves absent state rows, rather than inventing row existence", async () => {
    stateExists = false;
    const before = await cli();
    expect(before.snapshot.evidence.states).toEqual([]);
    schema = { ...ready };
    expect((await cli()).snapshotFingerprint).toBe(before.snapshotFingerprint);
    stateExists = true;
    expect((await cli()).snapshotFingerprint).not.toBe(before.snapshotFingerprint);
  });

  it.each([
    legacy,
    { lifecycle_version: true, units: false, mappings: false },
    { lifecycle_version: false, units: true, mappings: false },
    { lifecycle_version: false, units: false, mappings: true },
    { lifecycle_version: true, units: true, mappings: false },
    { lifecycle_version: true, units: false, mappings: true },
    { lifecycle_version: false, units: true, mappings: true },
  ])("rejects apply before data queries or writes for incomplete schema %j", async (partial) => {
    const before = await cli();
    const manifest = manifestFor(before.snapshot);
    schema = { ...partial };
    driver.query.mockClear();
    expect(await cli("owner", manifest, true)).toMatchObject({ status: "rejected",
      issues: [expect.stringContaining("Lifecycle schema is incomplete")] });
    expect(mutations()).toEqual([]);
    expect(driver.query.mock.calls.some(([sql]) => sql.includes("FROM users"))).toBe(false);
    expect(driver.query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(false);
    expect(driver.query.mock.calls.some(([sql]) => sql === "ROLLBACK")).toBe(true);
  });

  it("rejects a preflight manifest if user data changes after migration", async () => {
    const before = await cli();
    schema = { ...ready };
    planVersion++;
    expect(await cli("owner", manifestFor(before.snapshot), true)).toMatchObject({ status: "rejected",
      issues: expect.arrayContaining(["Stale snapshot fingerprint"]) });
    expect(mutations()).toEqual([]);
  });
});
