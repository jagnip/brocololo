"use client";

import { SearchIcon, XIcon } from "lucide-react"

import { FieldGroup } from "@/components/ui/field"
import {
  SearchField,
  SearchFieldClear,
  SearchFieldInput,
} from "@/components/ui/searchfield"
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  placeholder?: string;
  queryParam?: string;
  debounceMs?: number;
  className?: string;
  pathOverride?: string;
  resetParamsOnChange?: string[];
};

export function SearchInput({
  placeholder = "Search...",
  queryParam = "q",
  debounceMs = 500,
  className,
  pathOverride,
  resetParamsOnChange = ["page"],
}: SearchInputProps) {

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [value, setValue] = useState(() => searchParams.get(queryParam) ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQueryValue = searchParams.get(queryParam) ?? "";

  useEffect(() => {
    setValue(currentQueryValue);
  }, [currentQueryValue]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if ((trimmed || null) === (currentQueryValue || null)) return;

      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set(queryParam, trimmed);
      } else {
        params.delete(queryParam);
      }

      for (const key of resetParamsOnChange) {
        params.delete(key);
      }
      const targetPath = pathOverride ?? pathname;
      const nextQuery = params.toString();
      router.push(nextQuery ? `${targetPath}?${nextQuery}` : targetPath);
      timeoutRef.current = null;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    value,
    searchParams,
    currentQueryValue,
    queryParam,
    resetParamsOnChange,
    pathOverride,
    pathname,
    router,
    debounceMs,
  ]);

  return (
    <SearchField className={cn(className)} value={value}
      onChange={setValue}>
      <FieldGroup>
        <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
        <SearchFieldInput placeholder={placeholder} />
        <SearchFieldClear>
          <XIcon aria-hidden className="size-4" />
        </SearchFieldClear>
      </FieldGroup>
    </SearchField>
  )
}