# Household Storage implementation plan

> The current Rolling meals page requirements supersede the Storage page information architecture below: keep `/storage`, label navigation and breadcrumb Rolling meals, and show independent Cooked and stored and Planned, not cooked sections. Cards show the meal name followed by count and, for cooked meals, cooking audience; omit dates, sources, meal occasions, and custom labels. Adjust and Discard are direct actions. Planned quantities are managed through the rolling queue, independently of stored lots.

## Purpose

Build a household-wide Storage destination where a user can see cooked meals that physically exist, add them to a meal plan, correct quantities, and remove meals as used or discarded.

This document is an execution specification. Implement it in the listed phases. Do not combine phases into one large change. Run the required verification after every phase and stop if an invariant cannot be preserved.

## Confirmed product decisions

1. Storage contains only cooked food that physically exists.
2. Uncooked batch remainder stays attached to its source plan batch and does not appear on the Storage page.
3. Storage is a peer sidebar destination after Meal plan, not a tab inside one plan.
4. The first release supports viewing, adjusting, marking used, discarding, and adding stored meals to a plan.
5. Used and discarded are distinct persisted events.
6. Identical recipes remain separate lots when their source, cooked date, or cooking audience differs.
7. Adding a stored meal to a plan immediately removes it from available Storage.
8. Removing that plan slot later does not automatically return the meal to Storage. The user can correct a mistake with Adjust.
9. Marking a stored meal used does not create a nutrition log in v1.
10. No undo, expiration dates, freezer/fridge locations, reminders, custom labels, or inventory analytics in v1.

## Terminology

Use these terms consistently in code and copy:

| Term | Meaning |
| --- | --- |
| Planned batch remainder | Unscheduled portions expected from a batch recipe that has not been marked cooked. This remains plan-scoped. |
| Stored meal lot | Cooked, available physical inventory owned by the signed-in user. |
| Storage event | Immutable audit record for creation, adjustment, use, discard, or transfer. |
| Transfer | Irreversible removal from available Storage and placement into a meal-plan slot. |
| Source batch | The plan batch whose cooking completion created a stored lot. Provenance only; it must not own the lot. |

Do not call uncooked planned remainder "available Storage" in new UI copy.

## Current-state constraints

The implementing model must understand these constraints before editing:

1. `PlanBatchStorageRow` is currently owned by `PlanBatch` and cascades with the plan in `prisma/schema.prisma`.
2. `updatePlan` in `lib/db/planner.ts` deletes and recreates plan slots and most batches.
3. `getUnusedMealsFromRecentPlans` currently combines unfinished slots and plan batch storage rows.
4. Rolling generation currently copies aggregate quantities into a new plan without decrementing a source row.
5. `PlanBatchInput.storageRows` is a replaceable plan payload. It must not become the household inventory payload.
6. Plan autosave is guarded only inside one browser component. It has no cross-tab optimistic version.
7. Existing storage rows do not contain a cooked flag. Cooking completion is represented by matching `PlanSlot.used` values.
8. Existing rolling copies may leave duplicate physical rows in older plans. A migration must not import every row.

## Non-negotiable invariants

Every implementation phase must preserve these invariants:

1. Every active stored lot belongs to exactly one `User` and one `Recipe`.
2. Active lot count is a positive integer.
3. Every lot audience member belongs to the same user as the lot.
4. Plan deletion cannot delete a stored lot.
5. Source batch deletion cannot delete a stored lot.
6. Generation is read-only and never changes inventory.
7. Saving a generated plan and consuming selected lots happen in one database transaction.
8. A stale lot version or insufficient count fails the whole save or transfer transaction.
9. Repeated plan autosave cannot consume the same stored quantity twice.
10. Existing stored food never contributes ingredients to groceries or cooking calculations.
11. Planned batch remainder contributes ingredients until the batch is marked cooked.
12. Once planned remainder is converted to a stored lot, it no longer contributes ingredients.
13. Cross-user recipe, lot, family-member, plan, and slot IDs are rejected server-side.
14. Archived or planner-excluded recipes remain visible in Storage but cannot be transferred into a plan.
15. A recipe with active stored lots cannot be deleted or changed from batch to non-batch.
16. A family member referenced by an active lot cannot be deleted until those lots are reassigned or removed.

