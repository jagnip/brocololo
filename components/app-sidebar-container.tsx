import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getCategoriesByType } from "@/lib/db/categories";
import { getPlans } from "@/lib/db/planner";

export async function AppSidebarContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, plans] = await Promise.all([
    getCategoriesByType("FLAVOUR"),
    getPlans(),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar categories={categories} plans={plans} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 px-4 border-b">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
