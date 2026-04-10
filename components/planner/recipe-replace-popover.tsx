"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Plus } from "lucide-react";
import { RecipeType } from "@/types/recipe";
import { cn } from "@/lib/utils";

type RecipeReplacePopoverProps = {
  currentRecipeId: string;
  recipes: RecipeType[];
  onReplace: (recipe: RecipeType) => void;
  buttonClassName?: string;
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  buttonSize?: React.ComponentProps<typeof Button>["size"];
  triggerContent?: React.ReactNode;
};

export function RecipeReplacePopover({
  currentRecipeId,
  recipes,
  onReplace,
  buttonClassName,
  buttonVariant = "outline",
  buttonSize = "icon",
  triggerContent,
}: RecipeReplacePopoverProps) {
  const [open, setOpen] = useState(false);
  const isEmpty = !currentRecipeId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={buttonVariant}
          size={buttonSize}
          className={cn(buttonClassName)}
        >
          {triggerContent ?? (isEmpty ? <Plus className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" side="right" align="start" sideOffset={8}>
        <Command shouldFilter>
          <CommandInput placeholder="Search recipes..." />
          <CommandList className="max-h-56">
            <CommandEmpty>No recipes found.</CommandEmpty>
            <CommandGroup>
              {recipes
                .filter((r) => r.id !== currentRecipeId)
                .map((recipe) => (
                  <CommandItem
                    key={recipe.id}
                    value={recipe.name}
                    onSelect={() => {
                      onReplace(recipe);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{recipe.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {recipe.handsOnTime} min
                      </span>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
