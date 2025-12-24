import RecipeDialog from "@/components/recipes/recipe-dialog";

type PageProps = {
  params: Promise<{ category: string; recipe: string }>;
};

export default async function RecipePage({ params }: PageProps) {
  const { recipe: recipeSlug } = await params;

  return (
    <div>Recipe Page WIP</div>
  );
}
