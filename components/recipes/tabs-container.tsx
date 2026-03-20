import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { getCategoriesByType } from "@/lib/db/categories";
import { RecipeTabs } from "./tabs";


export async function RecipeTabsContainer() {
  // Fetch all filter category groups in one round-trip batch.
  const [flavourCategories, proteinCategories, typeCategories] = await Promise.all([
    getCategoriesByType("FLAVOUR"),
    getCategoriesByType("PROTEIN"),
    getCategoriesByType("RECIPE_TYPE"),
  ]);

  return (
    <header className="sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <RecipeTabs
            flavourCategories={flavourCategories}
            proteinCategories={proteinCategories}
            typeCategories={typeCategories}
          />
        </div>
        {/* Desktop keeps local action; mobile/tablet action is in the global top bar. */}
        <Button asChild className="hidden lg:inline-flex">
          <Link href={ROUTES.recipeCreate}>
            <Plus className="h-4 w-4" />
            Create recipe
          </Link>
        </Button>
      </div>
    </header>
  );
}
