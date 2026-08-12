import { Suspense } from "react";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarSkeleton } from "@/components/app-sidebar-skeleton";
import { AppTopbar } from "@/components/app-topbar";
import { TopbarProvider } from "@/components/context/topbar-context";

export function AppSidebarContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // h-svh: lock the shell to the viewport so only the content pane scrolls.
    <SidebarProvider className="h-svh overflow-hidden">
      <TopbarProvider>
        <Suspense fallback={<AppSidebarSkeleton />}>
          <AppSidebar />
        </Suspense>
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-background">
          <AppTopbar />
          {/* Scrollport below the topbar — page scrollbar starts under sticky chrome. */}
          <div
            data-app-scroll
            className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background [scrollbar-gutter:stable]"
          >
            {children}
          </div>
        </SidebarInset>
      </TopbarProvider>
    </SidebarProvider>
  );
}
