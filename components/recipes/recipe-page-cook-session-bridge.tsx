"use client";

import { useSearchParams } from "next/navigation";
import { RecipePageProvider } from "@/components/context/recipe-page-context";
import type { IngredientType } from "@/types/ingredient";
import type { RecipeType } from "@/types/recipe";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { ReactNode } from "react";

type RecipePageCookSessionBridgeProps = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  familyMembers: FamilyMemberRow[];
  availableLogDateKeys: string[];
  /** Server-parsed `cook` as a fallback before the client search params hydrate. */
  initialCookParam?: string | null;
  children: ReactNode;
};

/**
 * Reads `?cook=` on the client so soft-navigations always re-hydrate Cooking.
 * Server `initialCookParam` covers the first paint / SSR.
 */
export function RecipePageCookSessionBridge({
  recipe,
  ingredients,
  familyMembers,
  availableLogDateKeys,
  initialCookParam = null,
  children,
}: RecipePageCookSessionBridgeProps) {
  const searchParams = useSearchParams();
  const cookFromUrl = searchParams.get("cook");
  const cookParam = cookFromUrl ?? initialCookParam ?? null;

  return (
    <RecipePageProvider
      key={cookParam ?? "default"}
      recipe={recipe}
      ingredients={ingredients}
      familyMembers={familyMembers}
      availableLogDateKeys={availableLogDateKeys}
      initialCookParam={cookParam}
    >
      {children}
    </RecipePageProvider>
  );
}
