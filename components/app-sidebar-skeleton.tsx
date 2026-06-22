import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebarSkeleton() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-4 p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Skeleton className="size-10 shrink-0 rounded-md group-data-[collapsible=icon]:size-8" />
          <Skeleton className="h-6 w-20 rounded-sm group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent className="group-data-[collapsible=icon]:items-center">
        <SidebarGroup className="p-4 pt-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center">
            {Array.from({ length: 5 }).map((_, index) => (
              <SidebarMenuItem key={`primary-${index}`}>
                <div className="flex h-9 items-center gap-2 rounded-md px-2 py-2.5 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
                  <Skeleton className="size-4 shrink-0 rounded-sm" />
                  <Skeleton
                    className="h-4 rounded-sm group-data-[collapsible=icon]:hidden"
                    style={{ width: `${Math.max(56, 84 - index * 8)}%` }}
                  />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
        <div className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 group-data-[collapsible=icon]:justify-center">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1 rounded-sm group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
