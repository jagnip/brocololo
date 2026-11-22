import { createHash } from "node:crypto";
import { z } from "zod";
import { getRollingCustomMealKey } from "../planner/custom-meal-identity";

const text = z.string().trim().min(1);
// IDs are opaque database values, not human prose to normalize.
const opaqueId = z.string().min(1).refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value), "Invalid opaque ID");
const mealType = z.enum(["BREAKFAST", "LUNCH", "DINNER"]);
const customMeal = z.strictObject({
  name: text,
  ingredients: z.array(z.strictObject({
    ingredientId: opaqueId, unitId: opaqueId.nullable(), amount: z.number().finite().nonnegative().nullable(),
  })),
});
const identitySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("recipe"), recipeId: opaqueId }),
  z.strictObject({ kind: z.literal("custom"), mealType, customMeal }),
]);
export type RepairIdentity = z.infer<typeof identitySchema>;

export const repairManifestSchema = z.strictObject({
  formatVersion: z.literal(1), userId: opaqueId, snapshotFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedBy: text, rationale: text,
  groups: z.array(z.strictObject({
    identity: identitySchema,
    expectedEligibleCount: z.number().int().nonnegative(),
    units: z.array(z.strictObject({
      key: opaqueId, state: z.enum(["PENDING", "COMPLETED", "CONVERTED", "DISCARDED"]),
      eligible: z.boolean(), history: z.array(opaqueId), current: opaqueId.nullable(), rationale: text,
    })),
  })),
  legacyQueue: z.array(z.strictObject({ entryId: opaqueId, version: z.number().int().nonnegative(), unitKeys: z.array(opaqueId) })),
  excludedHistory: z.array(z.strictObject({ source: opaqueId, rationale: text })),
  leftovers: z.array(z.discriminatedUnion("decision", [
    z.strictObject({ batchId: opaqueId, decision: z.literal("import"), rationale: text, cookedAt: z.iso.datetime().nullable() }),
    z.strictObject({ batchId: opaqueId, decision: z.literal("unavailable"), rationale: text, cookedAt: z.iso.datetime().nullable() }),
    z.strictObject({ batchId: opaqueId, decision: z.literal("allocate"), rationale: text,
      cookedAt: z.iso.datetime(), destinationSources: z.array(opaqueId).min(1) }),
  ])),
});
export type RepairManifest = z.infer<typeof repairManifestSchema>;

const sourceSchema = z.strictObject({
  key: opaqueId, planId: opaqueId, placementId: opaqueId, slotId: opaqueId.nullable(), batchId: opaqueId.nullable(),
  identity: identitySchema, used: z.boolean(), alreadyCooked: z.boolean(), audience: z.array(opaqueId),
});
const integer = z.number().int().nonnegative();
const date = z.union([z.iso.datetime(), z.iso.date()]);
// Preserve full SQL evidence for fingerprinting, but runtime-check every field used by validation/apply.
export const repairSnapshotSchema = z.strictObject({
  userId: opaqueId, lifecycleVersion: integer, existingUnits: integer, existingMappings: integer,
  plans: z.array(z.object({ id: opaqueId, user_id: opaqueId, version: integer, start_date: date, end_date: date }).passthrough()),
  entries: z.array(z.object({ id: opaqueId, user_id: opaqueId, identity: opaqueId, version: integer, count: integer,
    recipe_id: opaqueId.nullable(), meal_type: mealType.nullable(), custom_meal: customMeal.nullable() }).passthrough()),
  sources: z.array(sourceSchema),
  recipes: z.array(z.strictObject({ id: opaqueId, user_id: opaqueId, name: z.string() })),
  ingredients: z.array(z.strictObject({ id: opaqueId, user_id: opaqueId.nullable() })), familyMemberIds: z.array(opaqueId),
  evidence: z.object({
    resolutions: z.array(z.object({ plan_id: opaqueId, batch_id: opaqueId }).passthrough()),
    lots: z.array(z.object({ id: opaqueId, user_id: opaqueId, source_plan_batch_id: opaqueId.nullable() }).passthrough()),
    units: z.array(z.object({ id: opaqueId, entry_id: opaqueId }).passthrough()),
    mappings: z.array(z.object({ plan_id: opaqueId, placement_id: opaqueId, unit_id: opaqueId }).passthrough()),
    batches: z.array(z.object({ id: opaqueId, plan_id: opaqueId, recipe_id: opaqueId }).passthrough()),
    measurementUnits: z.array(z.strictObject({ id: opaqueId })),
  }).passthrough(),
});
export type RepairSource = z.infer<typeof sourceSchema>;
export type RepairSnapshot = z.infer<typeof repairSnapshotSchema>;
export function parseRepairSnapshot(input: unknown): RepairSnapshot {
  return repairSnapshotSchema.parse(input);
}

