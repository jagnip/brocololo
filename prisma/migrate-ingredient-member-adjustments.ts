/**
 * Backfill RecipeIngredientMemberAdjustment from legacy appliesToEveryone + memberTargets.
 *
 * Usage:
 *   npx tsx prisma/migrate-ingredient-member-adjustments.ts --env dev
 *   npx tsx prisma/migrate-ingredient-member-adjustments.ts --env dev --execute
 *   npx tsx prisma/migrate-ingredient-member-adjustments.ts --env prod --execute
 */
import "dotenv/config";
import { prisma } from "../lib/db/index";
import { RecipeIngredientAdjustmentKind } from "@/src/generated/enums";

type FamilyMemberRef = {
  id: string;
  name: string;
  isSelf: boolean;
  sortOrder: number;
};

type LegacyIngredientRow = {
  id: string;
  recipeId: string;
  groupId: string | null;
  position: number;
  ingredientId: string;
  unitId: string | null;
  amount: number | null;
  appliesToEveryone: boolean;
  additionalInfo: string | null;
  memberTargets: { familyMemberId: string }[];
  ingredient: { slug: string };
};

type RecipeBundle = {
  id: string;
  slug: string;
  servings: number;
  audienceMembers: { familyMemberId: string }[];
  ingredients: LegacyIngredientRow[];
};

type AdjustmentCreate = {
  recipeIngredientId: string;
  familyMemberId: string;
  kind: RecipeIngredientAdjustmentKind;
  ingredientId?: string | null;
  amount?: number | null;
  unitId?: string | null;
  additionalInfo?: string | null;
};

type MigrationPlan = {
  adjustments: AdjustmentCreate[];
  toDelete: Set<string>;
  batchUpdates: Map<string, number>;
  logs: string[];
};

function parseArgs(): { env: "dev" | "prod"; execute: boolean } {
  const envArg =
    process.argv.find((arg) => arg.startsWith("--env="))?.split("=")[1] ??
    (process.argv.includes("--env")
      ? process.argv[process.argv.indexOf("--env") + 1]
      : "dev");
  if (envArg !== "dev" && envArg !== "prod") {
    console.error("Pass --env dev or --env prod");
    process.exit(1);
  }
  return { env: envArg, execute: process.argv.includes("--execute") };
}

function findNelson(members: FamilyMemberRef[]): FamilyMemberRef | undefined {
  return (
    members.find((m) => m.name.toLowerCase() === "nelson" && !m.isSelf) ??
    members.find((m) => !m.isSelf && m.sortOrder === 1)
  );
}

function findJagoda(members: FamilyMemberRef[]): FamilyMemberRef | undefined {
  return (
    members.find((m) => m.isSelf) ??
    members.find((m) => m.name.toLowerCase() === "jagoda")
  );
}

function targetIds(row: LegacyIngredientRow): string[] {
  return row.memberTargets.map((t) => t.familyMemberId);
}

function isNelsonOnly(row: LegacyIngredientRow, nelsonId: string): boolean {
  const ids = targetIds(row);
  return ids.length === 1 && ids[0] === nelsonId;
}

function isJagodaOnly(row: LegacyIngredientRow, jagodaId: string): boolean {
  const ids = targetIds(row);
  return ids.length === 1 && ids[0] === jagodaId;
}

function perPersonAmount(batch: number | null, servings: number): number | null {
  if (batch == null || servings <= 0) return null;
  return batch / servings;
}

function rowById(
  recipe: RecipeBundle,
  rowId: string,
): LegacyIngredientRow | undefined {
  return recipe.ingredients.find((row) => row.id === rowId);
}

function upsertModify(
  plan: MigrationPlan,
  baseRowId: string,
  jagodaId: string,
  source: LegacyIngredientRow,
  amountOverride?: number | null,
): void {
  plan.adjustments = plan.adjustments.filter(
    (adj) =>
      !(
        adj.recipeIngredientId === baseRowId &&
        adj.familyMemberId === jagodaId
      ),
  );
  plan.adjustments.push({
    recipeIngredientId: baseRowId,
    familyMemberId: jagodaId,
    kind: RecipeIngredientAdjustmentKind.MODIFY,
    ingredientId: source.ingredientId,
    amount: amountOverride ?? source.amount,
    unitId: source.unitId,
    additionalInfo: source.additionalInfo,
  });
}

