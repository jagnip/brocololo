import { GroceriesPlanContainer } from "@/components/groceries/groceries-plan-container";

export default async function GroceriesPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Keep page thin; container handles fetching and notFound logic */}
      <GroceriesPlanContainer planId={planId} />
    </div>
  );
}
