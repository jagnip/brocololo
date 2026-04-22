import { RecipesPageSkeleton } from "@/components/recipes/recipes-page-skeleton";

export default function Loading() {
  // Keep list skeleton scoped to the list route group only.
  return <RecipesPageSkeleton />;
}