function clearSkipsForMember(
  plan: MigrationPlan,
  baseRowId: string,
  familyMemberId: string,
): void {
  plan.adjustments = plan.adjustments.filter(
    (adj) =>
      !(
        adj.recipeIngredientId === baseRowId &&
        adj.familyMemberId === familyMemberId &&
        adj.kind === RecipeIngredientAdjustmentKind.SKIP
      ),
  );
}

function markDelete(plan: MigrationPlan, rowId: string, reason: string): void {
  plan.toDelete.add(rowId);
  plan.logs.push(`  [delete] ${rowId} (${reason})`);
}

function buildAutoMigrationPlan(
  recipe: RecipeBundle,
  nelsonId: string,
  jagodaId: string,
): MigrationPlan {
  const audienceIds = recipe.audienceMembers.map((m) => m.familyMemberId);
  const targeted = recipe.ingredients.filter((row) => !row.appliesToEveryone);
  const plan: MigrationPlan = {
    adjustments: [],
    toDelete: new Set<string>(),
    batchUpdates: new Map<string, number>(),
    logs: [],
  };
  const pairedJagoda = new Set<string>();
  const pairedNelson = new Set<string>();

  const nelsonRows = targeted.filter((row) => isNelsonOnly(row, nelsonId));
  const jagodaRows = targeted.filter((row) => isJagodaOnly(row, jagodaId));

  const jagodaByGroup = new Map<string | null, LegacyIngredientRow[]>();
  for (const row of jagodaRows) {
    const list = jagodaByGroup.get(row.groupId) ?? [];
    list.push(row);
    jagodaByGroup.set(row.groupId, list);
  }

  for (const nelsonRow of nelsonRows) {
    const candidates = (jagodaByGroup.get(nelsonRow.groupId) ?? []).filter(
      (row) => !pairedJagoda.has(row.id),
    );
    const jagodaRow = candidates.shift();
    if (!jagodaRow) continue;

    pairedNelson.add(nelsonRow.id);
    pairedJagoda.add(jagodaRow.id);
    plan.toDelete.add(jagodaRow.id);
    upsertModify(
      plan,
      nelsonRow.id,
      jagodaId,
      jagodaRow,
      perPersonAmount(jagodaRow.amount, recipe.servings),
    );
    plan.logs.push(
      `  [pair] keep ${nelsonRow.id} → MODIFY jagoda from ${jagodaRow.id}`,
    );
  }

  for (const row of targeted) {
    if (
      pairedNelson.has(row.id) ||
      pairedJagoda.has(row.id) ||
      plan.toDelete.has(row.id)
    ) {
      continue;
    }
    if (isNelsonOnly(row, nelsonId)) {
      for (const memberId of audienceIds) {
        if (memberId === nelsonId) continue;
        plan.adjustments.push({
          recipeIngredientId: row.id,
          familyMemberId: memberId,
          kind: RecipeIngredientAdjustmentKind.SKIP,
        });
      }
      plan.logs.push(`  [nelson-only] keep ${row.id}, SKIP others`);
      continue;
    }
    if (isJagodaOnly(row, jagodaId)) {
      plan.toDelete.add(row.id);
      plan.logs.push(`  [jagoda-only] delete ${row.id}`);
      continue;
    }
    if (targetIds(row).includes(nelsonId)) {
      for (const memberId of audienceIds) {
        if (targetIds(row).includes(memberId)) continue;
        plan.adjustments.push({
          recipeIngredientId: row.id,
          familyMemberId: memberId,
          kind: RecipeIngredientAdjustmentKind.SKIP,
        });
      }
      plan.logs.push(`  [multi] keep ${row.id} with SKIP for non-targets`);
    } else {
      plan.toDelete.add(row.id);
      plan.logs.push(`  [multi] delete ${row.id} (no nelson in targets)`);
    }
  }

  return plan;
}

