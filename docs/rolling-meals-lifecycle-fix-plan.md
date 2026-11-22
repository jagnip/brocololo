# Rolling meals lifecycle fix

Status: implemented and verified locally. Production schema deployment, account bootstrap, and data repair have not been applied. The delivery specification and operator runbook below remain the rollout contract.

## Implementation verification

1. All 67 migrations, including the new lifecycle migration, applied successfully to an isolated local PostgreSQL instance on port 55439. No production connection was used for implementation or tests.
2. `RUN_POSTGRES_INTEGRATION=0 POSTGRES_INTEGRATION_DISPOSABLE=0 npm test -- --run --silent --maxWorkers=2` passed: 1,254 tests, 31 skipped. Of the skipped tests, 29 are the separately executed PostgreSQL cases; two were already skipped by their suites.
3. `DATABASE_URL=postgresql://jagoda@127.0.0.1:55439/postgres RUN_POSTGRES_INTEGRATION=1 POSTGRES_INTEGRATION_DISPOSABLE=1 npx vitest run --project unit lib/db/planner.postgres.test.ts lib/db/rolling-meals.postgres.test.ts lib/db/rolling-meals-repair.postgres.test.ts --silent --reporter=dot` passed: 29 tests. This URL identifies only the disposable local test instance, not a production target.
4. `npm run lint-dev && npm run typecheck` passed with both commands exiting 0.
5. Final regressions include partial remainder moves followed by source autosave/completion, explicit quantity deltas at completion, date-bound claims on existing-plan updates, and reversible draft Already cooked toggles with exact source restoration.
6. A full-suite run concurrent with PostgreSQL tests and static checks timed out in two unchanged UI tests. The bounded-worker full-suite run above passed without increasing timeouts or changing those tests.
7. No authenticated full-app browser session or production cutover was performed. Existing accounts remain deliberately blocked from the new uncooked lifecycle until their reviewed manifest is applied. Do not deploy the application change alone without the coordinated migration/repair window.

## Goal

Preserve one outstanding uncooked meal as it moves between plans, clear it when its current placement is marked done, and keep cooked batch leftovers in separate physical inventory. Food logging must not affect either lifecycle.

Implement and verify the lifecycle before repairing production. Do not solve this by clearing the queue, completing historical plans, or deleting every entry matching a cooked recipe.

## Confirmed behavior

| Action | Outstanding uncooked quantity |
| --- | ---: |
| Leave one planned pancake unfinished in week 1 | 1 |
| Carry that pancake into week 2 without cooking | 1 |
| Carry it into week 3 without cooking | 1 |
| Mark its week 3 placement done | 0 |
| Start with three outstanding meals; carry and complete one | 2 |

1. Replanning moves an existing obligation; it does not create another meal.
2. Historical copies are not additional obligations and need no separate completion.
3. A genuinely new meal of the same recipe is independent; completing one must not clear all matching recipe quantities.
4. Cooked batch leftovers are suggested as already cooked and never enter uncooked rolling quantities.
5. Available cooked lots continue transferring on plan save for placements allocated cooked inventory. An explicit uncooked-unit claim must not be silently replaced by automatic cooked-lot allocation. This fix does not redefine transfer as food consumption or change the documented irreversible transfer behavior.
6. Nutrition logs are neither an eligibility input nor a completion signal.
7. Preserve current page layout, component primitives, labels, recipe/custom identity rules, audiences, and extra-portion exclusions.

## Production evidence

Read-only investigation on November 21, 2026 found one account with 25 uncooked rolling meals across 19 entries, 28 plans, and no cooked lots or storage events.

| Classification | Quantity | Evidence |
| --- | ---: | --- |
| Stale after completion | 8 | Arroz do mar 1; Cottage cheese & radish sandwich 1; Dorito cheakpeas 1; Honey mustard wrap 2; Kotlets 1; Massada de salmao 1; Pancake mix 1. Matching November 16-22 placements are done. |
| Misclassified legacy batch remainder | 3 | Chili con carne 2 from November 9-15; Chicken kebab 1 from November 2-8. All linked scheduled batch slots are done, but remainder resolutions and cooked lots are absent. |
| Supported by unfinished historical records | 14 | Matching unfinished quantities exist. This is not proof that every quantity is still wanted or that newer placements are linked correctly. Preserve unless reviewed evidence supports a change. |

The current entry identifiers encode creation around November 15, 2026 at 17:38:40 UTC; all have version 1. This supports a single initialization snapshot, not repeated weekly addition. The timestamp is inferred from CUIDs, not a persisted capture timestamp.

Re-query before repair. These are investigation findings, not permanent mutation predicates. Do not put database credentials, connection strings, emails, or production exports in this document or source control.

### Reviewed household repair decisions

The user supplied these decisions after implementation verification:

