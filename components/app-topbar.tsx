"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTopbar } from "@/components/topbar/topbar-context";

export function AppTopbar() {
  const { config } = useTopbar();

  return (
    <header className="flex h-14 items-center border-b px-4 sticky top-0 bg-background z-10">
      <SidebarTrigger className="lg:hidden" />
      <div className="ml-auto flex items-center gap-2">
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