/** Prod manual overrides from docs/person-specific-ingredients-migration.md */
function applyProdOverrides(
  recipe: RecipeBundle,
  plan: MigrationPlan,
  jagodaId: string,
): void {
  const patch = (message: string) => plan.logs.push(`  [prod] ${message}`);

  switch (recipe.slug) {
    case "autumn-chicken-traybake": {
      const baseId = "cmmqjw0s2000e2im749e0w2qj";
      const jagodaRow = rowById(recipe, "cmmi446tx0029kfm7k1qir94s");
      if (jagodaRow) {
        upsertModify(plan, baseId, jagodaId, jagodaRow, 1);
        patch("Jagoda chicken MODIFY amount = 1 piece");
      }
      break;
    }
    case "avocado-on-toast": {
      markDelete(plan, "cmnm194x4000ioijjq15o7dz6", "drop egg white");
      break;
    }
    case "bolognese": {
      const beefBase = rowById(recipe, "cmmtgcwor000a04jrc0w0e40d");
      const chickenRow = rowById(recipe, "cmmtgcwoc000904jriar73frf");
      const spaghettiBase = rowById(recipe, "cmmtgcwt2000l04jr3jecez69");
      const penneRow = rowById(recipe, "cmmtgcwtg000m04jry9vnp9em");
      if (beefBase) {
        plan.batchUpdates.set(beefBase.id, 800);
        clearSkipsForMember(plan, beefBase.id, jagodaId);
        patch("Beef mince base batch = 800g for everyone");
      }
      if (beefBase && chickenRow) {
        upsertModify(plan, beefBase.id, jagodaId, chickenRow, chickenRow.amount);
        markDelete(plan, chickenRow.id, "merged into beef MODIFY");
      }
      if (spaghettiBase && penneRow) {
        clearSkipsForMember(plan, spaghettiBase.id, jagodaId);
        upsertModify(
          plan,
          spaghettiBase.id,
          jagodaId,
          penneRow,
          perPersonAmount(penneRow.amount, recipe.servings),
        );
        markDelete(plan, penneRow.id, "merged into spaghetti MODIFY");
        patch("Spaghetti default + Jagoda penne MODIFY");
      }
      break;
    }
    case "russian-salad": {
      const tunaBase = rowById(recipe, "cmmmcaul8006nc8m75efq6u2z");
      const tunaBrine = rowById(recipe, "cmmmcauhi006mc8m7dvkkvirt");
      const mayoBase = rowById(recipe, "cmmmcauop006oc8m7rgxvs2ha");
      const yogurtRow = rowById(recipe, "cmmmcaus7006pc8m7qr2fta4e");
      if (tunaBase && tunaBrine) {
        upsertModify(plan, tunaBase.id, jagodaId, tunaBrine, 85);
        patch("Jagoda tuna MODIFY = 85g full batch");
      }
      if (mayoBase && yogurtRow) {
        clearSkipsForMember(plan, mayoBase.id, jagodaId);
        upsertModify(
          plan,
          mayoBase.id,
          jagodaId,
          yogurtRow,
          perPersonAmount(yogurtRow.amount, recipe.servings),
        );
        markDelete(plan, yogurtRow.id, "merged into mayo MODIFY");
        patch("Mayo default + Jagoda greek yogurt MODIFY");
      }
      break;
    }
    case "tuna-sandwich-bake": {
      const tunaBase = rowById(recipe, "cmmmc4tdk006cc8m73u8jxm5d");
      const tunaBrine = rowById(recipe, "cmmmc4ta4006bc8m729235l79");
      if (tunaBase && tunaBrine) {
        upsertModify(plan, tunaBase.id, jagodaId, tunaBrine, 85);
        patch("Jagoda tuna MODIFY = 85g");
      }
      break;
    }
    case "tuna-and-corn-baked-potatoes": {
      const mayoBase = rowById(recipe, "cmmqvm5ad0007b6m7e83iaecr");
      const yogurtRow = rowById(recipe, "cmmqvm56x0006b6m7x4p1b3xy");
      if (mayoBase && yogurtRow) {
        clearSkipsForMember(plan, mayoBase.id, jagodaId);
        upsertModify(
          plan,
          mayoBase.id,
          jagodaId,
          yogurtRow,
          perPersonAmount(yogurtRow.amount, recipe.servings),
        );
        markDelete(plan, yogurtRow.id, "merged into mayo MODIFY");
        patch("Mayo default + Jagoda greek yogurt MODIFY");
      }
      break;
    }
    case "veg-casserole": {
      const creamBase = rowById(recipe, "cmmrxhlxy000604l5ywmg7j7p");
      const yogurtRow = recipe.ingredients.find((row) =>
        row.ingredient.slug.includes("greek-yogurt"),
      );
      if (creamBase && yogurtRow) {
        clearSkipsForMember(plan, creamBase.id, jagodaId);
        upsertModify(
          plan,
          creamBase.id,
          jagodaId,
          yogurtRow,
          perPersonAmount(yogurtRow.amount, recipe.servings) ?? yogurtRow.amount,
        );
        if (!yogurtRow.appliesToEveryone && isJagodaOnly(yogurtRow, jagodaId)) {
          markDelete(plan, yogurtRow.id, "merged into cream MODIFY");
        }
        patch("Single cream default + Jagoda greek yogurt MODIFY");
      }
      break;
    }
    default:
      break;
  }
}