## Target data model

### Keep plan-scoped planned remainder

Keep `PlanBatchStorageRow` during v1, but reinterpret it as uncooked planned remainder. Do not expose these rows on the household Storage page.

Avoid renaming the table in the first migration. Renaming can happen after all code paths use the new terminology. Renaming now increases migration risk without changing behavior.

### Add `StoredMealLot`

Add a new Prisma model with these fields and relations. Adapt relation names to avoid collisions with existing generated names.

```prisma
model StoredMealLot {
  id                  String   @id @default(cuid())
  userId              String   @map("user_id")
  recipeId            String   @map("recipe_id")
  sourcePlanId        String?  @map("source_plan_id")
  sourcePlanBatchId   String?  @map("source_plan_batch_id")
  sourcePlanStartDate DateTime? @map("source_plan_start_date")
  sourcePlanEndDate   DateTime? @map("source_plan_end_date")
  count               Int
  version             Int      @default(1)
  cookedAt            DateTime @map("cooked_at")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  user            User                           @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe          Recipe                         @relation(fields: [recipeId], references: [id], onDelete: Restrict)
  sourcePlan      Plan?                          @relation(fields: [sourcePlanId], references: [id], onDelete: SetNull)
  audienceMembers StoredMealLotAudienceMember[]
  events          StoredMealEvent[]

  @@index([userId, cookedAt])
  @@index([userId, recipeId])
  @@index([sourcePlanId])
  @@index([sourcePlanBatchId])
  @@map("stored_meal_lots")
}
```

`sourcePlanBatchId` is provenance text, not a foreign key. `PlanBatch` is deleted and recreated by autosave, so a foreign key to it is not stable. Preserve source plan date snapshots so provenance remains understandable after source-plan deletion.

Add a SQL check constraint in the migration:

```sql
CHECK (count > 0)
```

Do not add a uniqueness constraint across recipe and audience. Separate cooking events are separate lots.

### Add `StoredMealLotAudienceMember`

```prisma
model StoredMealLotAudienceMember {
  lotId          String @map("lot_id")
  familyMemberId String @map("family_member_id")

  lot          StoredMealLot @relation(fields: [lotId], references: [id], onDelete: Cascade)
  familyMember FamilyMember  @relation(fields: [familyMemberId], references: [id], onDelete: Restrict)

  @@id([lotId, familyMemberId])
  @@index([familyMemberId])
  @@map("stored_meal_lot_audience_members")
}
```

Use `Restrict` for the family-member relation. Family-member deletion must never silently alter inventory provenance.

### Add `StoredMealEvent`

Add a Prisma enum:

```prisma
enum StoredMealEventType {
  CREATED
  ADJUSTED
  USED
  DISCARDED
  TRANSFERRED
}
```

Add an immutable event model:

```prisma
model StoredMealEvent {
  id                String              @id @default(cuid())
  userId            String              @map("user_id")
  lotId             String?             @map("lot_id")
  recipeId          String?             @map("recipe_id")
  recipeName        String               @map("recipe_name")
  type              StoredMealEventType
  quantity          Int
  previousCount     Int?                @map("previous_count")
  nextCount         Int?                @map("next_count")
  destinationPlanId String?             @map("destination_plan_id")
  destinationDate   DateTime?           @map("destination_date")
  destinationMeal   PlannerMealType?    @map("destination_meal")
  createdAt         DateTime            @default(now()) @map("created_at")

  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  lot             StoredMealLot? @relation(fields: [lotId], references: [id], onDelete: SetNull)
  recipe          Recipe?        @relation(fields: [recipeId], references: [id], onDelete: SetNull)
  destinationPlan Plan?          @relation(fields: [destinationPlanId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([lotId])
  @@index([destinationPlanId])
  @@map("stored_meal_events")
}
```

Keep `recipeName` as a snapshot so audit rows remain understandable after recipe deletion. Event history does not need a v1 page.

### Add plan optimistic versioning

Add `version Int @default(1)` to `Plan`.

All saved-plan mutations must receive `expectedVersion`. Update with a conditional predicate and increment the version in the same transaction. A zero-row update returns a typed `PLAN_CONFLICT` result.

Do not rely on `updatedAt` timestamp equality for optimistic locking.

### Add reverse relations

