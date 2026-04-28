import { TopbarConfigController } from "@/components/topbar-config";
import { IngredientsPageContainer } from "@/components/ingredients/ingredients-page-container";
import { ROUTES } from "@/lib/constants";

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
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
      {/* Forward both filter inputs (`q`, `category`) so the server fetches a consistent first page. */}
      <IngredientsPageContainer q={params.q} categorySlug={params.category} />
    </div>
  );
}
