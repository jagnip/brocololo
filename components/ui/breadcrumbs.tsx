"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
    <div className={className}>
      <Breadcrumb>
        <BreadcrumbList>
          {resolvedItems.map((item, index) => {
            const isLast = index === resolvedItems.length - 1;

            return (
              <div key={`${item.label}-${index}`} className="contents">
                <BreadcrumbItem>
                  {isLast || !item.href ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbSeparator /> : null}
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
