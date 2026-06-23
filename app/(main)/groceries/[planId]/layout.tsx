import type { ReactNode } from "react";
import { GroceriesTopbar } from "@/components/groceries/groceries-topbar";
import { GroceriesTopbarStateProvider } from "@/components/groceries/groceries-topbar-state-context";

export default async function GroceriesPlanLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <GroceriesTopbarStateProvider>
      <GroceriesTopbar planId={planId} />
      {children}
    </GroceriesTopbarStateProvider>
  );
}