/** Object keys and unordered collections have stable ordering, independent of SQL row order. */
export function canonicalRepairJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalRepairJson).sort().join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalRepairJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
export function repairFingerprint(value: unknown): string {
  return createHash("sha256").update(canonicalRepairJson(value)).digest("hex");
}
export function repairId(userId: string, fingerprint: string, key: string): string {
  return `repair_${repairFingerprint({ userId, fingerprint, key })}`;
}
export function repairIdentity(identity: RepairIdentity): string {
  return identity.kind === "recipe" ? `recipe:${identity.recipeId}` :
    `custom:${getRollingCustomMealKey(identity.mealType, identity.customMeal)}`;
}

export function parseRepairManifest(value: unknown): RepairManifest {
  return JSON.parse(canonicalRepairJson(repairManifestSchema.parse(value))) as RepairManifest;
}

// Allocation dates and occasions come only from SQL evidence, never manifest metadata.
export const repairAllocationSlotSchema = z.object({
  id: opaqueId, plan_id: opaqueId, placement_id: opaqueId.nullable(), recipe_id: opaqueId,
  date: z.union([z.iso.datetime(), z.iso.date()]), meal_type: mealType,
  used: z.literal(false), already_cooked: z.literal(false), batch_group_id: opaqueId.nullable(),
}).passthrough();

