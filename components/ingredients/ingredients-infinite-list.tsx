"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { IngredientRow } from "@/components/ingredients/ingredient-row";
import type { IngredientsPageData } from "@/lib/db/ingredients";

type IngredientsInfiniteListProps = {
  initialData: IngredientsPageData;
  q?: string;
  // Active category slug from the URL; used to keep paged fetches aligned with the server's first page.
  categorySlug?: string;
};

export function IngredientsInfiniteList({
  initialData,
  q,
  categorySlug,
}: IngredientsInfiniteListProps) {
  const [items, setItems] = useState(() => initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = page < totalPages;

  useEffect(() => {
    // Filter changes (search OR category) remount server data; replace rows instead of appending stale ones.
    requestRef.current?.abort();
    requestRef.current = null;
    isLoadingRef.current = false;
    setItems(initialData.items);
    setPage(initialData.page);
    setTotalPages(initialData.totalPages);
    setIsLoading(false);
    setError(null);
  }, [initialData, q, categorySlug]);

  useEffect(() => {
    return () => {
      // Avoid updating state after navigating away during an in-flight page fetch.
      requestRef.current?.abort();
    };
  }, []);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    // Forward the active category to the API so paged fetches stay consistent with the first page.
    if (categorySlug?.trim()) params.set("category", categorySlug.trim());
    params.set("page", String(page + 1));
    return `/api/ingredients?${params.toString()}`;
  }, [categorySlug, page, q]);

  const loadNextPage = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch(requestUrl, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to load more ingredients.");
      }

      const data = (await response.json()) as IngredientsPageData;

      setItems((currentItems) => {
        // Deduplicate by id in case the observer fires near a request boundary.
        const existingIds = new Set(currentItems.map((item) => item.id));
        const nextItems = data.items.filter((item) => !existingIds.has(item.id));
        return [...currentItems, ...nextItems];
      });
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      setError("We couldn't load more ingredients. Scroll again to retry.");
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [hasMore, requestUrl]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadNextPage();
        }
      },
      {
        // Start loading before the user reaches the end of the visible list.
        rootMargin: "400px 0px",
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadNextPage]);

  return (
    <>
      {/* Pulse only the rendered rows during route transitions (search/category change). */}
      {/* The sentinel + aria-live spinner stay outside so infinite-scroll loads don't double-pulse. */}
      <div className="group-has-[[data-pending='true']]:animate-pulse">
        {/* Each row is now its own bordered card; space them with `gap-item` instead of dividers. */}
        <ul className="flex flex-col gap-item">
          {items.map((ingredient) => (
            <IngredientRow key={ingredient.id} ingredient={ingredient} />
          ))}

          {items.length === 0 && (
            <li className="rounded-md border border-border/60 p-nest text-sm text-muted-foreground">
              No ingredients found.
            </li>
          )}
        </ul>
      </div>

      <div ref={sentinelRef} aria-hidden="true" className="h-1" />

      <div aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
        {isLoading ? (
          <span className="flex justify-center py-4">
            {/* Center the automatic loading indicator without adding visible text. */}
            <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading more ingredients" />
          </span>
        ) : null}
        {error ? <span>{error}</span> : null}
      </div>
    </>
  );
}
