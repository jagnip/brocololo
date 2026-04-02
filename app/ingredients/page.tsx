import { TopbarConfigController } from "@/components/topbar-config";
import { IngredientsPageContainer } from "@/components/ingredients/ingredients-page-container";
import { ROUTES } from "@/lib/constants";

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <TopbarConfigController
        config={{
          actions: [
            {
              id: "create-ingredient",
              label: "Create ingredient",
              href: ROUTES.ingredientCreate,
              variant: "default" as const,
              size: "sm" as const,
            },
          ],
        }}
      />
      <IngredientsPageContainer q={params.q} page={params.page} />
    </div>
  );
}
