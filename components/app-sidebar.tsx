"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CookingPot,
  UtensilsCrossed,
  ShoppingCart,
  Apple,
  Settings,
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
  const isProgram = pathname.startsWith(ROUTES.plan) || pathname.startsWith(ROUTES.log);
  const isGroceries = pathname.startsWith(ROUTES.groceries);
  const isSettings = pathname.startsWith(ROUTES.settings);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-full flex-col">
        <SidebarMenu className="flex-1">
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
            <SidebarMenuButton asChild isActive={isProgram} tooltip="Meal plan">
              <Link
                href={`${ROUTES.planCurrent}?tab=plan`}
                onClick={() => {
                  if (!isMobile) return;
                  setOpenMobile(false);
                }}
              >
                <UtensilsCrossed />
                <span>Meal plan</span>
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
            <SidebarMenuButton
              asChild
              isActive={isGroceries}
              tooltip="Groceries"
            >
              <Link
                href={ROUTES.groceriesCurrent}
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isSettings}
              tooltip="Settings"
            >
              <Link
                href={ROUTES.settings}
                onClick={() => {
                  if (!isMobile) return;
                  setOpenMobile(false);
                }}
              >
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
    </Sidebar>
  );
}