async function loadRecipes(): Promise<RecipeBundle[]> {
  return prisma.recipe.findMany({
    select: {
      id: true,
      slug: true,
      servings: true,
      audienceMembers: { select: { familyMemberId: true } },
      ingredients: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          id: true,
          recipeId: true,
          groupId: true,
          position: true,
          ingredientId: true,
          unitId: true,
          amount: true,
          appliesToEveryone: true,
          additionalInfo: true,
          memberTargets: { select: { familyMemberId: true } },
          ingredient: { select: { slug: true } },
        },
      },
    },
  });
}

async function loadFamilyMembers(
  recipeUserIds: string[],
): Promise<Map<string, FamilyMemberRef[]>> {
  const members = await prisma.familyMember.findMany({
    where: { userId: { in: recipeUserIds } },
    select: {
      id: true,
      name: true,
      isSelf: true,
      sortOrder: true,
      userId: true,
    },
    orderBy: [{ userId: "asc" }, { sortOrder: "asc" }],
  });
  const byUser = new Map<string, FamilyMemberRef[]>();
  for (const member of members) {
    const list = byUser.get(member.userId) ?? [];
    list.push(member);
    byUser.set(member.userId, list);
  }
  return byUser;
}

async function persistPlan(
  recipe: RecipeBundle,
  plan: MigrationPlan,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const [rowId, amount] of plan.batchUpdates) {
      await tx.recipeIngredient.update({
        where: { id: rowId },
        data: { amount },
      });
    }
    for (const adj of plan.adjustments) {
      await tx.recipeIngredientMemberAdjustment.upsert({
        where: {
          recipeIngredientId_familyMemberId: {
            recipeIngredientId: adj.recipeIngredientId,
            familyMemberId: adj.familyMemberId,
          },
        },
        create: adj,
        update: {
          kind: adj.kind,
          ingredientId: adj.ingredientId ?? null,
          amount: adj.amount ?? null,
          unitId: adj.unitId ?? null,
          additionalInfo: adj.additionalInfo ?? null,
        },
      });
    }
    if (plan.toDelete.size > 0) {
      await tx.recipeIngredient.deleteMany({
        where: { id: { in: [...plan.toDelete] } },
      });
    }
    for (const row of recipe.ingredients.filter((r) => r.appliesToEveryone)) {
      await tx.recipeIngredient.update({
        where: { id: row.id },
        data: { appliesToEveryone: true },
      });
    }
  });
}

async function migrateRecipe(
  recipe: RecipeBundle,
  nelsonId: string,
  jagodaId: string,
  env: "dev" | "prod",
  execute: boolean,
): Promise<void> {
  const plan = buildAutoMigrationPlan(recipe, nelsonId, jagodaId);
  if (env === "prod") {
    applyProdOverrides(recipe, plan, jagodaId);
  }
  for (const line of plan.logs) {
    console.log(line);
  }
  if (!execute) return;
  await persistPlan(recipe, plan);
}

async function main() {
  const { env, execute } = parseArgs();
  console.log(
    `${execute ? "EXECUTE" : "DRY RUN"}: ingredient member adjustments (${env})`,
  );

  const recipes = await loadRecipes();
  const userIds = [
    ...new Set(
      (await prisma.recipe.findMany({ select: { userId: true } })).map(
        (r) => r.userId,
      ),
    ),
  ];
  const membersByUser = await loadFamilyMembers(userIds);

  let processed = 0;
  for (const recipe of recipes) {
    const hasTargeted = recipe.ingredients.some((row) => !row.appliesToEveryone);
    if (!hasTargeted) continue;

    const recipeOwner = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      select: { userId: true },
    });
    const members = membersByUser.get(recipeOwner!.userId) ?? [];
    const nelson = findNelson(members);
    const jagoda = findJagoda(members);
    if (!nelson || !jagoda) {
      console.log(`Skip ${recipe.slug}: missing Nelson/Jagoda members`);
      continue;
    }

    console.log(`\n${recipe.slug} (${recipe.ingredients.length} rows)`);
    await migrateRecipe(recipe, nelson.id, jagoda.id, env, execute);
    processed += 1;
  }

  console.log(`\nDone. Recipes with targeted rows processed: ${processed}`);
  if (!execute) {
    console.log("Re-run with --execute to apply.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
