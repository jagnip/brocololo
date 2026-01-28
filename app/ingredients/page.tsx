import { IngredientsPageContainer } from "@/components/ingredients/ingredients-page-container";

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Keep page thin and delegate data loading to container. */}
      <IngredientsPageContainer q={params.q} page={params.page} />
    </div>
  );
}
