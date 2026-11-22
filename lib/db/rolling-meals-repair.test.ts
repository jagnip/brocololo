import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  canonicalRepairJson, parseRepairManifest, parseRepairSnapshot, repairFingerprint, repairId, rollingMealsRepairReport,
  validateRollingMealsRepair, type RepairManifest, type RepairSnapshot,
} from "./rolling-meals-repair";

function fixture() {
  const snapshot: RepairSnapshot = {
    userId: "owner", lifecycleVersion: 0, existingUnits: 0, existingMappings: 0,
    plans: [
      { id: "old", user_id: "owner", version: 2, start_date: "2026-11-16", end_date: "2026-11-22" },
      { id: "latest", user_id: "owner", version: 3, start_date: "2026-11-23", end_date: "2026-11-29" },
    ],
    entries: [{ id: "queue", user_id: "owner", identity: "recipe:r", version: 1, count: 1,
      recipe_id: "r", meal_type: null, custom_meal: null }],
    sources: [
      { key: "old", planId: "old", placementId: "p1", slotId: "s1", batchId: null,
        identity: { kind: "recipe", recipeId: "r" }, used: false, alreadyCooked: false, audience: ["member"] },
      { key: "new", planId: "latest", placementId: "p2", slotId: "s2", batchId: null,
        identity: { kind: "recipe", recipeId: "r" }, used: false, alreadyCooked: false, audience: ["member"] },
    ],
    recipes: [{ id: "r", user_id: "owner", name: "Pancake" }], ingredients: [], familyMemberIds: ["member"],
    evidence: { resolutions: [], lots: [], units: [], mappings: [], batches: [], measurementUnits: [] },
  };
  const manifest: RepairManifest = {
    formatVersion: 1, userId: "owner", snapshotFingerprint: repairFingerprint(snapshot),
    reviewedBy: "operator", rationale: "Reviewed actual lineage, not recipe equality",
    groups: [{ identity: { kind: "recipe", recipeId: "r" }, expectedEligibleCount: 1,
      units: [{ key: "pancake", state: "PENDING", eligible: true, current: "new", history: ["old", "new"], rationale: "Same carried meal" }] }],
    legacyQueue: [{ entryId: "queue", version: 1, unitKeys: ["pancake"] }], excludedHistory: [], leftovers: [],
  };
  return { snapshot, manifest };
}

function check(edit: (data: ReturnType<typeof fixture>) => void) {
  const data = fixture();
  edit(data);
  return validateRollingMealsRepair(data.snapshot, data.manifest);
}

function allocationFixture() {
  const { snapshot, manifest } = fixture();
  snapshot.sources[0].used = true;
  snapshot.sources[0].batchId = "cooked-batch";
  snapshot.sources[1].batchId = "destination-batch";
  snapshot.sources.push({ ...snapshot.sources[1], key: "new-2", slotId: "s3", placementId: "p3" });
  for (const index of [0, 1]) snapshot.sources.push({ ...snapshot.sources[0], key: `remainder-${index}`,
    slotId: null, placementId: `rolling-remainder:cooked-batch:${index}`, used: false });
  snapshot.evidence.batches = [
    { id: "cooked-batch", plan_id: "old", recipe_id: "r" },
    { id: "destination-batch", plan_id: "latest", recipe_id: "r" },
  ];
  snapshot.evidence.slots = snapshot.sources.filter((source) => source.slotId).map((source) => ({
    id: source.slotId, plan_id: source.planId, placement_id: source.placementId, recipe_id: "r",
    date: source.planId === "old" ? "2026-11-16" : "2026-11-23", meal_type: "DINNER",
    used: source.used, already_cooked: source.alreadyCooked, batch_group_id: source.batchId,
  }));
  snapshot.evidence.storageRows = [];
  snapshot.evidence.events = [];
  manifest.groups[0].units = snapshot.sources.filter((source) => source.key === "old" || !source.slotId).map((source) => ({
    key: source.key, current: source.key, history: [source.key], state: source.slotId ? "COMPLETED" : "CONVERTED",
    eligible: false, rationale: "Reviewed source portion",
  }));
  manifest.groups[0].expectedEligibleCount = 0;
  snapshot.entries[0].count = 2;
  manifest.legacyQueue[0].unitKeys = ["remainder-0", "remainder-1"];
  manifest.leftovers = [{ batchId: "cooked-batch", decision: "allocate", cookedAt: "2026-11-16T00:00:00Z",
    destinationSources: ["new-2", "new"], rationale: "Operator reviewed source plan date approximation; reused both cooked portions" }];
  manifest.snapshotFingerprint = repairFingerprint(snapshot);
  return { snapshot, manifest };
}

