"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { IngredientIcon } from "@/components/ingredient-icon";
import { ROUTES } from "@/lib/constants";
import { getIngredientTitleParts } from "@/lib/ingredients/format";
import type {
  IngredientsPageData,
  IngredientsPageItem,
} from "@/lib/db/ingredients";

type IngredientsInfiniteListProps = {
  initialData: IngredientsPageData;
  q?: string;
};

function IngredientRow({ ingredient }: { ingredient: IngredientsPageItem }) {
  const title = getIngredientTitleParts(ingredient);

  return (
    <li className="p-4">
      {/* Let each row use the full container width while keeping nutrition aligned right. */}
      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IngredientIcon icon={ingredient.icon} name={ingredient.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">
                {title.name}
                {title.descriptor ? (
                  <span className="text-muted-foreground">
                    {" "}
                    {title.descriptor}
                  </span>
                ) : null}
                {title.brand ? ` ${title.brand}` : null}
              </p>
              <Link
                href={ROUTES.ingredientEdit(ingredient.slug)}
                aria-label={`Edit ${ingredient.name}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Category: {ingredient.category.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Slug: {ingredient.slug}
            </p>
            {ingredient.supermarketUrl && (
              <a
                href={ingredient.supermarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Supermarket link
              </a>
            )}
          </div>
        </div>

        <div className="shrink-0 text-xs">
          {/* Show nutrition details clearly per ingredient. */}
          <p className="font-medium mb-1">Nutrition (per 100g)</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
            <span>Calories</span>
            <span>{ingredient.calories}</span>
            <span>Protein</span>
            <span>{ingredient.proteins}g</span>
            <span>Fat</span>
            <span>{ingredient.fats}g</span>
            <span>Carbs</span>
            <span>{ingredient.carbs}g</span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        {/* Show exact conversion values as grams per unit. */}
        <p className="text-xs font-medium mb-1">Conversions</p>
        {ingredient.unitConversions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No conversions configured
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {ingredient.unitConversions.map((uc) => (
              <li
                key={`${ingredient.id}-${uc.unitId}`}
                className="text-xs rounded bg-muted px-2 py-1"
              >
                1 {uc.unit.name} = {uc.gramsPerUnit} g
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function IngredientsInfiniteList({
  initialData,
  q,
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
    // Search changes remount the server data; replace the list instead of appending stale rows.
    requestRef.current?.abort();
    requestRef.current = null;
    isLoadingRef.current = false;
    setItems(initialData.items);
    setPage(initialData.page);
    setTotalPages(initialData.totalPages);
    setIsLoading(false);
    setError(null);
  }, [initialData, q]);

  useEffect(() => {
    return () => {
      // Avoid updating state after navigating away during an in-flight page fetch.
      requestRef.current?.abort();
    };
  }, []);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    params.set("page", String(page + 1));
    return `/api/ingredients?${params.toString()}`;
  }, [page, q]);

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
      <div className="rounded-lg border">
        <ul className="divide-y">
          {items.map((ingredient) => (
            <IngredientRow key={ingredient.id} ingredient={ingredient} />
          ))}

          {items.length === 0 && (
            <li className="p-6 text-sm text-muted-foreground">
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