1. A backup is explicitly waived for this household's rolling-meal repair. This overrides the backup prerequisite below for this scoped operation only; it does not waive transaction rollback, ownership/version checks, dry-run review, or coordinated application/schema cutover. Do not create a database backup or copy production records into the repository.
2. The two Chili con carne leftovers were reused in the latest plan. Account for them as already-cooked allocations to that plan, not two new uncooked obligations and not two available cooked leftovers in addition to the planned meals. Preserve existing completion flags: allocation is not evidence that a meal was eaten.
3. The one Chicken kebab leftover is to be discarded, not imported as available cooked inventory.

A subsequent read-only production check confirmed that the latest plan is still November 23-29 and contains two Chili con carne placements, on November 25 and November 27. Both are currently unfinished with `alreadyCooked = false`. The old Chili remainder still has quantity two; the Chicken kebab remainder still has quantity one; neither source remainder is resolved. The durable lifecycle schema is not yet present in production. No production mutations were made by this check.

Expected targeted repair outcome:

| Item | Required outcome |
| --- | --- |
| Chili con carne, two legacy leftovers | Resolve the old uncooked quantities and record their allocation to the two existing latest-plan placements |
| Latest-plan Chili placements | Set already cooked, preserve their existing done flags, and do not create additional meals or cooking remainder |
| Available Chili inventory after allocation | Zero from these two legacy leftovers |
| Chicken kebab, one legacy leftover | Resolve as discarded; zero uncooked or available cooked quantity from this leftover |
| Other backlog/current-plan meals | Continue the separately reviewed identity mapping; these decisions do not authorize recipe-wide clearing |

The bootstrap manifest now supports a validated `allocate` leftover decision for this case. Do not encode Chili as `unavailable` or import it as still available. Allocation atomically resolves the source, retains conversion/transfer evidence, updates the existing destination placements without marking them done, and leaves no extra available lot or uncooked destination units. Re-query all versions before preparing and applying the final manifest. The household-specific apply-ready manifest has not been generated or applied; the required lifecycle schema is still absent from production.

Allocation verification: 52 pure/offline repair tests and 15 real-CLI PostgreSQL tests passed against the disposable local database. Coverage includes two allocated portions, preserved destination done flags, zero available inventory, unchanged nutrition records, wrong/duplicate/foreign destinations, partial batches, existing transfers, rollback on a late-write failure, and zero-write repeat apply. No production repair or backup was performed.

## Faults to replace

| Current path | Failure | Relevant code |
| --- | --- | --- |
| Storage page initialization | Captures four newest plans, including active/future plans, as independent aggregate entries | `components/storage/storage-page-container.tsx`; `lib/db/rolling-meals.ts:initialize` |
| New-plan save | Consumes a queue claim before capturing older plans; an unlinked historical representation can recreate the quantity | `lib/db/planner.ts:consumeRollingMealsTx`; `createPlan` |
| Capture | Insert-only deduplication by recipe/custom identity leaves stale counts and can lose partial quantities | `lib/db/rolling-meals.ts:capturePlans` |
| Plan completion | Updates slots but does not reconcile outstanding rolling quantities | `lib/db/planner.ts:updatePlan` |
| Batch capture/conversion | Unresolved remainder can enter uncooked counts even when its scheduled group is done | `capturePlans`; batch conversion inside `updatePlan` |
| Persistence | Queue entries have no source-placement lineage; claims do not survive on saved slots | `prisma/schema.prisma`; planner save mappings |

Changing only the save order, skipping every `isRolledOver` slot, or recalculating from all historical slots is insufficient. Each loses quantities or revives historical copies in another scenario.

## Implementation approach

### Durable uncooked identity

Introduce durable meal-unit records, one per outstanding meal, with stable identity independent of recipe identity and replaceable plan-slot row IDs. One row per meal avoids partial-count splitting and makes the three-meals/complete-one rule explicit. Household counts are small; do not add a general-purpose inventory framework.

The schema phase must provide:

1. A stable unit ID, owner, recipe or existing custom-meal identity/payload, lifecycle state, optimistic version, and creation/completion timestamps.
2. Source-plan/placement provenance snapshots and one authoritative current assignment, either a scheduled placement or an uncooked batch-remainder placement. Assignment is nullable for an unplaced backlog unit.
3. Persisted links from historical and current scheduled placements to the same unit. Use existing stable `placementId`, not recreated `PlanSlot.id`, to match edits.
4. Stable remainder-placement identity, preserved through batch recreation and audience-row edits. A multi-meal remainder references distinct units; moving a unit from remainder to a scheduled slot does not create a new unit.
5. Terminal completed/discarded records retained as barriers. Deleting the last visible queue row must not erase the evidence that its units were resolved.
6. A durable cooking-conversion key linking a converted remainder to its resulting stored lot/event, surviving deletion or recreation of plan batches and source rows.
7. A per-account lifecycle migration marker. New authoritative reads/writes require a verified bootstrap; ambiguous or unmigrated accounts must be explicitly blocked from affected operations, not silently treated as empty/new accounts.

Keep `RollingMealEntry` only where useful as the existing identity-group/version boundary. Its displayed count must be derived from eligible pending units, or maintained transactionally as a tested projection; it must not remain a competing source of truth. Prefer deriving counts and removing the mutable aggregate counter after cutover.

