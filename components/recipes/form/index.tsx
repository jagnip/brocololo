"use client";
import {
  insertRecipeSchema,
  InsertRecipeInputType,
  InsertRecipeOutputType,
} from "@/lib/validations/recipe";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormLabel,
  FormField,
  FormControl,
  FormItem,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { CategoryType } from "@/types/category";
import { Button } from "../../ui/button";
import MultipleSelector from "../../ui/multiselect";
import { createRecipeAction } from "@/actions/recipe-actions";
import { ImageUploader } from "./image-uploader";
import { CategorySelector } from "./category-selector";
import { RecipeType } from "@/types/recipe";

type RecipeFormProps = {
  categories: CategoryType[];
  recipe?: RecipeType;
}

export default function RecipeForm({ categories, recipe }: RecipeFormProps) {
  const formSchema = insertRecipeSchema;

  const form = useForm<InsertRecipeInputType>({
    //Resolver as any to avoid type error at compilation time due to coercion of number to string
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      categories: [],
      photo:
        "",
      handsOnTime: 1,
      portions: 1,
      nutrition: "",
      ingredients: "",
      instructions: "",
      notes: "",
    },
  });

  async function onSubmit(formData: InsertRecipeInputType) {
    // zodResolver already transformed the data, so we can safely assert the type
    const transformed = formData as unknown as InsertRecipeOutputType;
    const result = await createRecipeAction(transformed);

    console.log(result);
    if (result?.type === "error") {
      toast.error(result.message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <CategorySelector
                  value={field.value}
                  onChange={field.onChange}
                  categories={categories}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add photo</FormLabel>
              <FormControl>
                <ImageUploader value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="handsOnTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hands-on time</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={0}
                  value={field.value as number}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="portions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portions</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={0}
                  value={field.value as number}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nutrition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nutrition</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ingredients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ingredients</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
