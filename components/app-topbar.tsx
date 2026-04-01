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
  const isLogDetailRoute = /^\/log\/[^/]+$/.test(pathname);
  const shouldShowRecipeTopbarSkeleton = isRecipeDetailRoute && !config;
  const shouldShowRecipesIndexTopbarSkeleton = isRecipesIndexRoute && !config;
  const shouldShowLogTopbarSkeleton = isLogDetailRoute && !config;

  return (
    <header className="flex h-14 items-center border-b px-4 sticky top-0 bg-background z-10">
      <SidebarTrigger className="lg:hidden" />
      <div className="ml-auto flex items-center gap-2">
        {shouldShowRecipeTopbarSkeleton ? (
          <>
            {/* Mirror only action buttons while detail page topbar config loads. */}
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </>
        ) : null}
        {shouldShowRecipesIndexTopbarSkeleton ? (
          <>
            {/* Mirror recipes index topbar action while config hydrates. */}
            <Skeleton className="h-8 w-28 rounded-md" />
          </>
        ) : null}
        {shouldShowLogTopbarSkeleton ? (
          <>
            {/* Mirror “View plan” secondary action while log topbar config hydrates. */}
            <Skeleton className="h-8 w-28 rounded-md" />
          </>
        ) : null}
        {config?.badge ? (
          <Badge variant={config.badge.variant ?? "outline"}>
            {config.badge.label}
          </Badge>
        ) : null}
        {config?.actions.map((action) => {
          const variant = action.variant ?? "default";
          const size = action.size ?? "sm";

          if (action.href) {
            return (
              <Button
                key={action.id}
                asChild
                variant={variant}
                size={size}
                aria-label={action.ariaLabel}
              >
                <Link href={action.href}>{action.label}</Link>
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
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    </header>
  );
}