Add the required reverse relation arrays to `User`, `Recipe`, `FamilyMember`, and `Plan`.

After editing the schema, generate a migration and regenerate the Prisma client using the repository's existing Prisma workflow. Do not manually edit generated client files.

## Migration strategy

The migration must be non-destructive. Do not drop `PlanBatchStorageRow` in v1.

### Schema migration

1. Add the new enum, lot, audience, event, and relation columns.
2. Add `Plan.version` with default `1`.
3. Add indexes and the positive-count check.
4. Keep all legacy tables and data.

### Backfill script

Create a dedicated TypeScript script under `prisma/` with dry-run as the default. Require an explicit `--apply` flag to write.

The script must mirror current logical rollover barriers instead of importing every physical row:

1. Process one user at a time.
2. Load the user's four newest-created plans ordered by `createdAt desc, id desc`.
3. For each recipe identity, find the newest of those plans containing that recipe in either a slot or a batch.
4. Ignore matching storage rows from older plans because they may be copied rollover representations.
5. In the winning plan, inspect every batch for that recipe.
6. Treat a batch as cooked only when every recipe slot linked to that `batchGroupId` has `used = true`.
7. Import only positive rows from cooked winning batches.
8. Preserve separate rows when audiences differ.
9. Preserve separate lots for separate winning-plan batches.
10. Set `cookedAt` to the best available historical timestamp. Prefer the plan's `updatedAt` if available; otherwise use `createdAt` and document the approximation.
11. Copy source-plan IDs and date snapshots.
12. Create one `CREATED` event per imported lot.
13. Do not delete or alter source `PlanBatchStorageRow` records during backfill.
14. Make the script idempotent by recording a deterministic migration key or checking source provenance before insert.

Dry-run output must include:

1. User ID.
2. Recipe ID and name.
3. Winning source plan.
4. Imported count and audiences.
5. Skipped older duplicate counts.
6. Skipped uncooked planned counts.
7. Invalid zero/negative rows.
8. Total legacy count versus total imported active count.

Do not run `--apply` against production until a human reviews dry-run totals.

## Backend module boundaries

### New validation module

Create `lib/validations/storage.ts`.

Define schemas for:

1. `adjustStoredMealLotSchema`: `lotId`, `expectedVersion`, `count`, and audience member IDs.
2. `removeStoredMealSchema`: `lotId`, `expectedVersion`, positive `quantity`, and reason enum `USED | DISCARDED`.
3. `transferStoredMealSchema`: `lotId`, `expectedLotVersion`, `planId`, `expectedPlanVersion`, and destination slot keys.
4. `storageCreatePlanClaimSchema`: lot ID, expected version, and quantity for create-plan drafts.

Validation rules:

1. Counts and quantities are integers from 1 through 99.
2. Audience IDs are non-empty and deduplicated.
3. Destination slot keys are unique.
4. Transfer quantity equals destination slot count.
5. IDs are non-empty strings.

### New database module

Create `lib/db/storage.ts`. Keep Prisma queries and transactions here; keep authentication in server actions.

Implement these exported functions:

```ts
listStoredMealLots(userId: string): Promise<StoredMealLotListItem[]>
getStoredMealLot(userId: string, lotId: string): Promise<StoredMealLotDetail | null>
getStorageTransferTargets(userId: string, recipeId: string): Promise<StorageTransferTarget[]>
adjustStoredMealLot(userId: string, input: AdjustStoredMealLotInput): Promise<StorageMutationResult>
removeStoredMealQuantity(userId: string, input: RemoveStoredMealInput): Promise<StorageMutationResult>
transferStoredMealToPlan(userId: string, input: TransferStoredMealInput): Promise<StorageTransferResult>
consumeStoredMealClaimsTx(tx: Prisma.TransactionClient, userId: string, claims: StoredMealClaim[]): Promise<void>
createStoredLotsFromCookedBatchesTx(tx: Prisma.TransactionClient, params: CookedBatchConversionInput): Promise<void>
```

Do not export raw Prisma rows to components. Map them to explicit view models.

### List query behavior

`listStoredMealLots` must:

