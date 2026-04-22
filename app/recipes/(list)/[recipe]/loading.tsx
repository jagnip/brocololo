import { RecipeDetailSkeleton } from "@/components/recipes/recipe-detail-skeleton";

export default function Loading() {
  // Keep detail skeleton scoped to the detail route group branch.
  return <RecipeDetailSkeleton />;
}
