"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TopbarOverflowMenuConfig } from "@/components/context/topbar-context";

type TopbarOverflowMenuProps = {
  config: TopbarOverflowMenuConfig;
};

export function TopbarOverflowMenu({ config }: TopbarOverflowMenuProps) {
  const firstDestructiveIndex = config.items.findIndex(
    (item) => item.destructive,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={config.ariaLabel}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {config.items.map((item, index) => {
          const showSeparatorBefore =
            firstDestructiveIndex >= 0 && index === firstDestructiveIndex;

          const menuItem = item.href ? (
            <DropdownMenuItem
              key={item.id}
              asChild
              disabled={item.disabled}
              variant={item.destructive ? "destructive" : "default"}
            >
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={item.id}
              disabled={item.disabled}
              variant={item.destructive ? "destructive" : "default"}
              onSelect={() => item.onSelect?.()}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          );

          if (!showSeparatorBefore) {
            return menuItem;
          }

          return (
            <span key={`${item.id}-group`}>
              <DropdownMenuSeparator />
              {menuItem}
            </span>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
