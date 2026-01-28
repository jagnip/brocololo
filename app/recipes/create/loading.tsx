import { RecipeFormSkeleton } from "@/components/recipes/recipe-form-skeleton";

export default function Loading() {
  // Overrides parent recipes loading to match create form route.
  return <RecipeFormSkeleton />;
}
