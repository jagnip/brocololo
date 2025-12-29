"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Command, CommandInput } from "../ui/command";
import Form from "next/form";

export default function RecipeSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const activeCategory = params.category as string;

  const searchQuery = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  return (
    <Form action="" className="flex items-center" >
      <Command className="rounded-lg border md:min-w-[450px]">
        <CommandInput
          placeholder="Search recipe..."
          className="h-9"
          value={inputValue}
          onValueChange={(value) => {
            const newSearchParams = new URLSearchParams(
              searchParams.toString()
            );
            newSearchParams.set("q", value);
            startTransition(() => {
              router.push(`?${newSearchParams.toString()}`, {
                scroll: false,
              });
            });
          }}
        />
      </Command>
    </Form>
  );
}
