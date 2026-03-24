"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/constants";

export function AppTopbar() {
  const pathname = usePathname();
  const isRecipesListPage = pathname === ROUTES.recipes;
  const isRecipeCreatePage = pathname === ROUTES.recipeCreate;
  const isRecipeEditPage = pathname.startsWith(ROUTES.recipes) && pathname.endsWith("/edit");
  const isRecipeDetailPage =
    pathname.startsWith(`${ROUTES.recipes}/`) && !isRecipeCreatePage && !isRecipeEditPage;
  const recipeSlug = isRecipeDetailPage ? pathname.split("/").filter(Boolean)[1] : null;

  return (
    <header className="flex h-14 items-center border-b px-4 sticky top-0 bg-background z-10">
      <SidebarTrigger className="lg:hidden" />
      {isRecipesListPage ? (
        <Button asChild size="sm" className="ml-auto">
          <Link href={ROUTES.recipeCreate}>
            Create recipe
          </Link>
        </Button>
      ) : null}
      {isRecipeDetailPage && recipeSlug ? (
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`${pathname}?addToLog=1`}>Add to log</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={ROUTES.recipeEdit(recipeSlug)}>Edit recipe</Link>
          </Button>
        </div>
      ) : null}
    </header>
  );
}
