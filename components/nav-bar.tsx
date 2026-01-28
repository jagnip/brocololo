"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/recipes", label: "Recipes" },
  { href: "/planner", label: "Planner" },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <NavigationMenu viewport={false} className="max-w-none justify-start">
        <NavigationMenuList className="gap-1 px-4 h-12">
          {navItems.map(({ href, label }) => (
            <NavigationMenuItem key={href}>
              <NavigationMenuLink asChild>
                <Link
                  href={href}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    (pathname === href || pathname.startsWith(href + "/")) &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  {label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
}