describe("reviewed cooked remainder allocation", () => {
  it("converts two legacy quantities without fresh destination units or available lots", () => {
    const { snapshot, manifest } = allocationFixture();
    const result = validateRollingMealsRepair(snapshot, manifest);
    expect(result.issues).toEqual([]);
    expect(result.projections).toEqual([{ identity: "recipe:r", count: 0, pending: 0 }]);
    expect(result.plannedChanges?.cookedLots).toBe(0);
    expect(result.manifest.leftovers[0]).toMatchObject({ destinationSources: ["new", "new-2"] });
    expect(snapshot.sources.filter((source) => source.planId === "latest").every((source) => !source.used && !source.alreadyCooked)).toBe(true);
  });

  it("allows independent ungrouped destinations and deterministic placement IDs for legacy null identities", () => {
    const { snapshot, manifest } = allocationFixture();
    for (const source of snapshot.sources.filter((row) => row.planId === "latest")) {
      source.batchId = null;
      source.placementId = repairId(snapshot.userId, "placement", source.slotId!);
    }
    for (const slot of snapshot.evidence.slots as { plan_id: string; batch_group_id: string | null; placement_id: string | null }[]) {
      if (slot.plan_id === "latest") { slot.batch_group_id = null; slot.placement_id = null; }
    }
    manifest.snapshotFingerprint = repairFingerprint(snapshot);
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toEqual([]);
  });

  it.each([
    ["quantity", ({ manifest }) => { if (manifest.leftovers[0].decision === "allocate") manifest.leftovers[0].destinationSources.pop(); }, "Allocation quantity mismatch"],
    ["duplicate", ({ manifest }) => { if (manifest.leftovers[0].decision === "allocate") manifest.leftovers[0].destinationSources = ["new", "new"]; }, "Duplicate allocation destination"],
    ["duplicate placement", ({ snapshot }) => { snapshot.sources[2].placementId = "p2"; }, "Duplicate allocation placement"],
    ["foreign source", ({ manifest }) => { if (manifest.leftovers[0].decision === "allocate") manifest.leftovers[0].destinationSources[0] = "foreign"; }, "Invalid allocation destination"],
    ["cooked destination", ({ snapshot }) => { snapshot.sources[1].alreadyCooked = true; }, "Invalid allocation destination"],
    ["completed destination", ({ snapshot }) => { snapshot.sources[1].used = true; }, "Invalid allocation destination"],
    ["foreign recipe", ({ snapshot }) => { snapshot.sources[1].identity = { kind: "recipe", recipeId: "foreign" }; }, "Invalid allocation destination"],
    ["same plan", ({ snapshot }) => { snapshot.plans[1].start_date = "2026-11-22"; }, "Invalid allocation destination"],
    ["incomplete source", ({ snapshot }) => { snapshot.sources[0].used = false; }, "Batch completion is not authoritative"],
    ["fresh unit", ({ manifest }) => { manifest.groups[0].units.push({ key: "fresh", current: "new", history: ["new"], state: "PENDING", eligible: false, rationale: "invalid" }); }, "cannot have an uncooked ledger unit"],
    ["excluded", ({ manifest }) => { manifest.excludedHistory.push({ source: "new", rationale: "invalid" }); }, "cannot be excluded"],
    ["partial batch", ({ snapshot }) => { snapshot.sources.push({ ...snapshot.sources[1], key: "unallocated", slotId: "s4", placementId: "p4" }); }, "must be fully covered"],
    ["batch remainder", ({ snapshot }) => { snapshot.evidence.storageRows = [{ plan_batch_id: "destination-batch", count: 1 }]; }, "must be fully covered"],
    ["prior transfer", ({ snapshot }) => { snapshot.evidence.events = [{ type: "TRANSFERRED", placement_id: "p2" }]; }, "already transferred"],
    ["invalid date", ({ snapshot }) => { (snapshot.evidence.slots as { date: string }[])[1].date = "invalid"; }, "Invalid allocation destination"],
    ["invalid occasion", ({ snapshot }) => { (snapshot.evidence.slots as { meal_type: string }[])[1].meal_type = "SNACK"; }, "Invalid allocation destination"],
    ["placement mismatch", ({ snapshot }) => { (snapshot.evidence.slots as { placement_id: string }[])[1].placement_id = "other"; }, "Invalid allocation destination"],
    ["missing evidence", ({ snapshot }) => { delete snapshot.evidence.events; }, "Invalid allocation evidence"],
    ["no legacy quantity", ({ manifest, snapshot }) => { manifest.legacyQueue[0].unitKeys = ["remainder-0"]; snapshot.entries[0].count = 1; }, "requires legacy queue evidence"],
  ] satisfies [string, (data: ReturnType<typeof allocationFixture>) => void, string][])("rejects %s", (_label, edit, issue) => {
    const data = allocationFixture();
    edit(data);
    data.manifest.snapshotFingerprint = repairFingerprint(data.snapshot);
    expect(validateRollingMealsRepair(data.snapshot, data.manifest).issues.join()).toContain(issue);
  });

  it("rejects duplicate destinations across allocation decisions and strict union metadata", () => {
    const { snapshot, manifest } = allocationFixture();
    manifest.leftovers.push({ ...manifest.leftovers[0], batchId: "another-batch" });
    expect(validateRollingMealsRepair(snapshot, manifest).issues.join()).toContain("Duplicate allocation destination");
    const decision = manifest.leftovers[0];
    expect(() => parseRepairManifest({ ...manifest, leftovers: [{ ...decision, cookedAt: null }] })).toThrow();
    expect(() => parseRepairManifest({ ...manifest, leftovers: [{ ...decision, date: "2026-11-23" }] })).toThrow();
    expect(() => parseRepairManifest({ ...manifest, leftovers: [{ ...decision, decision: "import" }] })).toThrow();
  });
});