Use additive migrations, indexed ownership/state and assignment lookup paths, foreign keys with explicit deletion behavior, and constraints preventing multiple authoritative assignments to one unit. Recipe identity groups display rows; it must not enforce a single unit per recipe. Plan deletion must not cascade-delete outstanding units or terminal evidence. Reuse existing ID conventions and stored-lot models.

### Quantity and placement rules

| Operation | Required transition |
| --- | --- |
| Save a fresh uncooked meal | Create one new unit and its current assignment exactly once |
| Preview/generate a rollover | Read eligible unit IDs and versions; perform no writes or reservations |
| Save a rollover | Move the claimed units to new assignments; preserve total pending quantity |
| Mark a current scheduled placement done | Complete only its linked pending unit |
| Mark an entire checklist group done | Complete exactly the units belonging to the checked current placements |
| Complete a batch with planned remainder | Complete scheduled units; convert remainder units to cooked lots once; resolve their uncooked state in the same transaction |
| Repeat an autosave or batch completion | No additional units, decrements, lots, or events |
| Discard an uncooked quantity | Resolve exactly that many units; historical copies cannot restore them |
| Increase an uncooked quantity through Adjust | Add explicit, unassigned units with adjustment provenance |
| Transfer a cooked lot | Keep the existing lot decrement/event; do not create or complete an unrelated uncooked unit |

Distinguish total outstanding rolling quantity from quantity eligible for a particular new plan. A carried meal can remain outstanding while assigned; a planner claim moves it rather than making a second assignment. Do not offer the same unit twice within one draft or allow two saves to claim the same version.

Fresh current/future meals must not become a separate backlog merely because Storage is opened. Track their units internally, and expose them for rollover when their plan is superseded. Preview must calculate candidates without writing; save must validate and commit the same supersession decision. Do not capture all plans after the form has already selected its sources.

### Transaction boundaries

Use the existing per-user lock consistently before changing plan/rolling/storage quantities. Validate expected plan, unit/group, and lot versions inside the transaction. Include all affected plans when checking a move; a stale edit of the superseded placement must not complete or reassign the current unit.

New-plan save must atomically validate source assignments, create destination placements, move claimed units, register genuinely fresh units, and supersede source assignments. Roll back the whole operation on stale claims, duplicate destinations, invalid ownership, or insufficient quantities. Existing-plan fill/extension must use the same lifecycle, not a separate weaker path.

Completion must read persisted lineage before destructive slot/batch replacement, reconcile current assignments, convert cooked remainder, and persist plan state in one transaction. A failed save must leave all quantities and conversion markers unchanged. Do not use a recipe-name or recipe-ID-wide delete.

Batch conversion eligibility and quantity must use authoritative current batch membership, not submitted historical slot checkboxes. A moved scheduled member must neither allow stale source-group completion to create cooked inventory nor require completion of its historical copy.

### Decisions to confirm before implementation

1. Recommended: removing a current uncooked placement releases its unit back to the unassigned backlog; explicit Discard is the operation that cancels it. Replacing a meal releases the old unit and creates/assigns the replacement. This is not a change to irreversible cooked-lot transfers.
2. Recommended: unchecking a completed, authoritative non-batch placement reopens that same unit once. Unchecking historical superseded copies has no effect on the current unit. Batch conversion remains irreversible; unchecking cannot recreate converted remainder or remove cooked inventory.
3. Define plan supersession explicitly. Recommended: a new non-overlapping later plan can carry units from preceding plans; unrelated overlapping/future plans are not automatically superseded. Preview and save must share this predicate.
4. Decide how Adjust/Discard handles units currently assigned to plans. Recommended: prefer unassigned units and reject reductions below assigned quantity unless affected assignments are explicitly reconciled. Never leave a live placement referencing a silently discarded obligation.
5. `DESIGN.md` currently describes one-time recent-plan initialization and unchecking without completion metadata. Ask approval to update that lifecycle paragraph to the confirmed rules and the decisions above. Do not silently overwrite it or treat the older storage implementation plan as authoritative for this fix.
6. Confirm batch ownership when scheduled members move: recommended, move the associated unfinished remainder with the continuing batch, preserving unit IDs and audiences. A partial split must explicitly assign each remainder unit to one current batch. If remainder instead stays in the source batch, provide an authoritative completion path independent of superseded historical slots. No orphaned or multiply assigned remainder is allowed.

## Delivery phases

### 1. Regression fixtures and schema

Files: `prisma/schema.prisma`, a new additive migration, co-located rolling/planner tests, and PostgreSQL integration tests.

1. Write failing sequence tests for the pancake, partial rollover, Kotlets-style historical completion, and completed legacy remainder cases.
2. Finalize the smallest physical schema implementing the durable-unit requirements; inspect generated SQL and deletion semantics.
3. Generate the client through Prisma, never by editing generated files.
4. Test ownership, assignment uniqueness, terminal barriers, and transaction rollback on disposable PostgreSQL.