1. Filter by `userId` through the lot's direct owner field.
2. Include recipe name, slug, image data, archived state, and planner exclusion state.
3. Include audience names and IDs.
4. Include source-plan dates and optional source-plan route.
5. Sort newest cooked date first, then ID for stable ordering.
6. Return separate lots; do not aggregate by recipe.
7. Return only positive active lots.

### Adjust transaction

`adjustStoredMealLot` must:

1. Load the lot scoped to `userId`.
2. Validate every audience member belongs to the same user.
3. Reject a stale `expectedVersion`.
4. Update count, audience joins, and `version + 1` atomically.
5. Create one `ADJUSTED` event with previous and next counts.
6. Never mutate source plan or source batch.

### Used/discarded transaction

`removeStoredMealQuantity` must:

1. Load the lot scoped to `userId`.
2. Reject stale version or quantity greater than available count.
3. Decrement using a conditional update with `count >= quantity` and matching version.
4. Create `USED` or `DISCARDED` event in the same transaction.
5. If the next count is zero, delete the lot after creating the event. Event `lotId` becomes null through `SetNull` while snapshot fields remain.
6. Return the next count so the client can remove or update the row.

### Transfer targets

`getStorageTransferTargets` must:

1. Return owned current and future plans only.
2. Include plan ID, version, date range, and compatible empty slots.
3. A compatible slot is empty and its meal type is supported by the recipe.
4. Sort plans by start date and slots by date then meal type.
5. Do not return archived or planner-excluded recipes as transferable.

### Transfer transaction

`transferStoredMealToPlan` must:

1. Re-read the lot, recipe, destination plan, and destination slots inside one transaction.
2. Verify lot and plan ownership.
3. Verify lot version and plan version.
4. Verify quantity is available.
5. Verify every destination slot is still empty and recipe-compatible.
6. Fill selected slots with the stored recipe.
7. Set `isRolledOver = true` and `alreadyCooked = true`.
8. Set `used = false`; do not silently mark consumption or nutrition logging complete.
9. Use one generated `batchGroupId` when transferring two or more portions of a batch recipe.
10. Create an empty `PlanBatch` for that group only when current rendering or persistence requires it; never create planned remainder rows.
11. Decrement or delete the lot using the same rules as removal.
12. Create one `TRANSFERRED` event per destination slot or one event with total quantity and explicit destination metadata. Pick one representation and test it consistently; prefer one event per slot because destinations can differ by date and meal type.
13. Increment plan version.
14. Reuse or extract the existing plan-to-baseline-log synchronization so the destination plan and log do not diverge.
15. Roll back every change when any check fails.

Transfer is intentionally irreversible in v1. Later plan edits must not increment the lot.

### Typed mutation results

Use explicit discriminated results rather than generic exceptions for expected conflicts:

```ts
type StorageMutationResult =
  | { type: "success"; lot: StoredMealLotListItem | null }
  | { type: "not_found" }
  | { type: "conflict"; currentCount: number; currentVersion: number }
  | { type: "invalid_audience" }
  | { type: "recipe_unavailable" };
```

Add transfer-specific `plan_conflict`, `slot_conflict`, and `no_compatible_slots` results.

### Server actions

Create `actions/storage-actions.ts`.

Each action must:

1. Call `requireUser()`.
2. Parse input with the corresponding Zod schema.
3. Call the database function with authenticated `userId`.
4. Revalidate `/storage` after success.
5. Revalidate affected plan, log, and groceries routes after transfer.
6. Return typed expected errors and reserve thrown errors for unexpected failures.

Do not accept `userId` from the client.

## Cooking conversion

### New behavior

When a batch is first marked fully cooked, convert its positive planned remainder rows into household stored lots.

The conversion belongs inside the same `updatePlan` transaction that persists the newly cooked state.

For each newly completed batch:

1. Identify the persisted source batch by existing `batchGroupId` before destructive replacement.
2. Confirm every incoming slot in that batch group is `used = true`.
3. Confirm the persisted group was not already fully used.
4. Read positive `PlanBatchStorageRow` records and their audiences.
5. Create one `StoredMealLot` per planned remainder row.
6. Set source-plan provenance and `cookedAt = now()`.
7. Create one `CREATED` event per lot.
8. Remove those planned remainder rows from the recreated plan batch payload so groceries and cooking links stop counting them.
9. Ensure retries do not create duplicate lots. Use a deterministic conversion key or a unique source-row provenance field.

