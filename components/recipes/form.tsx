"use client";     
import { insertRecipeSchema, InsertRecipeType } from "@/lib/validations/recipe";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormLabel, FormField, FormControl, FormItem } from "../ui/form";
import { Input } from "../ui/input";


export default function CreateRecipeForm() {

  const formSchema = insertRecipeSchema;

  const form = useForm<InsertRecipeType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      photo: "",
      instructions: [],
      handsOnTime: 0,
      nutrition: [],
      ingredients: [],
      notes: [],
      portions: 0,
      categories: [],
    },
  });

  function onSubmit(formData: InsertRecipeType) {
    console.log(formData);
    console.log(form.formState.errors);
  }

  return (
  
    <Form {...form} >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="name" render={({ field }) => <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
        </FormItem>} />
      </form>
    </Form>
  );
}
