"use client";

import { useFieldArray, useForm } from "react-hook-form";
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
  type PlannerCriteriaInputType,
} from "@/lib/validations/planner";
import { toast } from "sonner";
import { getDefaultDateRange, WeekPicker } from "./date-range-picker";
import { PlanView } from "./plan-view";
import { useEffect, useState } from "react";
import { PlanInputType } from "@/types/planner";
import { generatePlan, savePlan } from "@/actions/planner-actions";
import { getDaysInRange, formatDayLabel } from "@/lib/utils";
import { HANDS_ON_DEFAULTS } from "@/lib/constants";

export function PlannerForm() {
  const [plan, setPlan] = useState<PlanInputType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PlannerCriteriaInputType>({
    resolver: zodResolver(plannerCriteriaSchema) as any,
    defaultValues: {
      dateRange: getDefaultDateRange(),
      handsOnTime: [],
    },
  });

  async function onSubmit(values: PlannerCriteriaInputType) {
    const result = await generatePlan(
      new Date(values.dateRange.start),
      new Date(values.dateRange.end),
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

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "handsOnTime",
  });

  const dateRange = form.watch("dateRange");

  useEffect(() => {
    if (!dateRange?.start || !dateRange?.end) return;
    const days = getDaysInRange(
      new Date(dateRange.start),
      new Date(dateRange.end),
    );
    replace(
      days.map((d) => {
        const defaults = HANDS_ON_DEFAULTS[d.getDay()];
        return {
          date: d.toLocaleDateString("en-CA"),
          breakfastMax: defaults.breakfast,
          lunchMax: defaults.lunch,
          dinnerMax: defaults.dinner,
        };
      }),
    );
  }, [dateRange?.start, dateRange?.end]);

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
          {fields.length > 0 && (
            <div className="flex flex-col gap-4 mt-4">
              {fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {formatDayLabel(new Date(fieldItem.date))}
                  </span>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name={`handsOnTime.${index}.breakfastMax`}
                      render={({ field: { value, ...field } }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs text-muted-foreground">
                            Breakfast
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min={1}
                              placeholder="∞"
                              value={(value as number | null) ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`handsOnTime.${index}.lunchMax`}
                      render={({ field: { value, ...field } }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs text-muted-foreground">
                            Lunch
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min={1}
                              placeholder="∞"
                              value={(value as number | null) ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`handsOnTime.${index}.dinnerMax`}
                      render={({ field: { value, ...field } }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs text-muted-foreground">
                            Dinner
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min={1}
                              placeholder="∞"
                              value={(value as number | null) ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button type="submit" className="w-max mt-4">
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
