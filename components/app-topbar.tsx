"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTopbar } from "@/components/context/topbar-context";

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
  const isPlanDetailRoute = /^\/plan\/(?!create$)[^/]+$/.test(pathname);
  const isPlanCreateRoute = pathname === "/plan/create";
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

  // z-20: stay above page controls that use z-10 (e.g. log card remove buttons) while scrolling.
  // `gap-2` between the nav trigger and the controls row matches inner `gap-2` and prevents selects
  // from sitting flush against the icon when the row is cramped (mobile, sidebar closed).
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="shrink-0 lg:hidden" />
      {/* Same as `ml-auto`: group stays right; `flex-1` + `min-w-0` lets selects truncate instead of overlapping the trigger. */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {shouldShowRecipeTopbarSkeleton ? (
          <>
            {/* Mirror only action buttons while detail page topbar config loads. */}
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </>
        ) : null}
        {shouldShowRecipesIndexTopbarSkeleton ? (
          <>
            {/* Mirror recipes index topbar action while config hydrates. */}
            <Skeleton className="h-9 w-28 rounded-md" />
          </>
        ) : null}
        {shouldShowRecipeCreateTopbarSkeleton ? (
          <>
            {/* Mirror create recipe topbar with the single submit action. */}
            <Skeleton className="h-9 w-28 rounded-md" />
          </>
        ) : null}
        {shouldShowRecipeEditTopbarSkeleton ? (
          <>
            {/* Mirror edit recipe topbar: submit action plus delete icon. */}
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </>
        ) : null}
        {shouldShowLogTopbarSkeleton ? (
          <>
            {/* Mirror log topbar: log switcher + person + delete + view-plan icon. */}
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </>
        ) : null}
        {shouldShowIngredientsTopbarSkeleton ? (
          <>
            {/* Mirror “Create ingredient” secondary action while ingredients topbar config hydrates. */}
            <Skeleton className="h-9 w-44 rounded-md" />
          </>
        ) : null}
        {shouldShowIngredientCreateTopbarSkeleton ? (
          <>
            {/* Mirror ingredient/create topbar: single primary submit action. */}
            <Skeleton className="h-9 w-32 rounded-md" />
          </>
        ) : null}
        {shouldShowIngredientEditTopbarSkeleton ? (
          <>
            {/* Mirror ingredient/edit topbar: submit action plus delete icon. */}
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </>
        ) : null}
        {shouldShowPlanTopbarSkeleton ? (
          <>
            {/* Mirror Meal plan topbar: switcher + Create plan text action. */}
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </>
        ) : null}
        {shouldShowPlanCreateTopbarSkeleton ? (
          <>
            {/* Mirror plan/create: Save plan + Find meals while client form mounts. */}
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </>
        ) : null}
        {config?.badge ? (
          <Badge variant={config.badge.variant ?? "outline"}>
            {config.badge.label}
          </Badge>
        ) : null}
        {config?.rightContent ?? null}
        {config?.actions.map((action) => {
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
    </header>
  );
}
