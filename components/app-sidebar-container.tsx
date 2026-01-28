import { Suspense } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarSkeleton } from "@/components/app-sidebar-skeleton";
import { getCategoriesByType } from "@/lib/db/categories";
import { getPlans } from "@/lib/db/planner";

async function AppSidebarData() {
  const [categories, plans] = await Promise.all([
    getCategoriesByType("FLAVOUR"),
    getPlans(),
  ]);

  return <AppSidebar categories={categories} plans={plans} />;
}

export function AppSidebarContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Suspense fallback={<AppSidebarSkeleton />}>
        <AppSidebarData />
      </Suspense>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 px-4 border-b">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
