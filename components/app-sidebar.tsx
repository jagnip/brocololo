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
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
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
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-4 p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:p-2">
        {/* NomNom-style logo block from mockup sidebar header */}
        <Link
          href={ROUTES.recipes}
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-rose-lg group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:shadow-xs">
            <CookingPot className="size-5 group-data-[collapsible=icon]:size-4" />
          </div>
          <span className="type-h2 whitespace-nowrap text-card-foreground tracking-tight group-data-[collapsible=icon]:hidden">
            NomNom
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="group-data-[collapsible=icon]:items-center">
        <SidebarGroup className="p-4 pt-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isRecipes} tooltip="My recipes">
                <Link
                  href={ROUTES.recipes}
                  onClick={() => {
                    if (!isMobile) return;
                    setOpenMobile(false);
                  }}
                >
                  <CookingPot />
                  <span>My recipes</span>
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
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
        <SidebarUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