Add a nullable `sourcePlannedRowId` snapshot to `StoredMealLot` with a unique index if needed for idempotency. Because old planned rows may be deleted during conversion, store the old ID as plain text rather than a foreign key.

### Unchecking cooked meals

Unchecking a meal after conversion must not delete the stored lot or recreate planned remainder. Physical inventory may already have been adjusted, used, discarded, or transferred. Treat cooking conversion as irreversible.

Document this behavior in `DESIGN.md`.

### Plan deletion

Plan deletion does not affect stored lots. Source-plan relation becomes null and date snapshots remain.

## Planner and rolling integration

### Separate source concepts

Do not continue treating plan batch remainder and cooked Storage as the same source.

Replace or refactor `getUnusedMealsFromRecentPlans` so it returns:

1. Unfinished scheduled/planned quantities from the four newest-created plans.
2. Cooked stored quantities from `StoredMealLot` across all active lots for the user.
3. A display breakdown such as `3 in storage / 1 not cooked`.
4. Stable lot claims for stored quantities.

Use a dedicated return type that is not the submission schema:

```ts
type RollingMealSuggestion = {
  kind: "recipe";
  recipeId: string;
  meals: number;
  source: {
    storedMeals: number;
    notCookedMeals: number;
  };
  storedLots: Array<{
    lotId: string;
    count: number;
    expectedVersion: number;
    cookedAt: string;
  }>;
};
```

Custom meals only support unfinished scheduled quantities and never Storage.

### What counts as not cooked

For the newest recent plan containing a recipe identity:

1. Count unused scheduled slots.
2. Add positive planned remainder rows from batches that are not fully cooked.
3. Do not count planned remainder from fully cooked batches; those rows should already have converted to stored lots.
4. Preserve the existing newest-plan barrier for unfinished quantities.

Stored lots do not use the newest-plan barrier. They are the single inventory source and may come from any date.

### Rolling UI behavior

In `components/planner/planner-rolling-recipes-section.tsx`:

1. Render provenance under the recipe name using existing caption tokens.
2. Order source text as Storage first: `3 in storage / 1 not cooked`.
3. Omit zero parts: `3 in storage` or `1 not cooked`.
4. Do not put provenance in multiselect chips.
5. Manually added recipes have no provenance caption.
6. Keep the total count editable.
7. Preserve provenance as the original suggestion explanation when the user edits total.

### Source allocation when total changes

Use this deterministic rule:

1. Stored meals are allocated first, oldest `cookedAt` first.
2. Not-cooked rollover quantity is allocated second.
3. Any requested quantity above both sources is a fresh recipe quantity and is not marked rolled over or already cooked.
4. Lowering the total reduces fresh quantity first, then not-cooked quantity, then stored quantity.
5. The generated draft must retain exact lot claims; never submit only recipe ID plus aggregate count.

### Generation

`generatePlan` remains read-only.

It must place three source categories distinctly:

1. Stored claims produce slots with `isRolledOver = true` and `alreadyCooked = true`.
2. Not-cooked rollover produces slots with `isRolledOver = true` and `alreadyCooked = false`.
3. Fresh excess produces normal new slots.

The generated result must return exact lot claims alongside the draft plan. Repeated generation must not mutate or reserve inventory.

### Save

`savePlan` and `createPlan` must accept exact stored-lot claims separately from `PlanBatchInput.storageRows`.

Inside one transaction:

1. Validate every claim belongs to the user and matches the recipe.
2. Revalidate expected versions and quantities.
3. Create the plan and slots.
4. Consume claimed stored quantities.
5. Create transfer events tied to destination dates and meal types.
6. Create planned batch remainder only for genuinely fresh, uncooked batch output.
7. Never create a new stored lot from unplaced claimed Storage.
8. If a claim cannot be placed, leave it untouched.
9. If any consumed claim conflicts, roll back plan creation and return a typed Storage conflict.

### Existing plan fill/extension

When generation fills empty slots in an already saved plan, use `Plan.version` and perform claim consumption plus plan update atomically. Do not consume claims during the generation preview.

## Groceries and cooking calculations

Audit all uses of `storageRows` before switching reads:

