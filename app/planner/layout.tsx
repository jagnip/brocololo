import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getPlans } from "@/lib/db/planner";
import { PlannerSidebar } from "@/components/planner/planner-sidebar";

export default async function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const plans = await getPlans();

  return (
    <SidebarProvider className="min-h-[calc(100svh-3rem)]">
      <PlannerSidebar plans={plans} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 px-4 border-b">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
