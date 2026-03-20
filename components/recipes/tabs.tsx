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

const TIME_OPTIONS = [
  { value: "lte20", label: "Below 20 min" },
  { value: "lte30", label: "Below 30 min" },
] as const;

const SWEET_SLUG = "sweet";

export function RecipeTabs({
  flavourCategories,
  proteinCategories,
  typeCategories,
}: {
  flavourCategories: CategoryType[];
  proteinCategories: CategoryType[];
  typeCategories: CategoryType[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedCategory = searchParams.get("category") ?? "";
  const selectedProtein = searchParams.get("protein");
  const selectedType = searchParams.get("type");
  const selectedTime = searchParams.get("time") ?? "";

  const isSweet = selectedCategory === SWEET_SLUG;

  const applyParams = (params: URLSearchParams) => {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  type QueryKey = "category" | "protein" | "type" | "time";
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

  const setFlavour = (nextValue: string | null) =>
    setQueryParam("category", nextValue);
  const setProtein = (nextValue: string | null) =>
    setQueryParam("protein", nextValue);
  const setType = (nextValue: string | null) =>
    setQueryParam("type", nextValue);
  const setTime = (nextValue: string) => setQueryParam("time", nextValue);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      <div className="w-full">
        <Select
          value={selectedCategory}
          onValueChange={(nextValue) => setFlavour(nextValue || null)}
          allowInlineClear
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Flavour" />
          </SelectTrigger>
          <SelectContent align="start">
            {flavourCategories.map((category: CategoryType) => (
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
        value={selectedProtein}
        onValueChange={setProtein}
        placeholder="Protein"
        searchPlaceholder="Search proteins..."
        emptyLabel="No protein found."
        allowClear
        clearLabel="Clear protein filter"
        disabled={isSweet}
        className="w-full"
      />

      <SearchableSelect
        options={typeCategories.map((category) => ({
          value: category.slug,
          label: category.name,
        }))}
        value={selectedType}
        onValueChange={setType}
        placeholder="Type"
        searchPlaceholder="Search recipe types..."
        emptyLabel="No type found."
        allowClear
        clearLabel="Clear type filter"
        className="w-full"
      />

      <div className="w-full">
        <Select value={selectedTime} onValueChange={setTime} allowInlineClear>
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
  );
}