Exit: schema and failing behavioral fixtures are understood; no production data migration or legacy capture change yet.

### 2. Save, move, and complete

Files: `lib/db/rolling-meals.ts`, `lib/db/planner.ts`, `lib/validations/planner.ts`, `lib/validations/rolling-meals.ts`, `types/planner.ts`, `actions/planner-actions.ts`, rolling actions, and their tests.

1. Preserve exact unit claims through generation, save mappings, persisted plan reads, editor submissions, and existing-plan fill.
2. Replace consume-then-recapture with atomic assignment moves. Avoid introducing a second capture implementation.
3. Reconcile completion against the authoritative assignment, retaining terminal evidence and protecting partial quantities.
4. Implement adjustment/discard, removal/replacement, plan deletion, and undo rules agreed above.
5. Prevent old clients with missing lineage from bypassing reconciliation; return a typed conflict/reload result at cutover.

Exit: repeated replanning conserves outstanding units; completing a current placement clears it once; historical copies cannot revive it.

### 3. Cooked batch separation

Files: batch conversion in `lib/db/planner.ts`, `lib/db/storage.ts`, batch identity/save mappings, and related tests.

1. Keep uncooked remainder units in their batch lineage until cooking.
2. On first full batch completion, resolve scheduled and remainder units and create cooked lots/events atomically using the durable conversion key.
3. Never classify a fully cooked legacy batch's unresolved rows as uncooked. Route legacy conversion through the reviewed repair, not page rendering.
4. Preserve audiences, cooked-lot transfer timing/irreversibility, and exclusion of cooked quantities from ingredients and cooking work. Replace recipe-only automatic substitution where it would override explicit uncooked-unit claims; cooked placements consume only their allocated lots.

Exit: a batch of three with one scheduled meal yields exactly two cooked leftovers after completion, never three uncooked plus two cooked.

### 4. Read models and existing UI integration

Files: `components/storage/storage-page-container.tsx`, `components/planner/planner-form-container.tsx`, `components/planner/planner-form.tsx`, `components/planner/plan-editor.tsx`, existing rolling selector/checklist components, and tests.

1. Remove write-on-read initialization from Storage and replace aggregate capture reads with the new authoritative read model.
2. Return uncooked and cooked source counts separately and select exact source units/lots when generating a draft. Preserve existing source allocation order; fresh excess gets new units.
3. Keep claimed source metadata through regeneration and editing; only submitted placements may change assignments on save.
4. Revalidate Storage, affected plans, and new-plan suggestions after completion, conversion, adjustment, discard, and moves. Keep nutrition-log behavior unchanged.
5. Reuse existing UI without new components or visual redesign. Test conflict/reload behavior through stable roles, text, and attributes, not CSS classes.

Exit: both screens agree on outstanding quantities; merely opening them changes no database state.

### 5. Reviewed legacy mapping and production repair

Files: a new `prisma/repair-rolling-meals.ts`, a pure/co-located tested reconciliation module, and an operator runbook added to this plan during implementation.

1. Default to a read-only dry run. Require explicit account scope and `--apply` plus an approved manifest to write. Never infer a production connection from developer defaults.
2. Report queue IDs/versions, source candidates, plan IDs/versions, custom identity including ingredients/meal occasion, current placements, batch remainder/resolution state, proposed unit lineage, before/after totals, and ambiguity.
3. Bootstrap existing plans and queue entries together. Link known rollover copies rather than importing each physical historical slot. Recipe equality, `isRolledOver`, or newest-plan precedence alone is not proof of lineage; flag ambiguous mappings for review.
4. Include the already-saved November 23-29 plan. Its matching placements are not flagged rolled over; do not silently treat them as claims or blindly add them on top of the legacy backlog. Review overlap with preserved quantities before assigning lineage.
5. Preview resolving the eight stale quantities. For the three legacy leftovers, obtain a decision: import still-existing cooked food with audiences and conversion keys, or record it as no longer available. Do not automatically invent current cooked inventory.
6. Preserve the 14 supported unfinished quantities pending review; do not sum repeated historical copies, and do not assume the final combined plan/backlog total must be 14.
7. Record terminal/capture reconciliation so repaired meals cannot be reimported. Preserve legacy data and audit the mapping/change manifest; do not mark historical plan meals done.
8. Take an approved backup before apply. Pause planner/rolling/storage mutations and drain old deployments during cutover; a mixed old/new writer fleet must not run against repaired data.
9. Under the per-user transaction lock, verify every approved precondition/version and abort if anything changed. Apply lineage mapping, queue repair, and approved cooked conversion atomically per account.
10. Use deterministic repair keys. A second dry run must propose zero additional changes; a second apply must make none.
11. Keep additive schema and pre-repair snapshots for recovery. If an incident occurs, disable affected writes and reconcile from the manifest; do not roll back to legacy capture writers over migrated data or overwrite intervening user changes.
12. Inventory every existing account, including accounts with plans but no queue entries. Enable the new lifecycle only after that account's bootstrap is verified and its migration marker is committed. Keep unmigrated/ambiguous accounts blocked from affected reads/writes until reviewed; do not run legacy and new writers side by side. Mark genuinely new accounts ready transactionally before their first plan save.

