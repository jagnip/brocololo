"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { RecipeType } from "@/types/recipe";
import { calculateNutritionPerPortion } from "@/lib/utils";
import { ImageGallery } from "./image-gallery";

type RecipeDialogProps = {
  recipe: RecipeType;
};

export default function RecipeDialog({ recipe }: RecipeDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
const queryString = searchParams.toString();

  const isOpen = pathname === `/recipes/${recipe.slug}`;

  const handleOpenChange = (isOpen: boolean) => {
    console.log("Open change", isOpen);
    if (!isOpen) {
      router.push(`/recipes/${queryString ? `?${queryString}` : ""}`, { scroll: false });
    }
  };

  const nutrition = calculateNutritionPerPortion(recipe);


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl mb-4">{recipe.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image Section */}
          <div className="shrink-0 md:w-1/2">
            <div className="overflow-hidden rounded-xl">
              <ImageGallery images={recipe.images || []} />
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 space-y-6">
            {/* Time and Portion Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge>Hands-on time: {recipe.handsOnTime} minutes</Badge>
              <Badge>Total time: {recipe.totalTime} minutes</Badge>
            </div>

            {/* Nutrition Section */}
            <div>
              <h3 className="font-semibold mb-2">Nutrition (per portion)</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{nutrition.calories} kcal</Badge>
                <Badge variant="outline">{nutrition.protein}g protein</Badge>
                <Badge variant="outline">{nutrition.fat}g fat</Badge>
                <Badge variant="outline">{nutrition.carbs}g carbs</Badge>
              </div>
            </div>

            {/* Notes Section */}
            {recipe.notes && recipe.notes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {recipe.notes.map((note: string, index: number) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions Section */}
            {recipe.instructions && recipe.instructions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Instructions</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {recipe.instructions.map(
                    (instruction: string, index: number) => (
                      <li key={index}>{instruction}</li>
                    )
                  )}
                </ol>
              </div>
            )}

            {/* Ingredients Section */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Ingredients</h3>
                  {recipe.servings && (
                    <span className="text-sm text-muted-foreground">
                      {recipe.servings} servings
                    </span>
                  )}
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {recipe.ingredients.map((recipeIngredient) => (
                    <li key={recipeIngredient.id}>
                      {recipeIngredient.amount && (
                        <>
                          {recipeIngredient.amount} {recipeIngredient.unit.name}{" "}
                        </>
                      )}{" "}
                      {recipeIngredient.ingredient.name}{" "}
                      {recipeIngredient.additionalInfo && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({recipeIngredient.additionalInfo})
                        </span>
                      )}
                      {recipeIngredient.excludeFromNutrition && (
                        <span className="text-muted-foreground text-xs ml-1">
                          (excluded)
                        </span>
                      )}
                      {recipeIngredient.ingredient.supermarketUrl && (
                        <a
                          href={recipeIngredient.ingredient.supermarketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline text-xs"
                        >
                          🛒
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
