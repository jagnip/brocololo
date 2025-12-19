import type { RecipeType } from "@/types/recipe";
import { Card, CardDescription, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";

type RecipeCardProps = {
  recipe: RecipeType;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Card>
      <CardHeader>
        <img
          src={recipe.photo}
          alt={recipe.name}
          width={300}
          height={300}
          className="w-full h-auto rounded-xl"
        />
        {recipe.name} <Badge>{recipe["hands-on-time"]}</Badge>
      </CardHeader>
    </Card>
  );
}
