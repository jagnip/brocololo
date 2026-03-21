"use client";

import { Loader2, SearchIcon, XIcon } from "lucide-react"

import { FieldGroup } from "@/components/ui/field"
import {
  SearchField,
  SearchFieldClear,
  SearchFieldInput,
} from "@/components/ui/searchfield"
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect, useTransition } from "react";
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
  debounceMs = 300,
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
  const [isPending, startTransition] = useTransition();

  //runs when URL's value changes – back/forward, opening a shared link etc
  useEffect(() => {
    setValue(currentQueryValue);
  }, [currentQueryValue]);

  useEffect(() => {
    //set a timeout to update the URL after the user stops typing for 500ms (debounceMc)
    timeoutRef.current = setTimeout(() => {
      const trimmed = value.trim();

      //don't do anything if the value is the same as the current value
      if ((trimmed || null) === (currentQueryValue || null)) return;

      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set(queryParam, trimmed);
      } else {
        params.delete(queryParam);
      }

      //resets other params like page for pagination
      //this sends the user to the first page of the results if used
      for (const key of resetParamsOnChange) {
        params.delete(key);
      }

      //in case you need to override the current pathname
      //for example you use search component lives in a layout but the list you case lived on a different page
      const targetPath = pathOverride ?? pathname;

      //from URLSearchParams object to string
      const nextQuery = params.toString();
    
      startTransition(() => { 
        router.push(nextQuery ? `${targetPath}?${nextQuery}` : targetPath);
      });
      timeoutRef.current = null;
    }, debounceMs);

    //clear the old times because the user types again ("don't update the URL in 500ms")
    //the callback is scheduled for 500ms from the last time the user typed
    //when the user stops typing, the callback is executed and the URL is updated
    //but if user types before it gets executed, the old timeout is cleared 
    //because useEffect runs the cleanup from the previous effect and then runs the new effect
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

      <SearchField className={cn(className)} value={value} onChange={setValue} data-pending={isPending}>
        <FieldGroup>
          {isPending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
          )}
          <SearchFieldInput placeholder={placeholder} />

          <SearchFieldClear>
            <XIcon aria-hidden className="size-4" />
          </SearchFieldClear>
        </FieldGroup>
      </SearchField>
   
  );
}