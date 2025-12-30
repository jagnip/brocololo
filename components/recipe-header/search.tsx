"use client";
import { cn } from "@/lib/utils";
import Form from "next/form";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTransition } from "react";
import SearchStatus from "./search-status";

export default function Search() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const activeTab = params.category as string;

  const defaultValue = searchParams.get("q") || "";

  const [isPending, startTransition] = useTransition();

  return (
    <Form
      action=""
      className="relative flex w-full flex-col gap-2 sm:w-fit"
      key={activeTab}
    >
      <div className="relative">
        <input
          autoComplete="off"
          id="search"
          name="q"
          defaultValue={defaultValue}
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
          )}
          placeholder="Search in recipes..."
          type="search"
          onChange={(e) => {
            const newSearchParams = new URLSearchParams(
              searchParams.toString()
            );
            newSearchParams.set("q", e.target.value);
            startTransition(() => {
              router.push(`?${newSearchParams.toString()}`, {
                scroll: false,
              });
            });
          }}
        />
        <SearchStatus searching={isPending} />
      </div>
    </Form>
  );
}
