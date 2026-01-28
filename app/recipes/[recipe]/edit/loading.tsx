import { RecipeFormSkeleton } from "@/components/recipes/recipe-form-skeleton";

export default function Loading() {
  // Overrides recipes segment loader for edit form route.
  return <RecipeFormSkeleton />;
}
