import { RecipesPageSkeleton } from "@/components/recipes/recipes-page-skeleton";

export default function Loading() {
  // Reuse the same combined skeleton used by page Suspense.
  return <RecipesPageSkeleton />;
}
