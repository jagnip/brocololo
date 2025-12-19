"use client";

import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useRouter } from "next/navigation";

type RecipeDialogProps = {
  recipe: RecipeType;
  open: boolean;
};

export function RecipeDialog({ recipe, open }: RecipeDialogProps) {
  const router = useRouter();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      router.back();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            {recipe.nutrition && (
              <div>
                <h3 className="font-semibold mb-2">Nutrition</h3>
                <div className="flex gap-2 flex-wrap">
                  {recipe.nutrition
                    .split(",")
                    .map((item: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {item.trim()}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {recipe.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {recipe.notes
                    .split("\n")
                    .map((note: string, index: number) => (
                      <li key={index}>{note.trim()}</li>
                    ))}
                </ul>
              </div>
            )}

            {/* Instructions Section */}
            {recipe.instructions && (
              <div>
                <h3 className="font-semibold mb-2">Instructions</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {recipe.instructions
                    .split("\n")
                    .map((instruction: string, index: number) => (
                      <li key={index}>{instruction.trim()}</li>
                    ))}
                </ol>
              </div>
            )}

            {/* Ingredients Section */}
            {recipe.ingredients && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Ingredients</h3>
                  {recipe.portions && (
                    <span className="text-sm text-muted-foreground">
                      {recipe.portions}
                    </span>
                  )}
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {recipe.ingredients
                    .split("\n")
                    .map((ingredient: string, index: number) => (
                      <li key={index}>{ingredient.trim()}</li>
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
