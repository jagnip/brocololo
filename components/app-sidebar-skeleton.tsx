import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebarSkeleton() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          {Array.from({ length: 4 }).map((_, index) => (
            <SidebarMenuItem key={`primary-${index}`}>
              {/* Keep top-level nav placeholders stable to reduce sidebar shift. */}
              <div className="flex h-8 items-center gap-2 rounded-md px-2">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton
                  className="h-4 rounded-sm"
                  style={{ width: `${Math.max(56, 84 - index * 8)}%` }}
                />
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from({ length: 6 }).map((_, index) => (
                <SidebarMenuItem key={`group-${index}`}>
                  <div className="flex h-8 items-center gap-2 rounded-md px-2">
                    {index % 2 === 0 ? (
                      <Skeleton className="h-4 w-4 rounded-sm" />
                    ) : null}
                    <Skeleton
                      className="h-4 rounded-sm"
                      style={{ width: `${58 + (index % 3) * 12}%` }}
                    />
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