Exit: human-approved fresh dry-run totals, exact applied changes, zero-change rerun, no lost fresh planned meals, and matching read models.

## Operator runbook: reviewed legacy bootstrap

### Safety boundary

`prisma/repair-rolling-meals.ts` is a standalone raw `pg` client. It does not import Prisma, dotenv, application environment validation, or application database configuration. It requires an explicitly supplied `REPAIR_DATABASE_URL`; `DATABASE_URL` and `.env` files are not fallbacks. Supply the connection through approved secret injection, never a command argument, committed file, terminal transcript, or this document. Driver/configuration error details are intentionally suppressed because they can contain credentials.

No production connection or repair was performed while implementing this tool. Database-backed transaction, rollback and concurrency behavior remains a release gate on a disposable production-shaped copy.

Before any operational connection:

1. Rotate the previously shared investigation credential. Verify the target through approved infrastructure controls without printing its connection string.
2. Apply and verify the additive lifecycle schema and deploy the lifecycle guards. Existing accounts remain blocked until their own reviewed bootstrap commits `lifecycle_version = 1`.
3. Inventory accounts using approved operational tooling, including accounts with plans but no queue. This CLI deliberately has no all-account flag and requires exactly one `--user-id`.
4. Pause planner, rolling and storage writes; drain old writer deployments. Keep this pause through snapshot, approval, apply and verification. The per-user `users ... FOR UPDATE` lock matches the application lock; it cannot make an old fleet that ignores that lock safe.
5. Take and verify an approved backup. Keep snapshots, reviewed manifests, reviewer identity, manifest fingerprints and execution results in restricted audit storage outside the repository. Reports contain private meal and household identifiers, but not user emails or database configuration.

### Exact commands

Run from the repository root with local dependencies installed. `--help` does not connect:

```bash
npx tsx prisma/repair-rolling-meals.ts --help
```

After explicit secret injection, read-only snapshot/report for one account:

```bash
npx tsx prisma/repair-rolling-meals.ts --user-id ACCOUNT_ID > /approved/private/rolling-before.json
```

