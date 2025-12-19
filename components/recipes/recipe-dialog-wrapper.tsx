"use client";

import { useRouter } from "next/navigation";
import { RecipeDialog } from "./recipe-dialog";
import type { RecipeType } from "@/types/recipe";

type RecipeDialogWrapperProps = {
  recipe: RecipeType;
};

export function RecipeDialogWrapper({ recipe }: RecipeDialogWrapperProps) {
  const router = useRouter();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      router.replace("/", { scroll: false });
    }
  };

  return (
    <RecipeDialog recipe={recipe} open={true} onOpenChange={handleOpenChange} />
  );
}
