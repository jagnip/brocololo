"use client";

import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type RecipeDialogProps = {
  recipe: RecipeType;
};

export default function RecipeDialog({ recipe }: RecipeDialogProps) {
  const router = useRouter();
  const params = useParams();
  const category = params.category as string;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      router.push(`/recipes/${category}/${recipe.slug}`, { scroll: false });
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl mb-4">{recipe.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image Section */}
          <div className="shrink-0 md:w-1/2">
            <div className="overflow-hidden rounded-xl">
              <Image
                src={recipe.photo}
                alt={recipe.name}
                width={500}
                height={500}
                className="w-full h-auto rounded-xl"
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 space-y-6">
            {/* Time and Portion Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge>{recipe["hands-on-time"]}</Badge>
              {recipe.portions && <Badge>{recipe.portions}</Badge>}
            </div>

            {/* Nutrition Section */}
            {recipe.nutrition && recipe.nutrition.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Nutrition</h3>
                <div className="flex gap-2 flex-wrap">
                  {recipe.nutrition.map((item: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
                  {recipe.portions && (
                    <span className="text-sm text-muted-foreground">
                      {recipe.portions} portions
                    </span>
                  )}
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {recipe.ingredients.map(
                    (ingredient: string, index: number) => (
                      <li key={index}>{ingredient}</li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