The default transaction is `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, followed by `ROLLBACK`. No marker, reservation, queue initialization, cooked lot, or application write is performed. Output includes a canonical snapshot fingerprint; lifecycle version; all queue IDs/counts/versions; all plans and versions; full scoped slot/custom-ingredient/audience, batch/remainder/resolution, capture, lot/event and existing lineage evidence; recipe ownership; custom ingredient ownership; identity candidates and unresolved review issues. Recipe matches are candidates, not proposed automatic merges. Anonymous extra portions are not separate sources; already-cooked placements are reported but never imported as uncooked units.

Validate a reviewed manifest against a fresh read-only snapshot:

```bash
npx tsx prisma/repair-rolling-meals.ts --user-id ACCOUNT_ID --manifest /approved/private/rolling-reviewed.json > /approved/private/rolling-reviewed-preview.json
```

Expected: exit 0, `validation.issues: []`, `validation.alreadyMigrated: false`, reviewed `validation.projections` and `validation.plannedChanges`, and `proposedWrites: 0`. The report's top-level advisory issues remain until migration; resolve actual blocking errors in `validation.issues`. A stale or invalid manifest exits nonzero. Never edit a fingerprint to bypass changed evidence: regenerate the report and repeat review.

Only after independent review and backup approval:

```bash
npx tsx prisma/repair-rolling-meals.ts --user-id ACCOUNT_ID --manifest /approved/private/rolling-reviewed.json --apply > /approved/private/rolling-applied.json
```

`--apply` without `--manifest` is rejected before connecting. Unknown/repeated flags, missing scope, invalid JSON and mismatched manifest scope are rejected. Apply locks the user row in a single transaction, re-reads the entire snapshot under that lock, checks lifecycle/version/fingerprint/mapping preconditions, then writes atomically. Any rejection or SQL error rolls back. The SQL path never updates `used`, deletes legacy rows, or overwrites historical completion flags. It adds missing stable placement IDs, increments every existing plan version to invalidate pre-bootstrap editors, updates identity-group eligible counts/versions, adds units/history and explicitly approved inventory/resolution records, then commits the lifecycle marker. The result reports exact affected-row writes and the normalized manifest fingerprint.

### Manifest contract

The strict Zod manifest schema and pure API are in `lib/db/rolling-meals-repair.ts`. `repairSnapshotSchema` / `parseRepairSnapshot` also runtime-check the snapshot before reporting or applying: booleans, numeric counts/versions, dates, scoped plan/entry ownership, source references and persisted lineage evidence are not trusted TypeScript casts. Full raw evidence is retained in the fingerprint. Unknown manifest fields are errors; human prose is trimmed, but opaque IDs are never normalized or parsed as structured identifiers. IDs with leading/trailing whitespace or control characters are rejected; punctuation remains valid and is bound as SQL parameters. Collections/object keys are canonicalized for deterministic fingerprints, with locale-independent object-key ordering. Array ordering has no meaning. Source keys come verbatim from `snapshot.sources`, not recipe names or guessed slot IDs. Slot sources use `slot:SLOT_ID`; remainder sources use `PLAN_ID:rolling-remainder:BATCH_ID:INDEX`.

Example shape only, not an approved production mapping:

```json
{
  "formatVersion": 1,
  "userId": "ACCOUNT_ID",
  "snapshotFingerprint": "REPLACE_WITH_64_CHARACTER_REPORT_HASH",
  "reviewedBy": "APPROVED_OPERATOR_REFERENCE",
  "rationale": "Reviewed all plans and legacy quantities against household evidence",
  "groups": [
    {
      "identity": { "kind": "recipe", "recipeId": "RECIPE_ID" },
      "expectedEligibleCount": 1,
      "units": [
        {
          "key": "reviewed-obligation-1",
          "state": "PENDING",
          "eligible": true,
          "history": ["slot:OLDER_SLOT_ID", "slot:CURRENT_SLOT_ID"],
          "current": "slot:CURRENT_SLOT_ID",
          "rationale": "Explicitly confirmed rollover of the same uncooked meal"
        }
      ]
    }
  ],
  "legacyQueue": [
    { "entryId": "QUEUE_ENTRY_ID", "version": 1, "unitKeys": ["reviewed-obligation-1"] }
  ],
  "excludedHistory": [],
  "leftovers": []
}
```

Review requirements:

1. `groups` are explicit desired identity groups, with globally unique unit keys and unique source assignments. Recipe identity must belong to the scoped user. Custom identity is `{ "kind": "custom", "mealType": "DINNER", "customMeal": { "name": "...", "ingredients": [{ "ingredientId": "...", "unitId": null, "amount": 1 }] } }`; occasion and full content must match, not merely the name. Ingredients must be global or owned by this account.
2. `history` links all known rollover copies to one unit; `current` is either one source in that history or `null` for an unassigned backlog/terminal record. Every scheduled source not already cooked and every remainder source must be mapped or explicitly excluded where permitted. Every fresh unfinished placement in the newest/overlapping plans must remain its own authoritative pending current placement. Historical sources may link to that same unit across plans. Within any one plan snapshot, distinct sources represent simultaneous independent portions and must map to distinct units, including scheduled plus remainder sources and multiple remainder portions of the same batch. Coverage alone is not quantity conservation: two same-plan remainder keys in one history are rejected even if one is current. No recipe/newest-plan heuristic decides lineage.
3. `legacyQueue` must include every existing entry at its exact version, including zero-count entries. Each old quantity must map to a distinct unit of the same identity; the number of `unitKeys` must equal the old count. Resolving stale quantities means retaining corresponding `COMPLETED` or `DISCARDED` units, not omitting them. Units without placement history need legacy queue evidence. `expectedEligibleCount` must equal pending eligible units; pending current-plan units can be ineligible, while unassigned pending backlog must be eligible. The report also shows total pending counts.
4. `excludedHistory` entries are `{ "source": "slot:...", "rationale": "Reviewed reason this legacy historical placement is not an outstanding obligation" }`. Exclusions are permitted only for scheduled history ending strictly before the newest plan begins, never fresh/overlapping placements or remainders. Include the source identity in `groups`, even with an empty `units` array. Apply creates a deterministic discarded unit/history barrier for each exclusion, so future old-plan edits cannot import it afresh. Duplicate exclusions or mapped-and-excluded sources are rejected.
5. Preserve the investigated 14 supported unfinished quantities unless reviewed evidence explicitly resolves them. Manually map the November 23-29 plan's fresh-looking placements against that backlog. Do not add all matching slots independently, infer rollover from recipe equality or `isRolledOver`, or assume the combined desired total must be 14. Explicitly reconcile the eight suspected stale quantities to terminal units based on refreshed evidence.
6. The three investigated legacy leftovers require explicit decisions, not automatic current-food creation. `leftovers` entries are `{ "batchId": "...", "decision": "unavailable", "rationale": "Reviewed food no longer exists", "cookedAt": null }` or `{ "batchId": "...", "decision": "import", "rationale": "Explicit approval that these portions still exist", "cookedAt": "2026-11-21T12:00:00Z" }`. All scheduled batch members must be done and authoritative completed units. Every remainder must be current on a terminal `DISCARDED` unit for unavailable, or `CONVERTED` for import/allocation. Import requires an approved cooked timestamp and preserves each source remainder's audience, creating one deterministic lot/event per unit. No unsupported conversion or unapproved cooked import is allowed. Existing resolutions or lots on a candidate batch block a new conversion and require separate investigation.
7. Ordinary unfinished remainders remain explicitly mapped pending units. Fully done batches cannot retain pending remainder via this tool. It fails closed rather than inferring an ambiguous batch lineage or silently reusing existing cooked inventory. Partial lifecycle data under a version-0 account also blocks apply.
8. For food already reused in existing plan placements, use `{ "batchId": "...", "decision": "allocate", "rationale": "Reviewed cooked leftovers reused in the later plan", "cookedAt": "<reviewed ISO timestamp>", "destinationSources": ["slot:<first-source-id>", "slot:<second-source-id>"] }`. The cooked date must be reviewed; if only a historical approximation is available, state that in the rationale. Destination count must equal source remainder count; destinations must be unique owned same-recipe unfinished uncooked placements in strictly later plans. Source remainder units stay `CONVERTED` on the original sources and must have legacy queue evidence. Allocated destinations must not also have uncooked units or excluded-history records. Destination batches must be fully covered and contain no remainder; partial batches or existing transfer evidence block apply. Source and destination keys are sorted lexicographically and paired by index, not by manifest array order. Each allocation writes deterministic creation/transfer events, sets destination already cooked/rolled over, preserves its done flag, clears its cooking batch membership, resolves both source and covered destination batches, and leaves zero active lots for these portions. Nutrition logs are untouched.

### Idempotency and recovery

Deterministic IDs include user scope, normalized manifest fingerprint and record key. Imported lots/events additionally include batch/source identity. `PlanBatchRemainderResolution` and retained converted/discarded current remainder units form the conversion barrier; retained historical placements prevent stale recapture. The existing lifecycle marker is the authoritative bootstrap guard. No schema extension or competing durable conversion key is introduced.

Repeat the same dry run and apply commands after success, retaining their output separately. Expected: report `status: "already-migrated"`, `proposedWrites: 0`; apply `status: "already-migrated", "writes": 0, "manifestMatch": true`. Already-migrated accounts are never reapplied, even after normal application edits make the original snapshot stale. Runtime snapshot scope/lineage checks still run. For a manifest with unit or exclusion records, every fingerprint-derived deterministic unit ID must still belong to this account; a different manifest fingerprint is rejected rather than certified by lifecycle version alone. Retained terminal/history units provide this evidence after ordinary plan edits. A manifest with no unit/exclusion records has no durable fingerprint evidence: it returns `manifestMatch: null`, zero writes, and makes no claim that the manifest originally migrated the account. Treat that null as requiring independent audit confirmation, not as proof of matching approval. This is a bootstrap-only tool, not a post-migration reconciler; archive the original manifest/fingerprint as the audit record. A lifecycle marker alone does not prove a prior repair used this particular manifest.

Apply also fixes its local SQL search path, uses explicit enum casts, scopes legacy updates by owner and approved version, requires exactly one affected row for each mandatory write, and changes the lifecycle marker only from version 0. Deterministic-ID conflicts abort; they never upsert/adopt another account's unit or inventory record.

Verify authoritative queue/current-plan pending totals, all historical links, terminal stale quantities, approved lot counts/audiences/events and resolution rows through independent read-only operational tooling. Confirm historical `used` values are unchanged and application read models agree before resuming writes. Integration testing must demonstrate full rollback on failure and serialization with another user-scoped writer on a disposable database; pure validation tests do not establish those SQL properties.

If verification fails, keep affected writes disabled. Retain the additive schema and restricted pre-repair snapshot/manifest. Reconcile with approved forward changes or a controlled backup recovery that accounts for intervening writes. Do not delete terminal units/resolutions, reset only the lifecycle marker, restore legacy capture writers, or rerun this bootstrap over migrated data.

### Repair verification commands

Offline verification, with no SQL connection:

```bash
RUN_POSTGRES_INTEGRATION=0 npx vitest run --project unit lib/db/rolling-meals-repair.test.ts lib/db/rolling-meals-repair.postgres.test.ts
npm run lint-dev && npm run typecheck
```

Expected: 52 pure validation/offline CLI tests pass; all 15 repair PostgreSQL tests skip; lint/typecheck exit 0.

Only after the coordinating operator provides a verified disposable, migrated local database and explicitly injects its `DATABASE_URL`:

```bash
RUN_POSTGRES_INTEGRATION=1 POSTGRES_INTEGRATION_DISPOSABLE=1 npx vitest run --project unit lib/db/rolling-meals-repair.postgres.test.ts
```

Both flags are required. The integration suite imports no application database/environment module; it requires an explicitly present PostgreSQL URL with a literal local hostname (`localhost`, `127.0.0.1`, or `::1`), username and database. Connection query overrides are refused except `sslmode=disable`. The suite creates uniquely scoped fixture accounts, spawns the real CLI with that verified URL passed as `REPAIR_DATABASE_URL`, stores temporary manifests privately, then removes only its own fixtures. It covers unchanged read-only snapshots, same-plan collapse rejection, actual apply and repeat apply, stale scope/version rejection, approved cooked conversion/allocation, rollback after deterministic-ID or late transfer conflicts, and concurrent user-locked applies. Do not run it against an ambient URL or production; skipped tests are not SQL verification evidence.

## Required test matrix

| Scenario | Expected result |
| --- | --- |
| One pancake across weeks 1, 2, and 3 | One outstanding unit throughout; zero after current completion |
| Three pending; move one; complete it | Two remain; no recipe-wide clearing |
| Three pending; move one through several plans while two stay unassigned | Three remain until cooking; no `skipDuplicates` quantity loss |
| Older unfinished Kotlets; carried copy completed | Older copies never recreate a pending unit |
| Same recipe, one rollover plus genuinely fresh meal | Two distinct units; completing one leaves the other |
| Batch: one scheduled plus two uncooked remainder | Completion gives zero uncooked units and two cooked leftovers |
| Repeated completion, autosave, batch recreation, uncheck/recheck | No duplicate conversions or resurrection of cooked remainder |
| Cooked and uncooked quantities for the same recipe | Exact separate claims; automatic transfer cannot replace an explicit uncooked claim or clear unrelated units |
| Move a scheduled batch member with unfinished remainder | One authoritative owner per unit; stale source-group checks cannot convert or strand leftovers |
| Fresh excess above available source count | Only the excess creates new units |
| Two tabs claim/move/complete the same unit | One succeeds; stale transaction fails without partial changes |
| Stale historical plan edit | Cannot complete or move the newer authoritative assignment |
| Move from batch remainder to schedule, edit audiences | Same units and total; stable identity across replacement |
| Removal, replacement, plan deletion, Adjust, Discard, undo | Follow approved rules; no dangling assignment or historical resurrection |
| Custom meals with same name but different content/occasion | Stay independent; meal type and ingredients retained |
| Anonymous extra portions | Never create rolling units |
| Log food, change a log, delete a log | No rolling or cooked-lot quantity changes |
| Storage/planner read or draft regeneration | No writes, reservations, or duplicate units |
| Cross-user IDs or mismatched recipe/custom payload | Rejected server-side; all changes rolled back |
| Repair dry run, changed precondition, repeat apply | Zero dry-run writes; stale manifest aborts; second apply does nothing |
| Legacy completed remainder with no resolution | Excluded from uncooked; no unapproved cooked import on read |
| Existing account outside the reviewed household | Bootstrap or explicitly block; no silent empty backlog or legacy meal duplication |

Add database-backed tests for uniqueness, concurrent claims, rollback, lineage surviving slot/batch recreation, and idempotent repair. Mock-only tests are not sufficient for release.

## Verification and rollout

Use a disposable local PostgreSQL database or isolated test branch for integration tests. Never point fixture-writing tests at production or reuse the investigation connection for them.

Focused existing suites, expanded during implementation:

```bash
RUN_POSTGRES_INTEGRATION=0 npx vitest run --project unit lib/db/rolling-meals.test.ts lib/db/planner.test.ts lib/db/planner.update-plan-audience.test.ts lib/validations/planner.test.ts
RUN_POSTGRES_INTEGRATION=0 npx vitest run --project component components/storage/storage-page-container.test.tsx components/storage/rolling-meals-section.test.tsx components/planner/planner-form-container.test.tsx
```

Expected: all selected suites pass, including the new sequence regressions; no writes to external databases.

```bash
RUN_POSTGRES_INTEGRATION=1 npx vitest run --project unit lib/db/rolling-meals.postgres.test.ts lib/db/planner.postgres.test.ts
```

Expected: all transaction/lifecycle integration tests pass against an explicitly verified disposable database. Add the repair integration suite to this command when created.

At the end of each implementation phase:

```bash
npm run lint-dev && npm run typecheck
```

Expected: both commands exit 0 with no warnings or type errors.

Before release:

```bash
RUN_POSTGRES_INTEGRATION=0 npm test -- --run
npm run lint-dev && npm run typecheck
```

Expected: full non-PostgreSQL suite and mandatory checks pass, in addition to the separately executed PostgreSQL suites. Add browser acceptance coverage using the project's available runner; current `package.json` has no `test-view` or `test-e2e` scripts, so do not claim those commands ran.

Release gates: approve unresolved behavior and `DESIGN.md` changes; review migration SQL; test on an isolated production-shaped copy; approve the repair manifest; perform coordinated schema/code/data cutover with writes paused; resume writes only after one authoritative lifecycle is active.

Acceptance after cutover: complete a carried unit and verify exactly one decrement; replan an unfinished unit and verify unchanged total; complete a batch and verify only its leftovers become cooked; repeat saves/reads and verify no quantity drift. Use test accounts, not fabricated meals in the affected production household.

Rotate the database credential shared during investigation before further operational use. Use approved secret delivery for deployment and repair, not committed URLs or command examples containing passwords.

## Definition of done

1. All confirmed lifecycle rules and approved edge cases have passing unit, transaction, and existing-UI integration coverage.
2. Plan, backlog, and cooked inventory quantities conserve identity through repeated replanning and completion.
3. No read performs capture, food logs do not influence rolling, and old capture writers cannot revive completed units.
4. Production repair is explicitly approved, auditable, idempotent, and verified against fresh data.
5. Required lint/typecheck and test evidence is recorded; unexecuted checks remain explicitly unverified.