/** Pure, fail-closed bootstrap validation. Never guesses lineage from matching recipes. */
export function validateRollingMealsRepair(snapshotInput: unknown, input: unknown) {
  const snapshot = parseRepairSnapshot(snapshotInput);
  const manifest = parseRepairManifest(input);
  const issues: string[] = [];
  const fingerprint = repairFingerprint(manifest);
  if (manifest.userId !== snapshot.userId) issues.push("Manifest user does not match scope");
  for (const [label, values] of [
    ["plan", snapshot.plans.map((row) => row.id)], ["entry", snapshot.entries.map((row) => row.id)],
    ["source", snapshot.sources.map((row) => row.key)],
    ["placement", snapshot.sources.map((row) => JSON.stringify([row.planId, row.placementId]))],
    ["unit", snapshot.evidence.units.map((row) => row.id)],
  ] as const) if (new Set(values).size !== values.length) issues.push(`Duplicate snapshot ${label}`);
  if (snapshot.plans.some((row) => row.user_id !== snapshot.userId) || snapshot.entries.some((row) => row.user_id !== snapshot.userId) ||
    snapshot.evidence.lots.some((row) => row.user_id !== snapshot.userId)) issues.push("Snapshot ownership mismatch");
  if (snapshot.existingUnits !== snapshot.evidence.units.length || snapshot.existingMappings !== snapshot.evidence.mappings.length ||
    snapshot.evidence.units.some((row) => !snapshot.entries.some((entry) => entry.id === row.entry_id)) ||
    snapshot.evidence.mappings.some((row) => !snapshot.evidence.units.some((unit) => unit.id === row.unit_id))) {
    issues.push("Inconsistent snapshot lineage evidence");
  }
  for (const source of snapshot.sources) {
    if (!snapshot.plans.some((plan) => plan.id === source.planId)) issues.push(`Source plan outside scope: ${source.key}`);
    if (source.identity.kind === "recipe") {
      const recipeId = source.identity.recipeId;
      if (!snapshot.recipes.some((recipe) => recipe.id === recipeId && recipe.user_id === snapshot.userId)) {
        issues.push(`Source recipe outside scope: ${source.key}`);
      }
    }
    if (!source.slotId && (!source.batchId || !snapshot.evidence.batches.some((batch) => batch.id === source.batchId &&
      batch.plan_id === source.planId && source.identity.kind === "recipe" && batch.recipe_id === source.identity.recipeId))) {
      issues.push(`Remainder batch outside scope: ${source.key}`);
    }
  }
  if (snapshot.lifecycleVersion === 1) {
    const expectedIds = [
      ...manifest.groups.flatMap((group) => group.units.map((unit) => repairId(snapshot.userId, fingerprint, `unit:${unit.key}`))),
      ...manifest.excludedHistory.map((exclusion) => repairId(snapshot.userId, fingerprint, `excluded:${exclusion.source}`)),
    ];
    const manifestMatch = expectedIds.length ? expectedIds.every((id) => snapshot.evidence.units.some((unit) => unit.id === id)) : null;
    if (manifestMatch === false) issues.push("Ready account does not match this repair manifest fingerprint");
    return { manifest, fingerprint, issues, alreadyMigrated: true, manifestMatch, projections: [], writes: 0 };
  }
  if (snapshot.lifecycleVersion !== 0) issues.push("Unsupported lifecycle version");
  if (manifest.snapshotFingerprint !== repairFingerprint(snapshot)) issues.push("Stale snapshot fingerprint");
  if (snapshot.existingUnits || snapshot.existingMappings) issues.push("Partial lifecycle data requires investigation");
  for (const entry of snapshot.entries) {
    const identity = identitySchema.safeParse(entry.recipe_id ? { kind: "recipe", recipeId: entry.recipe_id } :
      { kind: "custom", mealType: entry.meal_type, customMeal: entry.custom_meal });
    if (!identity.success || repairIdentity(identity.data) !== entry.identity ||
      (entry.recipe_id && (entry.meal_type !== null || entry.custom_meal !== null))) {
      issues.push(`Invalid stored queue identity: ${entry.id}`);
    }
  }
  const sources = new Map(snapshot.sources.map((source) => [source.key, source]));
  const units = new Map<string, { identity: string; unit: RepairManifest["groups"][number]["units"][number] }>();
  const mapped = new Set<string>();
  const allocated = new Set<string>();
  const allocatedPlacements = new Set<string>();
  for (const decision of manifest.leftovers) {
    if (decision.decision !== "allocate") continue;
    for (const key of decision.destinationSources) {
      if (allocated.has(key)) issues.push(`Duplicate allocation destination: ${key}`);
      allocated.add(key);
      const destination = sources.get(key);
      if (destination) {
        if (allocatedPlacements.has(destination.placementId)) issues.push(`Duplicate allocation placement: ${destination.placementId}`);
        allocatedPlacements.add(destination.placementId);
      }
    }
  }
  const identities = new Set<string>();
  const latestStart = snapshot.plans.map((plan) => plan.start_date).sort().at(-1);
  const projections = manifest.groups.map((group) => {
    const identity = repairIdentity(group.identity);
    if (identities.has(identity)) issues.push(`Duplicate identity: ${identity}`);
    identities.add(identity);
    if (group.identity.kind === "recipe") {
      const recipeId = group.identity.recipeId;
      if (!snapshot.recipes.some((recipe) => recipe.id === recipeId && recipe.user_id === snapshot.userId)) {
        issues.push(`Invalid recipe ownership: ${recipeId}`);
      }
    } else {
      for (const ingredient of group.identity.customMeal.ingredients) {
        if (!snapshot.ingredients.some((row) => row.id === ingredient.ingredientId &&
          (row.user_id === null || row.user_id === snapshot.userId))) issues.push(`Invalid ingredient: ${ingredient.ingredientId}`);
        const measurementUnits = snapshot.evidence.measurementUnits as { id: string }[] | undefined;
        if (ingredient.unitId && !measurementUnits?.some((row) => row.id === ingredient.unitId)) issues.push(`Invalid measurement unit: ${ingredient.unitId}`);
      }
    }
    let count = 0;
    for (const unit of group.units) {
      const representedPlans = new Set<string>();
      if (units.has(unit.key)) issues.push(`Duplicate unit key: ${unit.key}`);
      units.set(unit.key, { identity, unit });
      if (unit.state === "PENDING" && unit.eligible) count++;
      if (unit.state !== "PENDING" && unit.eligible) issues.push(`Terminal unit cannot be eligible: ${unit.key}`);
      if (unit.state === "PENDING" && !unit.current && !unit.eligible) issues.push(`Unassigned pending unit must be eligible: ${unit.key}`);
      if (unit.state === "CONVERTED" && (!unit.current || sources.get(unit.current)?.slotId !== null ||
        !manifest.leftovers.some((decision) => decision.batchId === sources.get(unit.current!)?.batchId && decision.decision !== "unavailable"))) {
        issues.push(`Converted unit requires an approved current remainder import or allocation: ${unit.key}`);
      }
      if (unit.current && !unit.history.includes(unit.current)) issues.push(`Current source missing from history: ${unit.key}`);
      for (const key of unit.history) {
        if (allocated.has(key)) issues.push(`Allocation destination cannot have an uncooked ledger unit: ${key}`);
        const source = sources.get(key);
        if (!source || source.alreadyCooked || repairIdentity(source.identity) !== identity) {
          issues.push(`Invalid source identity: ${key}`);
          continue;
        }
        if (mapped.has(key)) issues.push(`Source mapped more than once: ${key}`);
        mapped.add(key);
        if (representedPlans.has(source.planId)) issues.push(`Independent same-plan portions cannot share a unit: ${unit.key}`);
        representedPlans.add(source.planId);
        const sourcePlan = snapshot.plans.find((plan) => plan.id === source.planId);
        if (source.slotId && !source.used && sourcePlan && latestStart && sourcePlan.end_date >= latestStart &&
          (unit.current !== key || unit.state !== "PENDING")) issues.push(`Fresh placement must remain current and pending: ${key}`);
        if (unit.current === key && source.slotId &&
          ((unit.state === "PENDING" && source.used) || (unit.state === "COMPLETED" && !source.used) || unit.state === "CONVERTED")) {
          issues.push(`Current slot state mismatch: ${key}`);
        }
        if (unit.current === key && unit.state === "DISCARDED" && source.slotId) issues.push(`Cannot discard a live scheduled placement: ${key}`);
      }
    }
    if (count !== group.expectedEligibleCount) issues.push(`Count projection mismatch: ${identity}`);
    return { identity, count, pending: group.units.filter((unit) => unit.state === "PENDING").length };
  });
  const queued = new Set<string>();
  const entries = new Set<string>();
  for (const legacy of manifest.legacyQueue) {
    const entry = snapshot.entries.find((row) => row.id === legacy.entryId);
    if (!entry || entry.version !== legacy.version || entry.count !== legacy.unitKeys.length || entries.has(legacy.entryId)) {
      issues.push(`Incomplete/stale legacy queue mapping: ${legacy.entryId}`);
    }
    entries.add(legacy.entryId);
    for (const key of legacy.unitKeys) {
      if (queued.has(key) || !units.has(key) || units.get(key)?.identity !== entry?.identity) issues.push(`Invalid legacy unit: ${key}`);
      queued.add(key);
    }
  }
  for (const entry of snapshot.entries) if (!entries.has(entry.id)) issues.push(`Unreviewed queue entry: ${entry.id}`);
  for (const [key, { unit }] of units) {
    if (!unit.history.length && !queued.has(key)) issues.push(`Unit has no evidence: ${key}`);
  }
  for (const exclusion of manifest.excludedHistory) {
    if (allocated.has(exclusion.source)) issues.push(`Allocation destination cannot be excluded: ${exclusion.source}`);
    const source = sources.get(exclusion.source);
    const plan = snapshot.plans.find((row) => row.id === source?.planId);
    if (!source || source.alreadyCooked || mapped.has(exclusion.source) || !latestStart || !plan || plan.end_date >= latestStart || !source.slotId) {
      issues.push(`Only explicit legacy scheduled history may be excluded: ${exclusion.source}`);
    }
    if (source && !identities.has(repairIdentity(source.identity))) issues.push(`Excluded history needs an identity group for its terminal barrier: ${exclusion.source}`);
    mapped.add(exclusion.source);
  }
  for (const source of snapshot.sources) {
    if (!source.alreadyCooked && !mapped.has(source.key) && !allocated.has(source.key)) issues.push(`Unmapped source: ${source.key}`);
    if (source.audience.some((id) => !snapshot.familyMemberIds.includes(id))) issues.push(`Invalid audience: ${source.key}`);
  }
  const decisions = new Set<string>();
  for (const decision of manifest.leftovers) {
    const remainders = snapshot.sources.filter((source) => source.batchId === decision.batchId && !source.slotId);
    if (decisions.has(decision.batchId) || !remainders.length) issues.push(`Invalid leftover decision: ${decision.batchId}`);
    decisions.add(decision.batchId);
    if (decision.decision === "import" && !decision.cookedAt) issues.push(`Cooked date required: ${decision.batchId}`);
    for (const source of remainders) {
      const unit = [...units.values()].find((item) => item.unit.current === source.key)?.unit;
      if (!unit || unit.state !== (decision.decision === "unavailable" ? "DISCARDED" : "CONVERTED")) issues.push(`Leftover terminal mapping required: ${source.key}`);
      if (decision.decision === "allocate" && unit && !queued.has(unit.key)) issues.push(`Allocated remainder requires legacy queue evidence: ${source.key}`);
    }
    const slots = snapshot.sources.filter((source) => source.batchId === decision.batchId && source.slotId);
    if (!slots.length || slots.some((slot) => !slot.used || ![...units.values()].some(({ unit }) =>
      unit.current === slot.key && unit.state === "COMPLETED"))) issues.push(`Batch completion is not authoritative: ${decision.batchId}`);
    if (remainders.length && slots.some((slot) => repairIdentity(slot.identity) !== repairIdentity(remainders[0].identity))) {
      issues.push(`Batch member identity mismatch: ${decision.batchId}`);
    }
    const resolutions = snapshot.evidence.resolutions;
    if (resolutions.some((row) => row.batch_id === decision.batchId)) issues.push(`Batch already resolved: ${decision.batchId}`);
    const lots = snapshot.evidence.lots;
    if (lots.some((row) => row.source_plan_batch_id === decision.batchId)) issues.push(`Batch already has inventory: ${decision.batchId}`);
    if (decision.decision === "allocate") {
      if (decision.destinationSources.length !== remainders.length) issues.push(`Allocation quantity mismatch: ${decision.batchId}`);
      const events = z.array(z.object({ placement_id: opaqueId.nullable(), type: z.string() }).passthrough()).safeParse(snapshot.evidence.events);
      const evidenceSlots = z.array(z.unknown()).safeParse(snapshot.evidence.slots);
      if (!events.success || !evidenceSlots.success) issues.push(`Invalid allocation evidence: ${decision.batchId}`);
      for (const key of decision.destinationSources) {
        const destination = sources.get(key);
        const sourcePlan = snapshot.plans.find((plan) => plan.id === remainders[0]?.planId);
        const destinationPlan = snapshot.plans.find((plan) => plan.id === destination?.planId);
        const raw = evidenceSlots.success ? evidenceSlots.data.filter((row) =>
          typeof row === "object" && row !== null && "id" in row && row.id === destination?.slotId) : [];
        const slot = repairAllocationSlotSchema.safeParse(raw.length === 1 ? raw[0] : null);
        if (!destination || !destination.slotId || destination.used || destination.alreadyCooked ||
          destination.identity.kind !== "recipe" || !remainders.length ||
          repairIdentity(destination.identity) !== repairIdentity(remainders[0].identity) ||
          !sourcePlan || !destinationPlan || Date.parse(destinationPlan.start_date) <= Date.parse(sourcePlan.end_date) ||
          !slot.success || slot.data.plan_id !== destination.planId || slot.data.recipe_id !== destination.identity.recipeId ||
          slot.data.batch_group_id !== destination.batchId ||
          (slot.data.placement_id ?? repairId(snapshot.userId, "placement", destination.slotId)) !== destination.placementId ||
          Date.parse(slot.data.date) < Date.parse(destinationPlan.start_date) || Date.parse(slot.data.date) > Date.parse(destinationPlan.end_date)) {
          issues.push(`Invalid allocation destination: ${key}`);
        }
        if (destination && events.success && events.data.some((event) =>
          event.type === "TRANSFERRED" && event.placement_id === destination.placementId)) issues.push(`Allocation destination already transferred: ${key}`);
        if (destination?.batchId) {
          const batch = snapshot.evidence.batches.find((row) => row.id === destination.batchId);
          const members = snapshot.sources.filter((row) => row.batchId === destination.batchId);
          const rawMembers = evidenceSlots.success ? evidenceSlots.data.filter((row) =>
            typeof row === "object" && row !== null && "batch_group_id" in row && row.batch_group_id === destination.batchId) : [];
          const storage = z.array(z.object({ plan_batch_id: opaqueId, count: z.number().int().nonnegative() }).passthrough()).safeParse(snapshot.evidence.storageRows);
          if (!batch || batch.plan_id !== destination.planId || destination.identity.kind !== "recipe" || batch.recipe_id !== destination.identity.recipeId ||
            members.some((row) => !row.slotId || !allocated.has(row.key) || row.used || row.alreadyCooked ||
              repairIdentity(row.identity) !== repairIdentity(destination.identity)) || rawMembers.length !== members.length ||
            !storage.success || storage.data.some((row) => row.plan_batch_id === destination.batchId && row.count > 0) ||
            resolutions.some((row) => row.batch_id === destination.batchId) || lots.some((row) => row.source_plan_batch_id === destination.batchId)) {
            issues.push(`Allocation destination batch must be fully covered without remainder: ${destination.batchId}`);
          }
        }
      }
    }
  }
  for (const source of snapshot.sources.filter((row) => !row.slotId)) {
    const current = [...units.values()].find(({ unit }) => unit.history.includes(source.key))?.unit;
    const allDone = snapshot.sources.filter((row) => row.slotId && row.batchId === source.batchId).every((row) => row.used);
    if ((allDone || (current && current.state !== "PENDING")) && !decisions.has(source.batchId!)) {
      issues.push(`Explicit leftover decision required: ${source.batchId}`);
    }
  }
  return { manifest, fingerprint, issues, alreadyMigrated: false, projections,
    plannedChanges: {
      units: units.size, placementLinks: mapped.size, excludedTerminalUnits: manifest.excludedHistory.length,
      cookedLots: snapshot.sources.filter((source) => !source.slotId && manifest.leftovers.some((decision) =>
        decision.batchId === source.batchId && decision.decision === "import")).length,
      eligibleCount: projections.reduce((sum, projection) => sum + projection.count, 0), lifecycleVersion: 1,
    } };
}

