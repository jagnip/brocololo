"use client";

import { useEffect, useMemo } from "react";
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

const SWEET_SLUG = "sweet";

const TIME_OPTIONS = [
  { value: "lte20", label: "Hands-on <= 20 min" },
  { value: "lte30", label: "Hands-on <= 30 min" },
] as const;

function isValidTimeFilter(value: string | null) {
  return value === "lte20" || value === "lte30";
}

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
  const selectedTime = searchParams.get("time");

  const flavourBySlug = useMemo(
    () => new Map(flavourCategories.map((category) => [category.slug, category])),
    [flavourCategories],
  );
  const selectedFlavour = selectedCategory ? flavourBySlug.get(selectedCategory) ?? null : null;

  const selectedTypeCategory = useMemo(
    () => typeCategories.find((category) => category.slug === selectedType) ?? null,
    [typeCategories, selectedType],
  );
  const visibleTypeCategories = useMemo(() => {
    // Keep recipe type options scoped to chosen flavour when one is selected.
    if (!selectedFlavour) {
      return typeCategories;
    }
    return typeCategories.filter((category) => category.parentId === selectedFlavour.id);
  }, [typeCategories, selectedFlavour]);

  const applyParams = (params: URLSearchParams) => {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const setFlavour = (nextValue: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentType = params.get("type");
    const nextCategorySlug = nextValue ?? "";

    if (!nextCategorySlug) {
      params.delete("category");
    } else {
      params.set("category", nextCategorySlug);
    }

    // Sweet recipes cannot have protein by domain rules, so clear conflict immediately.
    if (nextCategorySlug === SWEET_SLUG) {
      params.delete("protein");
    }

    const nextFlavour = nextCategorySlug
      ? flavourBySlug.get(nextCategorySlug) ?? null
      : null;

    // Keep type selection valid for the next selected flavour.
    if (
      currentType &&
      nextFlavour &&
      !typeCategories.some(
        (category) =>
          category.slug === currentType && category.parentId === nextFlavour.id,
      )
    ) {
      params.delete("type");
    }

    applyParams(params);
  };

  const setProtein = (nextValue: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!nextValue) {
      params.delete("protein");
    } else {
      params.set("protein", nextValue);
    }
    applyParams(params);
  };

  const setType = (nextValue: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!nextValue) {
      params.delete("type");
    } else {
      params.set("type", nextValue);
    }
    applyParams(params);
  };

  const setTime = (nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!nextValue) {
      params.delete("time");
    } else {
      params.set("time", nextValue);
    }
    applyParams(params);
  };

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    // Normalize URL if someone manually sets sweet + protein.
    if (selectedCategory === SWEET_SLUG && selectedProtein) {
      params.delete("protein");
      changed = true;
    }

    // Normalize URL if selected type does not belong to current flavour scope.
    if (
      selectedType &&
      selectedFlavour &&
      selectedTypeCategory &&
      selectedTypeCategory.parentId !== selectedFlavour.id
    ) {
      params.delete("type");
      changed = true;
    }

    // Normalize URL if time value is unsupported.
    if (selectedTime && !isValidTimeFilter(selectedTime)) {
      params.delete("time");
      changed = true;
    }

    if (changed) {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [
    searchParams,
    router,
    pathname,
    selectedCategory,
    selectedProtein,
    selectedType,
    selectedTypeCategory,
    selectedFlavour,
    selectedTime,
  ]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[200px] max-w-[280px]">
        <Select
          value={selectedCategory || ""}
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
      <div className="min-w-[200px] max-w-[280px]">
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
          disabled={selectedCategory === SWEET_SLUG}
        />
      </div>
      <div className="min-w-[220px] max-w-[320px]">
        <SearchableSelect
          options={visibleTypeCategories.map((category) => ({
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
        />
      </div>
      <div className="min-w-[220px] max-w-[300px]">
        <Select value={selectedTime ?? ""} onValueChange={setTime} allowInlineClear>
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
      <SearchInput placeholder="Search recipe names..." />
    </div>
  );
}
