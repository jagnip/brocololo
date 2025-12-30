"use client";
import Form from "next/form";
import {
  useRouter,
  useSearchParams,
  useParams,
  usePathname,
} from "next/navigation";
import { useState, useTransition } from "react";
import SearchStatus from "./search-status";
import { X } from "lucide-react";

export default function Search() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = useParams().category as string;
  const pathname = usePathname();
  const searchQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(searchQuery);
  const [isPending, startTransition] = useTransition();

  const handleClear = () => {
    setInputValue("");
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchQuery = e.target.value;

    if (searchQuery) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set("q", searchQuery);
      startTransition(() => {
        router.push(`?${newSearchParams.toString()}`, {
          scroll: false,
        });
      });
    } else {
      startTransition(() => {
        router.push(pathname, {
          scroll: false,
        });
      });
    }
  };

  return (
    <Form
      action=""
      className="relative flex w-full flex-col gap-2 flex-1 min-w-[250px] lg:max-w-[450px]"
      key={activeCategory}
    >
      <div className="relative">
        <input
          autoComplete="off"
          id="search"
          name="q"
          defaultValue={searchQuery}
          className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent pl-10 pr-10 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive [&::-webkit-search-cancel-button]:hidden [&::-ms-clear]:hidden"
          placeholder="Search in recipes..."
          type="search"
          onChange={handleOnChange}
        />
        <SearchStatus searching={isPending} />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-4 w-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </Form>
  );
}
