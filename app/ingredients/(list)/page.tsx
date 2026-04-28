import { TopbarConfigController } from "@/components/topbar-config";
import { IngredientsPageContainer } from "@/components/ingredients/ingredients-page-container";
import { ROUTES } from "@/lib/constants";

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="page-container">
      <TopbarConfigController
        config={{
          actions: [
            {
              id: "create-ingredient",
              label: "Create ingredient",
              href: ROUTES.ingredientCreate,
              variant: "default" as const,
              size: "default" as const,
            },
          ],
        }}
      />
      <IngredientsPageContainer q={params.q} />
    </div>
  );
}