1. `lib/db/shopping-list.ts`
2. `lib/planner/plan-recipe-link.ts`
3. `lib/planner/helpers.ts`
4. `lib/planner/batch-storage.ts`
5. `components/planner/plan-batch-dialog.tsx`

Rules:

1. Planned batch remainder is included in ingredients, cooking links, and optional groceries until cooking conversion.
2. Stored lots are already cooked and never add ingredients or cooking work.
3. Transferred stored slots are excluded from groceries by default.
4. Existing grocery UI may show transferred stored meals as unavailable/already cooked context, but must not select their ingredients by default.
5. Batch badges may show planned remainder before cooking; after conversion, central Storage owns the available count.

Do not make the Storage page edit `PlanBatchInput.storageRows`.

## Storage page information architecture

### Route and navigation

1. Add `ROUTES.storage = "/storage"` in `lib/constants.ts`.
2. Add Storage after Meal plan in `components/app-sidebar.tsx`.
3. Use an existing Lucide inventory/freezer-compatible icon already in the dependency; do not add another icon package.
4. Add `/storage` to topbar breadcrumb handling in `components/app-topbar.tsx`.
5. Create `app/(main)/storage/page.tsx`.
6. Use the existing `(main)` shell and `page-container`.

### Components

Create components under `components/storage/`:

```text
storage-page-container.tsx
storage-list.tsx
storage-row.tsx
storage-adjust-dialog.tsx
storage-remove-dialog.tsx
storage-transfer-dialog.tsx
storage-empty-state.tsx
storage-page-skeleton.tsx
```

Compose existing primitives. Do not edit files under `components/ui/`.

### Page layout

Use a compact responsive list rather than a dashboard grid.

Each lot row shows:

1. Recipe thumbnail and name.
2. Available meal count.
3. `Cooked for` audience names.
4. Cooked date.
5. Source-plan date range and link when the plan still exists.
6. A visible Add to meal plan action.
7. Secondary menu actions: Adjust, Mark used, Discard.

Desktop uses one compact horizontal card row. Mobile stacks metadata and keeps Add to meal plan visible.

### Empty state

Copy:

```text
Nothing in Storage
Cooked batch portions that are not assigned to a meal plan will appear here.
```

Primary action links to Meal plan.

### Adjust dialog

1. Edit available count and cooked-for audience.
2. Require at least one audience member.
3. Disable Save until values differ and are valid.
4. On conflict, keep the dialog open, show the latest count, and offer Reload.

### Used/discarded dialog

Use one reusable dialog with action-specific title and destructive styling only for Discard.

1. Default quantity to one.
2. Maximum is current available count.
3. Used copy says it removes meals consumed outside the meal plan and does not create a nutrition log.
4. Discard copy says the removal is recorded as discarded.
5. On success, update or remove the row without a full-page loading state.

### Transfer dialog

1. Load compatible current/future plans and empty slots.
2. Select a plan first.
3. Preselect the earliest compatible empty slots up to quantity one.
4. Let the user choose quantity and exactly that many destination slots.
5. Disable confirmation if slot count and quantity differ.
6. Explain that transferred meals leave Storage immediately.
7. If there is no compatible plan, show Create meal plan.
8. For archived or planner-excluded recipes, disable transfer and explain why.
9. On conflict, refresh lot and plan targets without dismissing the dialog.

### Loading and errors

1. Use a page skeleton matching final row geometry.
2. One failed mutation must not hide the rest of the inventory.
3. Use existing toast patterns for successful mutations.
4. Use inline dialog errors for validation and conflicts.
5. Never optimistically decrement without restoring on server failure.

## Deletion and conversion safeguards

### Recipe deletion

Update recipe reference checks in `lib/db/recipes.ts`:

1. Count active stored lots.
2. Return existing in-use behavior when any active lot exists.
3. Do not cascade-delete inventory.

### Batch-to-non-batch conversion

Block changing `isBatchRecipe` from true to false while active stored lots exist. Return a specific validation message instructing the user to use, discard, or transfer Storage first.

### Archive and planner exclusion

Archived and planner-excluded recipes remain visible and manageable in Storage. Disable Add to meal plan for them. Used, Discarded, and Adjust remain available.

### Family-member deletion

Before deleting a family member, count active lot audience references. Block deletion with a clear message until Storage lots are reassigned or removed.

Do not rely on cascading audience-row deletion.

