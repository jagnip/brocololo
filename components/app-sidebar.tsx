"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  CookingPot,
  UtensilsCrossed,
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

type PlanSummary = {
  id: string;
  startDate: Date;
  endDate: Date;
};

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

export function AppSidebar({
  categories,
  plans,
}: {
  categories: CategoryType[];
  plans: PlanSummary[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isRecipes = pathname.startsWith("/recipes");
  const isPlanner = pathname.startsWith("/planner");
  const selectedCategory = searchParams.get("category") ?? "";

  const toggleCategory = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedCategory === categorySlug) {
      params.delete("category");
    } else {
      params.set("category", categorySlug);
    }
    router.push(`/recipes?${params.toString()}`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isRecipes}
              tooltip="Recipes"
            >
              <Link href="/recipes">
                <CookingPot />
                <span>Recipes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isPlanner}
              tooltip="Planner"
            >
              <Link href="/planner">
                <UtensilsCrossed />
                <span>Planner</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {isRecipes && (
          <SidebarGroup>
            <SidebarGroupLabel>Recipes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {categories.map((category) => (
                  <SidebarMenuItem key={category.id}>
                    <SidebarMenuButton
                      isActive={selectedCategory === category.slug}
                      tooltip={category.name}
                      onClick={() => toggleCategory(category.slug)}
                    >
                      <span>{category.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isPlanner && (
          <SidebarGroup>
            <SidebarGroupLabel>Planner</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/planner/new"}
                    tooltip="New plan"
                  >
                    <Link href="/planner/new">
                      <CalendarPlus />
                      <span>New plan</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {plans.map((plan) => {
                  const label = formatDateRange(plan.startDate, plan.endDate);
                  return (
                    <SidebarMenuItem key={plan.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/planner/${plan.id}`}
                        tooltip={label}
                      >
                        <Link href={`/planner/${plan.id}`}>
                          <CalendarDays />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
