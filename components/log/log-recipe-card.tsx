import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";

type LogRecipeCardProps = {
  title: string;
  slug: string | null;
  imageUrl: string | null;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  onClick?: () => void;
};

export function LogRecipeCard({
  title,
  slug,
  imageUrl,
  calories,
  proteins,
  fats,
  carbs,
  onClick,
}: LogRecipeCardProps) {
  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-sm transition-shadow" : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={title}
          width={600}
          height={360}
          className="w-full h-auto rounded-t-xl"
        />
      )}
      <CardHeader>
        {slug && !onClick ? (
          <Link href={ROUTES.recipe(slug)} className="hover:underline">
            <CardTitle>{title}</CardTitle>
          </Link>
        ) : (
          <CardTitle>{title}</CardTitle>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline">{calories.toFixed(0)} kcal</Badge>
          <Badge variant="outline">{proteins.toFixed(1)}g protein</Badge>
          <Badge variant="outline">{fats.toFixed(1)}g fat</Badge>
          <Badge variant="outline">{carbs.toFixed(1)}g carbs</Badge>
        </div>
      </CardHeader>
    </Card>
  );
}