## Required implementation phases

### Phase 1: Schema and dry-run migration

Files:

1. `prisma/schema.prisma`
2. New Prisma migration.
3. New `prisma/backfill-stored-meal-lots.ts`.
4. `package.json` script for dry-run/apply invocation if repository conventions permit.

Deliverables:

1. New models and generated client.
2. Dry-run report with no writes by default.
3. Migration/backfill tests or deterministic fixture tests.

Stop after verification and inspect generated SQL before Phase 2.

### Phase 2: Storage repository and actions

Files:

1. `lib/validations/storage.ts`
2. `lib/db/storage.ts`
3. `actions/storage-actions.ts`
4. Co-located tests.

Deliverables:

1. Ownership-safe list and mutation APIs.
2. Optimistic lot conflicts.
3. Used/discarded audit events.
4. Transfer transaction for an existing saved plan.

Do not build UI until action tests pass.

### Phase 3: Cooking conversion

Files:

1. `lib/db/planner.ts`
2. `actions/planner-actions.ts` if result types change.
3. Planner transaction tests.

Deliverables:

1. Newly cooked planned remainder becomes stored lots exactly once.
2. Converted remainder disappears from plan cooking/grocery calculations.
3. Unchecking does not reverse conversion.

### Phase 4: Storage page

Files:

1. `lib/constants.ts`
2. `components/app-sidebar.tsx`
3. `components/app-topbar.tsx`
4. `app/(main)/storage/page.tsx`
5. `components/storage/*`
6. Co-located component tests.

Deliverables:

1. Responsive list and empty state.
2. Adjust, Used, Discarded, and Transfer flows.
3. Sidebar and breadcrumb integration.

### Phase 5: Rolling planner integration

Files:

1. `lib/db/planner.ts`
2. `lib/validations/planner.ts`
3. `components/planner/planner-form-container.tsx`
4. `components/planner/planner-form.tsx`
5. `components/planner/planner-rolling-recipes-section.tsx`
6. `actions/planner-actions.ts`
7. Related tests.

Deliverables:

1. Source caption such as `3 in storage / 1 not cooked`.
2. Exact lot claims retained through generation.
3. Atomic consumption on save.
4. No source Storage copying.

### Phase 6: Plan versioning and conflict hardening

Plan versioning is required before enabling production transfer and existing-plan claim consumption. It may be implemented earlier if Phase 2 needs it.

Files:

1. `prisma/schema.prisma`
2. `lib/db/planner.ts`
3. `actions/planner-actions.ts`
4. `components/planner/plan-editor.tsx`
5. Plan editor tests.

Deliverables:

1. Every saved-plan mutation sends expected version.
2. Stale autosave returns conflict instead of replacing newer work.
3. UI reloads or presents a conflict recovery action.

### Phase 7: Legacy cleanup

Do this only after production migration totals are verified.

1. Rename legacy storage concepts to planned remainder where useful.
2. Remove legacy household-inventory reads.
3. Keep plan-scoped remainder rows for uncooked batches.
4. Remove obsolete deprecated queries and tests.
5. Do not drop historical data until rollback is no longer needed.

## Test matrix

### Migration tests

1. Older duplicate storage is not imported when a newer matching plan wins.
2. A fully completed newer plan with no remainder suppresses older copies.
3. Multiple cooked batches in the winning plan create separate lots.
4. Different audiences remain separate.
5. Uncooked planned remainder is not imported.
6. Archived recipe inventory is imported and visible.
7. Dry-run performs zero writes.
8. Apply mode is idempotent.

### Repository/action tests

1. Cross-user lot access returns not found.
2. Cross-user recipe, audience, plan, and slot IDs are rejected.
3. Adjustment changes count and audience atomically.
4. Stale lot version returns conflict.
5. Used creates `USED`; discarded creates `DISCARDED`.
6. Removing the full count deletes the lot but preserves the event snapshot.
7. Transfer fills exactly selected empty slots and decrements exactly once.
8. Transfer marks slots rolled over and already cooked.
9. Transfer creates no planned remainder and no grocery ingredients.
10. A stale plan version fails without decrementing the lot.
11. An occupied destination slot fails without decrementing the lot.
12. A transaction failure rolls back plan, lot, and events.

