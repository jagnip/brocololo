"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, CalendarDays } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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

export function PlannerSidebar({ plans }: { plans: PlanSummary[] }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="top-12 h-[calc(100svh-3.5rem)]">
      <SidebarHeader>
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
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
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
      </SidebarContent>
    </Sidebar>
  );
}
