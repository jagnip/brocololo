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
    <SidebarProvider>
      <TopbarProvider>
        <Suspense fallback={<AppSidebarSkeleton />}>
          <AppSidebar />
        </Suspense>
        <SidebarInset className="min-w-0 bg-background">
          <AppTopbar />
          {/* min-w-0: flex child must shrink so wide chip rows don't cause page horizontal scroll */}
          <main className="min-w-0 bg-background">{children}</main>
        </SidebarInset>
      </TopbarProvider>
    </SidebarProvider>
  );
}
