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
  type PlannerCriteria,
  type PlannerCriteriaInput,
} from "@/lib/validations/planner";
import { toast } from "sonner";
import { getDefaultDateRange, WeekPicker } from "./date-range-picker";
import { PlanView } from "./plan-view";
import { useState } from "react";
import { PlanInputType } from "@/types/planner";
import { generatePlan, savePlan } from "@/actions/planner-actions";

export function PlannerForm() {
  const [plan, setPlan] = useState<PlanInputType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PlannerCriteriaInput>({
    resolver: zodResolver(plannerCriteriaSchema) as any,
    defaultValues: {
      dateRange: getDefaultDateRange(),
      breakfastHandsOnMax: 15,
      lunchHandsOnMax: 15,
      dinnerHandsOnMax: 25,
    },
  });

  async function onSubmit(values: PlannerCriteriaInput) {
    const result = await generatePlan(
      new Date(values.dateRange.start),
      new Date(values.dateRange.end)
    );

    if (result.type === "error") {
      toast.error(result.message);
      return;
    }

    setPlan(result.plan);
    toast.success("Plan generated");
  }

  async function handleSavePlan(plan: PlanInputType) {
    setIsSaving(true);
    const result = await savePlan(plan);
    setIsSaving(false);
    if (result.type === "error") {
      toast.error(result.message);
      return;
    }
    toast.success("Plan saved");
  }

  return (
    <>
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
      {plan !== null && (
        <>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving}
              onClick={() => handleSavePlan(plan)}
            >
              {isSaving ? "Saving…" : "Save plan"}
            </Button>
          </div>
          <PlanView plan={plan} />
        </>
      )}
    </>
  );
}