describe("reviewed rolling meal repair", () => {
  it("links rollover copies without adding obligations and does not mutate inputs", () => {
    const { snapshot, manifest } = fixture();
    const before = JSON.stringify({ snapshot, manifest });
    const result = validateRollingMealsRepair(snapshot, manifest);
    expect(result.issues).toEqual([]);
    expect(result.projections).toEqual([{ identity: "recipe:r", count: 1, pending: 1 }]);
    expect(JSON.stringify({ snapshot, manifest })).toBe(before);
  });

  it("dry-run contains full evidence, preconditions and no automatic lineage", () => {
    const { snapshot } = fixture();
    const report = rollingMealsRepairReport(snapshot);
    expect(report.proposedWrites).toBe(0);
    expect(report.validation).toBeNull();
    expect(report.snapshot.plans[1].version).toBe(3);
    expect(report.snapshotFingerprint).toBe(repairFingerprint(snapshot));
    expect(report.issues.join(" ")).toContain("No lineage inferred");
  });

  it.each(["plans", "entries", "evidence"] as const)("rejects changed %s preconditions", (field) => {
    const { snapshot, manifest } = fixture();
    if (field === "plans") snapshot.plans[0].version++;
    if (field === "entries") snapshot.entries[0].version++;
    if (field === "evidence") snapshot.evidence.events = [{ id: "new-event" }];
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toContain("Stale snapshot fingerprint");
  });

  it("rejects scope, owner, partial bootstrap and unsupported lifecycle", () => {
    expect(check(({ manifest }) => { manifest.userId = "other"; }).issues).toContain("Manifest user does not match scope");
    expect(check(({ snapshot }) => { snapshot.recipes[0].user_id = "other"; }).issues.join()).toContain("Invalid recipe ownership");
    expect(check(({ snapshot }) => { snapshot.existingUnits = 1; }).issues.join()).toContain("Partial lifecycle");
    expect(check(({ snapshot }) => { snapshot.lifecycleVersion = 2; }).issues).toContain("Unsupported lifecycle version");
  });

  it("requires complete queue quantities including terminal stale quantities", () => {
    expect(check(({ manifest }) => { manifest.legacyQueue = []; }).issues.join()).toContain("Unreviewed queue entry");
    expect(check(({ manifest }) => { manifest.legacyQueue[0].unitKeys = []; }).issues.join()).toContain("Incomplete/stale");
    expect(check(({ manifest }) => { manifest.legacyQueue[0].unitKeys = ["absent"]; }).issues.join()).toContain("Invalid legacy unit");
  });

  it("preserves fourteen backlog units plus an explicitly independent fresh meal", () => {
    const { snapshot, manifest } = fixture();
    snapshot.entries[0].count = 14;
    manifest.groups[0].units = Array.from({ length: 14 }, (_, index) => ({
      key: `backlog-${index}`, state: "PENDING", eligible: true,
      current: index === 0 ? "old" : null, history: index === 0 ? ["old"] : [], rationale: "Preserved reviewed backlog",
    }));
    manifest.legacyQueue[0].unitKeys = manifest.groups[0].units.map((unit) => unit.key);
    manifest.groups[0].units.push({ key: "fresh", state: "PENDING", eligible: false,
      current: "new", history: ["new"], rationale: "Reviewer confirmed independent fresh meal" });
    manifest.groups[0].expectedEligibleCount = 14;
    manifest.snapshotFingerprint = repairFingerprint(snapshot);
    const result = validateRollingMealsRepair(snapshot, manifest);
    expect(result.issues).toEqual([]);
    expect(result.projections).toEqual([{ identity: "recipe:r", count: 14, pending: 15 }]);
  });

  it("requires every source, unique lineage, current history and correct counts", () => {
    expect(check(({ manifest }) => { manifest.groups[0].units[0].history = ["new"]; }).issues.join()).toContain("Unmapped source: old");
    expect(check(({ manifest }) => { manifest.groups[0].units[0].history.push("old"); }).issues.join()).toContain("mapped more than once");
    expect(check(({ manifest }) => { manifest.groups[0].units[0].history = ["old"]; }).issues.join()).toContain("Current source missing");
    expect(check(({ manifest }) => { manifest.groups[0].expectedEligibleCount = 14; }).issues.join()).toContain("Count projection mismatch");
  });

  it("cannot silently drop the fresh November 23 placement", () => {
    expect(check(({ manifest }) => { manifest.groups[0].units[0].current = null; }).issues.join()).toContain("Fresh placement must remain current");
    expect(check(({ manifest }) => {
      manifest.groups[0].units[0].history = ["old"];
      manifest.groups[0].units[0].current = "old";
      manifest.excludedHistory = [{ source: "new", rationale: "not allowed" }];
    }).issues.join()).toContain("Only explicit legacy scheduled history");
  });

  it("permits a reviewed historical exclusion but never a current exclusion", () => {
    expect(check(({ manifest }) => {
      manifest.groups[0].units[0].history = ["new"];
      manifest.excludedHistory = [{ source: "old", rationale: "Independent obsolete history, terminal barrier required" }];
    }).issues).toEqual([]);
  });

  it("retains terminal stale queue records without changing any historical done flag", () => {
    const { snapshot, manifest } = fixture();
    snapshot.sources[1].used = true;
    manifest.snapshotFingerprint = repairFingerprint(snapshot);
    manifest.groups[0].units[0].state = "COMPLETED";
    manifest.groups[0].units[0].eligible = false;
    manifest.groups[0].expectedEligibleCount = 0;
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toEqual([]);
    expect(snapshot.sources[0].used).toBe(false);
  });

  it("does not substitute already cooked slots or accept unsupported units", () => {
    expect(check(({ snapshot }) => { snapshot.sources[0].alreadyCooked = true; }).issues.join()).toContain("Invalid source identity");
    expect(check(({ manifest }) => {
      manifest.groups[0].units.push({ key: "invented", state: "DISCARDED", eligible: false, history: [], current: null, rationale: "none" });
    }).issues.join()).toContain("Unit has no evidence");
  });

  it("validates custom content, occasion and ingredient ownership rather than names", () => {
    const { snapshot, manifest } = fixture();
    const identity = { kind: "custom" as const, mealType: "DINNER" as const,
      customMeal: { name: "Toast", ingredients: [{ ingredientId: "i", unitId: null, amount: 1 }] } };
    manifest.groups[0].identity = identity;
    snapshot.sources.forEach((source) => { source.identity = identity; });
    snapshot.entries = [];
    manifest.legacyQueue = [];
    snapshot.ingredients = [{ id: "i", user_id: null }];
    manifest.snapshotFingerprint = repairFingerprint(snapshot);
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toEqual([]);
    snapshot.sources[0].identity = { ...identity, mealType: "LUNCH" };
    expect(validateRollingMealsRepair(snapshot, manifest).issues.join()).toContain("Invalid source identity");
    snapshot.ingredients[0].user_id = "other";
    expect(validateRollingMealsRepair(snapshot, manifest).issues.join()).toContain("Invalid ingredient");
  });

  it("requires explicit leftover decisions and authoritative completed membership", () => {
    const { snapshot, manifest } = fixture();
    snapshot.sources.forEach((source) => { source.used = true; });
    snapshot.sources[1].batchId = "batch";
    snapshot.evidence.batches = [{ id: "batch", plan_id: "latest", recipe_id: "r" }];
    snapshot.sources.push({ ...snapshot.sources[1], key: "remainder", slotId: null,
      placementId: "rolling-remainder:batch:0", used: false });
    manifest.groups[0].units[0] = { ...manifest.groups[0].units[0], current: "old", history: ["old"], state: "COMPLETED", eligible: false };
    manifest.groups[0].units.push({ key: "second", state: "COMPLETED", eligible: false, current: "new", history: ["new"], rationale: "Independent scheduled meal" },
      { key: "leftover", state: "CONVERTED", eligible: false, current: "remainder", history: ["remainder"], rationale: "Reviewed food still exists" });
    manifest.groups[0].expectedEligibleCount = 0;
    manifest.snapshotFingerprint = repairFingerprint(snapshot);
    expect(validateRollingMealsRepair(snapshot, manifest).issues.join()).toContain("Explicit leftover decision required");
    manifest.leftovers = [{ batchId: "batch", decision: "import", cookedAt: "2026-11-21T12:00:00Z", rationale: "Explicit approval" }];
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toEqual([]);
    manifest.leftovers[0].decision = "unavailable";
    expect(validateRollingMealsRepair(snapshot, manifest).issues.join()).toContain("Leftover terminal mapping required");
    manifest.groups[0].units[2].state = "DISCARDED";
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toEqual([]);
    snapshot.evidence.resolutions = [{ plan_id: "latest", batch_id: "batch" }];
    expect(validateRollingMealsRepair(snapshot, manifest).issues.join()).toContain("Batch already resolved");
  });

  it("reports a migrated account as zero writes even after normal application edits", () => {
    const { snapshot, manifest } = fixture();
    snapshot.lifecycleVersion = 1;
    snapshot.plans[0].version++;
    snapshot.existingUnits = 1;
    snapshot.evidence.units = [{ id: repairId(snapshot.userId, repairFingerprint(manifest), "unit:pancake"), entry_id: "queue" }];
    const result = validateRollingMealsRepair(snapshot, manifest);
    expect(result.alreadyMigrated).toBe(true);
    expect(result.writes).toBe(0);
    expect(result.manifestMatch).toBe(true);
    expect(result.issues).toEqual([]);
    expect(rollingMealsRepairReport(snapshot).issues).toEqual([]);
  });

  it.each(["remainder", "scheduled"])("rejects collapsing simultaneous %s portions into one unit", (kind) => {
    const { snapshot, manifest } = fixture();
    snapshot.sources[0].batchId = "batch";
    const source = { ...snapshot.sources[0], key: "portion-a", slotId: kind === "remainder" ? null : "portion-slot",
      batchId: "batch", placementId: "portion-a" };
    const other = { ...source, key: "portion-b", slotId: null, placementId: "portion-b" };
    snapshot.sources.push(source, other);
    snapshot.evidence.batches = [{ id: "batch", plan_id: "old", recipe_id: "r" }];
    manifest.groups[0].units.push({ key: "collapsed", state: "PENDING", eligible: true,
      current: "portion-a", history: ["portion-a", "portion-b"], rationale: "Previously accepted collapse" });
    manifest.groups[0].expectedEligibleCount = 2;
    manifest.snapshotFingerprint = repairFingerprint(snapshot);
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toContain("Independent same-plan portions cannot share a unit: collapsed");
    manifest.groups[0].units[1].history = ["portion-a"];
    manifest.groups[0].units.push({ key: "independent", state: "PENDING", eligible: true,
      current: "portion-b", history: ["portion-b"], rationale: "Independent simultaneous portion" });
    manifest.groups[0].expectedEligibleCount = 3;
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toEqual([]);
  });

  it("rejects even non-batch same-plan historical collapse, but allows per-portion cross-plan moves", () => {
    const { snapshot, manifest } = fixture();
    snapshot.sources.push({ ...snapshot.sources[0], key: "another-old", slotId: "s3", placementId: "p3" });
    manifest.groups[0].units[0].history.push("another-old");
    manifest.snapshotFingerprint = repairFingerprint(snapshot);
    expect(validateRollingMealsRepair(snapshot, manifest).issues.join()).toContain("Independent same-plan portions");
  });

  it("does not let ready state certify an unrelated manifest or hide foreign ownership", () => {
    const { snapshot, manifest } = fixture();
    snapshot.lifecycleVersion = 1;
    snapshot.existingUnits = 1;
    snapshot.evidence.units = [{ id: repairId(snapshot.userId, repairFingerprint(manifest), "unit:pancake"), entry_id: "queue" }];
    const changed = { ...manifest, rationale: "Different approval" };
    expect(validateRollingMealsRepair(snapshot, changed).issues.join()).toContain("manifest fingerprint");
    snapshot.entries[0].user_id = "foreign";
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toContain("Snapshot ownership mismatch");
  });

  it("reports no fingerprint proof for a ready empty manifest instead of certifying it", () => {
    const { snapshot, manifest } = fixture();
    snapshot.lifecycleVersion = 1;
    manifest.groups = [];
    expect(validateRollingMealsRepair(snapshot, manifest).manifestMatch).toBeNull();
  });

  it("runtime-validates snapshot types, counters, dates, duplicate IDs and scoped references", () => {
    const { snapshot, manifest } = fixture();
    expect(() => parseRepairSnapshot({ ...snapshot, lifecycleVersion: "1" })).toThrow();
    expect(() => parseRepairSnapshot({ ...snapshot, existingUnits: -1 })).toThrow();
    expect(() => parseRepairSnapshot({ ...snapshot, sources: [{ ...snapshot.sources[0], used: "false" }] })).toThrow();
    expect(() => parseRepairSnapshot({ ...snapshot, plans: [{ ...snapshot.plans[0], start_date: "not-date" }] })).toThrow();
    snapshot.sources.push({ ...snapshot.sources[0] });
    expect(validateRollingMealsRepair(snapshot, manifest).issues).toContain("Duplicate snapshot source");
    snapshot.sources[0].planId = "foreign";
    expect(validateRollingMealsRepair(snapshot, manifest).issues.join()).toContain("Source plan outside scope");
  });

  it("never trims opaque IDs and safely preserves punctuation", () => {
    const { manifest } = fixture();
    expect(() => parseRepairManifest({ ...manifest, userId: " owner " })).toThrow();
    expect(() => parseRepairManifest({ ...manifest, userId: "owner\n" })).toThrow();
    expect(parseRepairManifest({ ...manifest, userId: "opaque'\";--id" }).userId).toBe("opaque'\";--id");
  });

  it("strictly parses, trims and fingerprints manifests deterministically", () => {
    const { manifest, snapshot } = fixture();
    expect(() => parseRepairManifest({ ...manifest, approved: true })).toThrow();
    expect(() => parseRepairManifest({ ...manifest, reviewedBy: " " })).toThrow();
    expect(parseRepairManifest({ ...manifest, reviewedBy: " operator " }).reviewedBy).toBe("operator");
    const fingerprint = repairFingerprint(manifest);
    expect(repairFingerprint({ ...manifest, groups: [...manifest.groups].reverse() })).toBe(fingerprint);
    expect(repairId(snapshot.userId, fingerprint, "unit:a")).toBe(repairId(snapshot.userId, fingerprint, "unit:a"));
    expect(repairId(snapshot.userId, fingerprint, "unit:a")).not.toBe(repairId(snapshot.userId, fingerprint, "unit:b"));
    expect(canonicalRepairJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("rejects corrupt stored identities, foreign audiences and unknown custom units", () => {
    expect(check(({ snapshot }) => { snapshot.entries[0].recipe_id = "different"; }).issues.join()).toContain("Invalid stored queue identity");
    expect(check(({ snapshot }) => { snapshot.sources[0].audience = ["other"]; }).issues.join()).toContain("Invalid audience");
    expect(check(({ snapshot, manifest }) => {
      snapshot.ingredients = [{ id: "i", user_id: null }];
      manifest.groups[0].identity = { kind: "custom", mealType: "DINNER",
        customMeal: { name: "Toast", ingredients: [{ ingredientId: "i", unitId: "missing", amount: 1 }] } };
    }).issues.join()).toContain("Invalid measurement unit");
  });
});

describe("repair CLI offline safety", () => {
  const cli = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
  const script = fileURLToPath(new URL("../../prisma/repair-rolling-meals.ts", import.meta.url));
  it.each([
    ["--help"], [], ["--apply", "--user-id", "owner"], ["--user-id", "owner"],
    ["--user-id", "owner", "--user-id", "other"],
  ])("does not connect or expose normal DATABASE_URL with flags %j", (...args) => {
    const result = spawnSync(process.execPath, [cli, script, ...args], {
      env: { ...process.env, REPAIR_DATABASE_URL: "", DATABASE_URL: "postgresql://NEVER_PRINT_THIS@127.0.0.1:1/unused" },
      encoding: "utf8", timeout: 10000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(args[0] === "--help" ? 0 : 1);
    expect(result.stdout + result.stderr).toContain("Usage:");
    expect(result.stdout + result.stderr).not.toContain("NEVER_PRINT_THIS");
  });
});
