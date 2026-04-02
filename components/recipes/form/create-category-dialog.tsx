"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createRecipeCategoryAction } from "@/actions/category-actions";
import {
  CategoryType as CategoryTypeEnum,
  createRecipeCategorySchema,
  type CreateRecipeCategoryInput,
} from "@/lib/validations/category";
import type { CategoryType } from "@/types/category";

type CreateCategoryDialogProps = {
  onCreated: (category: CategoryType) => void;
};

export function CreateCategoryDialog({ onCreated }: CreateCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateRecipeCategoryInput>({
    resolver: zodResolver(createRecipeCategorySchema),
    defaultValues: {
      flavourSlug: "savoury",
      kind: CategoryTypeEnum.PROTEIN,
      name: "",
    },
  });

  const selectedFlavour = form.watch("flavourSlug");
  const isSweetFlavour = selectedFlavour === "sweet";
  const selectedKind = form.watch("kind");

  const allowedKinds = useMemo(
    () =>
      isSweetFlavour
        ? [CategoryTypeEnum.RECIPE_TYPE]
        : [CategoryTypeEnum.PROTEIN, CategoryTypeEnum.RECIPE_TYPE],
    [isSweetFlavour],
  );

  async function onSubmit(values: CreateRecipeCategoryInput) {
    setIsSubmitting(true);
    const result = await createRecipeCategoryAction(values);
    setIsSubmitting(false);

    if (result.type === "error") {
      toast.error(result.message);
      return;
    }

    // Push newly created category into recipe form immediately.
    onCreated(result.category as CategoryType);
    toast.success(`Created category: ${result.category.name}`);
    setOpen(false);
    form.reset({
      flavourSlug: values.flavourSlug,
      kind: values.flavourSlug === "sweet" ? CategoryTypeEnum.RECIPE_TYPE : values.kind,
      name: "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="default">
          Add category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription>
            Add a missing category without leaving the recipe form.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              // Prevent parent recipe form submission when saving category.
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit(onSubmit)(event);
            }}
          >
            <FormField
              control={form.control}
              name="flavourSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flavour</FormLabel>
                  <FormControl>
                    <div className="flex gap-2" role="radiogroup" aria-label="Flavour">
                      {(["savoury", "sweet"] as const).map((flavour) => {
                        const checked = field.value === flavour;
                        return (
                          <Button
                            key={flavour}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            variant={checked ? "default" : "outline"}
                            onClick={() => {
                              field.onChange(flavour);
                              // Keep kind valid if user switches to sweet.
                              if (flavour === "sweet") {
                                form.setValue("kind", CategoryTypeEnum.RECIPE_TYPE, {
                                  shouldValidate: true,
                                });
                              }
                            }}
                          >
                            {flavour === "savoury" ? "Savoury" : "Sweet"}
                          </Button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category kind</FormLabel>
                  <FormControl>
                    <div className="flex gap-2" role="radiogroup" aria-label="Category kind">
                      {allowedKinds.map((kind) => {
                        const checked = selectedKind === kind;
                        return (
                          <Button
                            key={kind}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            variant={checked ? "default" : "outline"}
                            onClick={() => field.onChange(kind)}
                          >
                            {kind === CategoryTypeEnum.PROTEIN ? "Protein" : "Type"}
                          </Button>
                        );
                      })}
                      {isSweetFlavour && (
                        <Button type="button" variant="outline" disabled>
                          Protein
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter category name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
