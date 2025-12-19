import type { RecipeType } from "@/types/recipe";
import Image from "next/image";
import Link from "next/link";
import { Card, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";

type RecipeCardProps = {
  recipe: RecipeType;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader>
          <Image
            src={recipe.photo}
            alt={recipe.name}
            width={300}
            height={300}
            className="w-full h-auto rounded-xl"
          />
          {recipe.name} <Badge>{recipe["hands-on-time"]}</Badge>
        </CardHeader>
      </Card>
    </Link>
  );
}
