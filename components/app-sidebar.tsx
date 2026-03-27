"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CookingPot,
  UtensilsCrossed,
  ShoppingCart,
  Apple,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/constants";



export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

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
              <Link
                href={ROUTES.recipes}
                onClick={() => {
                  if (!isMobile) return;
                  setOpenMobile(false);
                }}
              >
                <CookingPot />
                <span>Recipes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isPlanner} tooltip="Planner">
              <Link
                href={ROUTES.plan}
                onClick={() => {
                  if (!isMobile) return;
                  setOpenMobile(false);
                }}
              >
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
              <Link
                href={ROUTES.ingredients}
                onClick={() => {
                  if (!isMobile) return;
                  setOpenMobile(false);
                }}
              >
                <Apple />
                <span>Ingredients</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isLog} tooltip="Log">
              <Link
                // Open current log from left-nav quick access.
                href={ROUTES.logCurrent}
                onClick={() => {
                  if (!isMobile) return;
                  setOpenMobile(false);
                }}
              >
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
              <Link
                href={ROUTES.groceries}
                onClick={() => {
                  if (!isMobile) return;
                  setOpenMobile(false);
                }}
              >
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
