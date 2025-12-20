"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecipeDialog } from "./recipe-dialog";
import type { RecipeType } from "@/types/recipe";

type RecipeDialogWrapperProps = {
  recipe: RecipeType;
};

export function RecipeDialogWrapper({ recipe }: RecipeDialogWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const categoryParam = searchParams.get("category");
      const url = categoryParam ? `/?category=${categoryParam}` : "/";
      router.replace(url, { scroll: false });
    }
  };

  return (
    <RecipeDialog recipe={recipe} open={true} onOpenChange={handleOpenChange} />
  );
}
