"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTopbar } from "@/components/context/topbar-context";
import {
  Breadcrumbs,
  type BreadcrumbsItem,
} from "@/components/ui/breadcrumbs";

/** Routes where the shell expects a page to register top bar breadcrumbs (see TopbarConfig). */
function pathnameExpectsBreadcrumbs(pathname: string): boolean {
  if (pathname === "/recipes" || pathname.startsWith("/recipes/")) return true;
  if (pathname === "/ingredients" || pathname.startsWith("/ingredients/"))
    return true;
  if (pathname.startsWith("/plan")) return true;
  if (pathname.startsWith("/groceries")) return true;
  return false;
}

function BreadcrumbRowSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-2" aria-hidden>
      <Skeleton className="h-4 w-20 shrink-0 rounded-sm" />
      <Skeleton className="h-4 w-3 shrink-0 rounded-sm" />
      <Skeleton className="h-4 w-32 max-w-[40%] shrink rounded-sm" />
    </div>
  );
}

function TopbarBreadcrumbs({ items }: { items: BreadcrumbsItem[] }) {
  return (
    <Breadcrumbs
      items={items}
      className="min-w-0 [&_[data-slot=breadcrumb-list]]:flex-nowrap [&_[data-slot=breadcrumb-list]]:overflow-hidden [&_[data-slot=breadcrumb-page]]:truncate [&_[data-slot=breadcrumb-link]]:max-w-[min(40vw,12rem)] [&_[data-slot=breadcrumb-link]]:truncate"
    />
  );
}

export function AppTopbar() {
  const { config } = useTopbar();
  const pathname = usePathname();
  const isRecipeDetailRoute = /^\/recipes\/[^/]+$/.test(pathname);
  const isRecipesIndexRoute = pathname === "/recipes";
  const isRecipeCreateRoute = pathname === "/recipes/create";
  const isRecipeEditRoute = /^\/recipes\/[^/]+\/edit$/.test(pathname);
  const isLogDetailRoute = /^\/log\/[^/]+$/.test(pathname);
  const isIngredientsIndexRoute = pathname === "/ingredients";
  const isIngredientCreateRoute = pathname === "/ingredients/create";
  const isIngredientEditRoute = /^\/ingredients\/[^/]+\/edit$/.test(pathname);
  const isPlanDetailRoute = /^\/plan\/(?!current$)(?!create$)[^/]+$/.test(
    pathname,
  );
  const isPlanCreateRoute = pathname === "/plan/create";
  const isGroceriesPlanDetailRoute =
    /^\/groceries\/(?!current$)[^/]+$/.test(pathname);
  const isGroceriesPlanEditRoute = /^\/groceries\/[^/]+\/edit$/.test(pathname);
  const shouldShowRecipeTopbarSkeleton = isRecipeDetailRoute && !config;
  const shouldShowRecipesIndexTopbarSkeleton = isRecipesIndexRoute && !config;
  const shouldShowRecipeCreateTopbarSkeleton = isRecipeCreateRoute && !config;
  const shouldShowRecipeEditTopbarSkeleton = isRecipeEditRoute && !config;
  const shouldShowLogTopbarSkeleton = isLogDetailRoute && !config;
  const shouldShowIngredientsTopbarSkeleton =
    isIngredientsIndexRoute && !config;
  const shouldShowIngredientCreateTopbarSkeleton =
    isIngredientCreateRoute && !config;
  const shouldShowIngredientEditTopbarSkeleton =
    isIngredientEditRoute && !config;
  const shouldShowPlanTopbarSkeleton = isPlanDetailRoute && !config;
  const shouldShowPlanCreateTopbarSkeleton = isPlanCreateRoute && !config;
  const shouldShowGroceriesPlanTopbarSkeleton =
    isGroceriesPlanDetailRoute && !config;
  const shouldShowGroceriesPlanEditTopbarSkeleton =
    isGroceriesPlanEditRoute && !config;

  const hasBreadcrumbs = Boolean(
    config?.breadcrumbs && config.breadcrumbs.length > 0,
  );
  const showBreadcrumbSkeleton =
    pathnameExpectsBreadcrumbs(pathname) && !hasBreadcrumbs;

  const breadcrumbItems = useMemo(
    () => (hasBreadcrumbs ? (config?.breadcrumbs ?? []) : []),
    [config?.breadcrumbs, hasBreadcrumbs],
  );

  // z-20: stay above page controls that use z-10 (e.g. log card remove buttons) while scrolling.
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="shrink-0 lg:hidden" />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          {showBreadcrumbSkeleton ? <BreadcrumbRowSkeleton /> : null}
          {!showBreadcrumbSkeleton && hasBreadcrumbs ? (
            <Suspense fallback={<BreadcrumbRowSkeleton />}>
              <TopbarBreadcrumbs items={breadcrumbItems} />
            </Suspense>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          {shouldShowRecipeTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </>
          ) : null}
          {shouldShowRecipesIndexTopbarSkeleton ? (
            <Skeleton className="h-9 w-28 rounded-md" />
          ) : null}
          {shouldShowRecipeCreateTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </>
          ) : null}
          {shouldShowRecipeEditTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </>
          ) : null}
          {shouldShowLogTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-48 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </>
          ) : null}
          {shouldShowIngredientsTopbarSkeleton ? (
            <Skeleton className="h-9 w-44 rounded-md" />
          ) : null}
          {shouldShowIngredientCreateTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </>
          ) : null}
          {shouldShowIngredientEditTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </>
          ) : null}
          {shouldShowPlanTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-48 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </>
          ) : null}
          {shouldShowPlanCreateTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </>
          ) : null}
          {shouldShowGroceriesPlanTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-36 rounded-md sm:w-48" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </>
          ) : null}
          {shouldShowGroceriesPlanEditTopbarSkeleton ? (
            <>
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </>
          ) : null}
          {config?.badge ? (
            <Badge variant={config.badge.variant ?? "outline"}>
              {config.badge.label}
            </Badge>
          ) : null}
          {config?.rightContent ?? null}
          {config?.actions?.map((action) => {
            const variant = action.variant ?? "default";
            const size = action.size ?? "sm";
            const content =
              action.size === "icon" && action.icon ? action.icon : action.label;

            if (action.href) {
              return (
                <Button
                  key={action.id}
                  asChild
                  variant={variant}
                  size={size}
                  aria-label={action.ariaLabel}
                  aria-busy={action.ariaBusy}
                  disabled={action.disabled}
                >
                  <Link href={action.href}>{content}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={action.id}
                variant={variant}
                size={size}
                onClick={action.onClick}
                aria-label={action.ariaLabel}
                aria-busy={action.ariaBusy}
                disabled={action.disabled}
              >
                {content}
              </Button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