### Cooking conversion tests

1. Partial recipe completion creates no lot.
2. First full completion creates lots for positive planned rows.
3. Repeated autosave creates no duplicate lots.
4. Unchecking after conversion leaves lots unchanged.
5. Plan deletion leaves lots intact.
6. Conversion removes planned remainder from groceries and cooking links.

### Rolling tests

1. Suggestion reports stored and not-cooked counts separately.
2. Stored lots are read across all dates, not only four recent plans.
3. Unfinished counts preserve newest-plan barrier behavior.
4. Provenance caption omits zero portions.
5. Manual re-add has no provenance.
6. Lower totals allocate oldest Storage first according to the specified source rule.
7. Generation performs zero inventory writes.
8. Save consumes only placed claims.
9. Save conflict rolls back the plan.
10. Repeated save/autosave does not consume twice.

### UI tests

1. Sidebar exposes Storage and active state works only on `/storage`.
2. Empty state copy and Meal plan action render.
3. Separate lots with the same recipe render separately.
4. Mobile row retains visible Add to meal plan action.
5. Adjust validates count and audience.
6. Used and Discarded show distinct copy and call distinct actions.
7. Transfer requires quantity to match selected slots.
8. Archived/excluded recipes disable transfer.
9. Conflict refresh keeps dialog open.
10. No test asserts Tailwind or design-system class names.

### Deletion safeguards

1. Recipe deletion is blocked by active lots.
2. Batch-to-non-batch conversion is blocked by active lots.
3. Family-member deletion is blocked by active lot audiences.
4. Archived inventory remains manageable.

## Verification commands

Run focused tests during each phase. At the end of every phase, run the mandatory checks:

```bash
npm run lint-dev && npm run typecheck
```

Before declaring the complete feature ready, run:

```bash
npm test
npm run lint-dev && npm run typecheck
```

If migration or atomic decrement behavior is only mocked, status remains unverified. Add at least one PostgreSQL-backed integration test for conditional decrement, positive-count constraint, and transaction rollback before production rollout.

## Manual acceptance scenarios

1. Cook a batch with three unassigned portions. After autosave, Storage shows one lot with three meals.
2. Add one stored meal to an existing plan. Storage immediately shows two, and the destination slot says Already cooked.
3. Remove that destination slot. Storage remains two because transfer is irreversible in v1.
4. Mark one stored meal used. Storage shows one and no nutrition log is created.
5. Discard the final meal. The row disappears and the discarded event remains persisted.
6. Open Storage in two tabs. Mutate the same lot in both; the stale tab receives a conflict and does not overwrite the new count.
7. Open a plan editor and Storage in two tabs. Transfer into the plan, then allow stale plan autosave; it must conflict rather than remove the transfer.
8. Delete the source plan. The stored lot remains with source date snapshots.
9. Archive a recipe with Storage. The lot remains manageable but cannot be transferred.
10. Try deleting a recipe or family member referenced by Storage. The operation is blocked with actionable copy.

## Out of scope

Do not add these during v1 implementation:

1. Storage activity/history page.
2. Undo.
3. Expiration dates.
4. Fridge/freezer location.
5. Push or email reminders.
6. Nutrition logging from Storage.
7. Ingredient or pantry inventory.
8. Multi-authenticated-user households.
9. Bulk actions.
10. Search or filtering unless real inventory size demonstrates a need.
11. Automatic restoration when a transferred plan slot is removed.
12. Changes to `components/ui/`.

## Definition of done

The feature is done only when all statements are true:

1. The Storage page represents only cooked physical inventory.
2. Inventory survives plan and batch deletion.
3. Quantities can be adjusted, used, discarded, and transferred.
4. Used and discarded are persisted distinctly.
5. Transfers and generated-plan claims decrement inventory atomically.
6. Generation itself is read-only.
7. Repeated saves cannot consume twice.
8. Stale inventory and plan writes return conflicts.
9. Groceries never include ingredients for cooked stored food.
10. Planner suggestions explain `in storage` versus `not cooked` quantities.
11. Migration does not inflate inventory from historical rollover copies.
12. Desktop and mobile flows are usable and keyboard accessible.
13. Focused tests, full test suite, lint, and typecheck pass.
14. Production dry-run totals have been reviewed before applying backfill.
