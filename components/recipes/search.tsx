import { SearchIcon, XIcon } from "lucide-react"

import { FieldGroup, Label } from "@/components/ui/field"
import {
  SearchField,
  SearchFieldClear,
  SearchFieldInput,
} from "@/components/ui/searchfield"
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function SearchInput() {

const DEBOUNCE_MS = 1300;

  const searchParams = useSearchParams();
  const router = useRouter();

  const [value, setValue] = useState(() => searchParams.get("q") ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams.get("q")]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      const trimmed = value.trim();
      const currentQ = searchParams.get("q") ?? "";
      if ((trimmed || null) === (currentQ || null)) return;

      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      router.push(`/recipes?${params.toString()}`);
      timeoutRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, searchParams]);

  return (
      <SearchField className="max-w-[400px]" value={value}
      onChange={setValue}>
      <FieldGroup>
        <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
        <SearchFieldInput placeholder="Search recipe names..." />
        <SearchFieldClear>
          <XIcon aria-hidden className="size-4" />
        </SearchFieldClear>
      </FieldGroup>
    </SearchField>
  )
}