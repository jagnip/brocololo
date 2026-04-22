import { RecipeFormSkeleton } from "@/components/recipes/recipe-form-skeleton";

export default function Loading() {
  // Keep editor skeleton scoped to edit route only.
  return <RecipeFormSkeleton />;
}
