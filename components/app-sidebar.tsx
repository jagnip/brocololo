"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  CookingPot,
  UtensilsCrossed,
  ShoppingCart,
  Apple,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { CategoryType } from "@/types/category";
import { ROUTES } from "@/lib/constants";



export function AppSidebar() {
  const pathname = usePathname();

  const isRecipes = pathname.startsWith(ROUTES.recipes);
  const isIngredients = pathname.startsWith(ROUTES.ingredients);
  const isPlanner = pathname.startsWith(ROUTES.plan);
  const isGroceries = pathname.startsWith(ROUTES.groceries);
  const isLog = pathname.startsWith(ROUTES.log);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isRecipes} tooltip="Recipes">
              <Link href={ROUTES.recipes}>
                <CookingPot />
                <span>Recipes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isPlanner} tooltip="Planner">
              <Link href={ROUTES.plan}>
                <UtensilsCrossed />
                <span>Planner</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isIngredients}
              tooltip="Ingredients"
            >
              <Link href={ROUTES.ingredients}>
                <Apple />
                <span>Ingredients</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isLog} tooltip="Log">
              <Link href={ROUTES.log}>
                <CalendarDays />
                <span>Log</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isGroceries}
              tooltip="Groceries"
            >
              <Link href={ROUTES.groceries}>
                <ShoppingCart />
                <span>Groceries</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
    </Sidebar>
  );
}
