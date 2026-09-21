"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_NAME, ROUTES } from "@/lib/constants";

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (!isMobile) return;
    setOpenMobile(false);
  };

  const isRecipes = pathname.startsWith(ROUTES.recipes);
  const isIngredients = pathname.startsWith(ROUTES.ingredients);
  const isProgram =
    pathname.startsWith(ROUTES.plan) || pathname.startsWith(ROUTES.log);
  const isGroceries = pathname.startsWith(ROUTES.groceries);
  const isSettings = pathname.startsWith(ROUTES.settings);

  // Manage is the default tab when `tab` is missing or anything other than log.
  const planTab = searchParams.get("tab");
  const isTrackTab = isProgram && planTab === "log";
  const isManageTab = isProgram && !isTrackTab;

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
            {APP_NAME}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="group-data-[collapsible=icon]:items-center">
        <SidebarGroup className="p-4 pt-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isRecipes} tooltip="My recipes">
                <Link href={ROUTES.recipes} onClick={closeMobileSidebar}>
                  <CookingPot />
                  <span>My recipes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Meal plan: parent opens Manage; nested links open Manage or Track. */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isProgram} tooltip="Meal plan">
                <Link
                  href={`${ROUTES.planCurrent}?tab=plan`}
                  onClick={closeMobileSidebar}
                >
                  <UtensilsCrossed />
                  <span>Meal plan</span>
                </Link>
              </SidebarMenuButton>
              {/* Extra top margin so Manage plan isn’t flush under Meal plan. */}
              <SidebarMenuSub className="mt-1.5">
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={isManageTab}>
                    <Link
                      href={`${ROUTES.planCurrent}?tab=plan`}
                      onClick={closeMobileSidebar}
                    >
                      <span>Manage plan</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={isTrackTab}>
                    <Link
                      href={`${ROUTES.planCurrent}?tab=log`}
                      onClick={closeMobileSidebar}
                    >
                      <span>Track plan</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isIngredients}
                tooltip="Ingredients"
              >
                <Link href={ROUTES.ingredients} onClick={closeMobileSidebar}>
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
                <Link href={ROUTES.groceriesCurrent} onClick={closeMobileSidebar}>
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
                <Link href={ROUTES.settings} onClick={closeMobileSidebar}>
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