export function rollingMealsRepairReport(snapshotInput: unknown, manifest?: unknown) {
  const snapshot = parseRepairSnapshot(snapshotInput);
  return {
    mode: "read-only", userId: snapshot.userId, lifecycleVersion: snapshot.lifecycleVersion,
    snapshotFingerprint: repairFingerprint(snapshot),
    status: snapshot.lifecycleVersion === 1 ? "already-migrated" : "review-required",
    proposedWrites: 0,
    before: snapshot.entries.reduce((sum, entry) => sum + entry.count, 0),
    candidates: [...new Set(snapshot.sources.map((source) => repairIdentity(source.identity)))].map((identity) => ({
      identity, legacyEntries: snapshot.entries.filter((entry) => entry.identity === identity),
      sources: snapshot.sources.filter((source) => repairIdentity(source.identity) === identity).map((source) => source.key),
      lineage: snapshot.lifecycleVersion === 1 ? "already-migrated" : "manual-review-required",
    })),
    issues: snapshot.lifecycleVersion === 1 ? [] : [
      "No lineage inferred. Every queue quantity, scheduled source and remainder needs explicit review.",
      "Preserve supported backlog (including the investigated 14); review November 23 overlaps manually.",
      ...snapshot.sources.filter((source) => source.used).map((source) => `Completed candidate (not an automatic queue decrement): ${source.key}`),
    ],
    snapshot,
    validation: manifest === undefined ? null : validateRollingMealsRepair(snapshot, manifest),
  };
}
