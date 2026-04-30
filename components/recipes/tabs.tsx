"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { CategoryType } from "@/types/category";
import { SearchInput } from "../search";
import { SearchableSelect } from "../ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useScrollDirection } from "./use-scroll-direction";
import { useOptimistic, useTransition } from "react";

const TIME_OPTIONS = [
  // Query params are strings; numeric-like strings keep URL and parsing simple.
  { value: "20", label: "Below 20 min" },
  { value: "30", label: "Below 30 min" },
] as const;

export function RecipeTabs({
  mealOccasionCategories,
  proteinCategories,
  typeCategories,
}: {
  mealOccasionCategories: CategoryType[];
  proteinCategories: CategoryType[];
  typeCategories: CategoryType[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  //selects are controlled from the URL
  const selectedOccasion = searchParams.get("occasion") ?? "";
  const selectedProtein = searchParams.get("protein");
  const selectedType = searchParams.get("type");
  const selectedTime = searchParams.get("time") ?? "";

  const [isPending, startTransition] = useTransition();
  const [optimisticOccasion, setOptimisticOccasion] =
    useOptimistic(selectedOccasion);
  const [optimisticProtein, setOptimisticProtein] =
    useOptimistic(selectedProtein);
  const [optimisticType, setOptimisticType] = useOptimistic(selectedType);
  const [optimisticTime, setOptimisticTime] = useOptimistic(selectedTime);


  const direction = useScrollDirection(12);
  const hidden = direction === "down";

  // navigate to the new URL
  const applyParams = (params: URLSearchParams) => {
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };

  //set a query param (or delete it)
  type QueryKey = "occasion" | "protein" | "type" | "time";
  const setQueryParam = (
    key: QueryKey,
    nextValue: string | null | undefined,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!nextValue) {
      params.delete(key);
    } else {
      params.set(key, nextValue);
    }
    applyParams(params);
  };

  const setOccasion = (nextValue: string | null) =>
    setQueryParam("occasion", nextValue);
  const setProtein = (nextValue: string | null) =>
    setQueryParam("protein", nextValue);
  const setType = (nextValue: string | null) =>
    setQueryParam("type", nextValue);
  const setTime = (nextValue: string) => setQueryParam("time", nextValue);

  return (
    <div
      data-pending={isPending}
      className={[
        "sticky top-14 z-5 bg-background transition-transform duration-200",
        hidden ? "-translate-y-full" : "translate-y-0",
      ].join(" ")}
    >
      <div className="grid grid-cols-2 gap-item p-sheet md:grid-cols-3 lg:grid-cols-6">
        <div className="w-full">
          <Select
            value={optimisticOccasion}
            onValueChange={(nextValue) => {
              setOccasion(nextValue || null);
              setOptimisticOccasion(nextValue);
            }}
            allowInlineClear
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Meal occasion" />
            </SelectTrigger>
            <SelectContent align="start">
              {mealOccasionCategories.map((category: CategoryType) => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SearchableSelect
          options={proteinCategories.map((category) => ({
            value: category.slug,
            label: category.name,
          }))}
          value={optimisticProtein}
          onValueChange={(next) => {
            setProtein(next);
            setOptimisticProtein(next);
          }}
          placeholder="Protein"
          searchPlaceholder="Search proteins..."
          emptyLabel="No protein found."
          allowClear
          clearLabel="Clear protein filter"
          className="w-full"
        />

        <SearchableSelect
          options={typeCategories.map((category) => ({
            value: category.slug,
            label: category.name,
          }))}
          value={optimisticType}
          onValueChange={(next) => {
            setType(next);
            setOptimisticType(next);
          }}
          placeholder="Type"
          searchPlaceholder="Search recipe types..."
          emptyLabel="No type found."
          allowClear
          clearLabel="Clear type filter"
          className="w-full"
        />

        <div className="w-full">
          <Select
            value={optimisticTime}
            onValueChange={(next) => {
              setTime(next);
              setOptimisticTime(next);
            }}
            allowInlineClear
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Hands-on time" />
            </SelectTrigger>
            <SelectContent align="start">
              {TIME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SearchInput
          placeholder="Search recipes..."
          className="col-span-2 w-full md:col-span-2 lg:col-span-2"
        />
      </div>
    </div>
  );
}
