"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbQueryBehavior = "none" | "all" | string[];

export type BreadcrumbsItem = {
  label: string;
  href?: string;
  preserveQuery?: BreadcrumbQueryBehavior;
};

type BreadcrumbsProps = {
  items: BreadcrumbsItem[];
  className?: string;
};

function resolveHrefWithQuery(
  href: string,
  sourceParams: URLSearchParams,
  preserveQuery: BreadcrumbQueryBehavior = "none",
) {
  // Keep default breadcrumbs simple: no query params unless explicitly requested.
  if (preserveQuery === "none") {
    return href;
  }

  if (preserveQuery === "all") {
    const query = sourceParams.toString();
    return query ? `${href}?${query}` : href;
  }

  // Preserve only explicitly allowed keys for predictable navigation behavior.
  const nextParams = new URLSearchParams();
  for (const key of preserveQuery) {
    const values = sourceParams.getAll(key);
    for (const value of values) {
      nextParams.append(key, value);
    }
  }

  const query = nextParams.toString();
  return query ? `${href}?${query}` : href;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const searchParams = useSearchParams();

  const resolvedItems = useMemo(() => {
    const paramsSnapshot = new URLSearchParams(searchParams.toString());

    return items.map((item) => {
      if (!item.href) {
        return item;
      }

      return {
        ...item,
        href: resolveHrefWithQuery(
          item.href,
          paramsSnapshot,
          item.preserveQuery ?? "none",
        ),
      };
    });
  }, [items, searchParams]);

  return (
    <div
      className={cn(
        // Single-line row: clip when the header is narrow (mobile); crumbs truncate inside flex items.
        "min-w-0 w-full max-w-full overflow-hidden",
        className,
      )}
    >
      <Breadcrumb className="min-w-0 max-w-full">
        <BreadcrumbList className="min-w-0 max-w-full overflow-hidden">
          {resolvedItems.map((item, index) => {
            const isLast = index === resolvedItems.length - 1;
            const isFirst = index === 0;
            const isMiddle = !isFirst && !isLast;
            const isOnly = resolvedItems.length === 1;

            return (
              <Fragment key={`${item.label}-${index}`}>
                <BreadcrumbItem
                  className={cn(
                    "min-w-0",
                    isOnly && "max-w-full flex-1 basis-0",
                    !isOnly && isFirst && "max-md:max-w-[min(40vw,9rem)] min-w-0 shrink-0",
                    !isOnly && isLast && "min-w-0 flex-1 basis-0",
                    isMiddle &&
                      "max-md:max-w-[min(32vw,7.5rem)] shrink md:max-w-none",
                  )}
                >
                  {isLast || !item.href ? (
                    <BreadcrumbPage className="block min-w-0 truncate">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        href={item.href}
                        className="block min-w-0 truncate"
                      >
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbSeparator /> : null}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
