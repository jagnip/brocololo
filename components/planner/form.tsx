"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  plannerCriteriaSchema,
  type PlannerCriteriaInput,
} from "@/lib/validations/planner";
import { toast } from "sonner";
import { getDefaultDateRange, WeekPicker } from "./date-range-picker";

export function PlannerCriteriaForm() {
  const form = useForm<PlannerCriteriaInput>({
    resolver: zodResolver(plannerCriteriaSchema) as any,
    defaultValues: {
      dateRange: getDefaultDateRange(),
      breakfastHandsOnMax: 15,
      lunchHandsOnMax: 15,
      dinnerHandsOnMax: 25,
    },
  });

  function onSubmit(values: PlannerCriteriaInput) {
    console.log("Planner criteria:", values);
    toast.success("Saved planner criteria (not yet used by algorithm)");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col max-w-md"
      >
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <WeekPicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <section className="flex flex-col gap-4 items-start rounded-lg ">
          <h2 className="text-sm font-medium">Breakfast</h2>
          <FormField
            control={form.control}
            name="breakfastHandsOnMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hands-on time max (min)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    value={field.value as number}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>
        <section className="flex flex-col gap-4 items-start rounded-lg ">
          <h2 className="text-sm font-medium">Lunch</h2>
          <FormField
            control={form.control}
            name="lunchHandsOnMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hands-on time max (min)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    value={field.value as number}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>
        <section className="flex flex-col gap-4 items-start rounded-lg ">
          <h2 className="text-sm font-medium">Dinner</h2>
          <FormField
            control={form.control}
            name="dinnerHandsOnMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hands-on time max (min)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    value={field.value as number}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>
        <Button type="submit" className="w-max">
          Find meals
        </Button>
      </form>
    </Form>
  );
}
