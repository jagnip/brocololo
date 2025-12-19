"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type CategoryNavLinkProps = ComponentProps<typeof Link>;

export function CategoryNavLink({
  href,
  className,
  ...props
}: CategoryNavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const baseStyles =
    "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const activeStyles = "bg-foreground text-background";
  const inactiveStyles = "bg-muted text-muted-foreground hover:bg-muted/80";

  return (
    <Link
      href={href}
      className={cn(
        baseStyles,
        isActive ? activeStyles : inactiveStyles,
        className
      )}
      {...props}
    />
  );
}
