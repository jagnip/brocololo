import type { ReactNode } from "react";
import { GroceriesTopbar } from "@/components/groceries/groceries-topbar";

export default async function GroceriesPlanLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <>
      <GroceriesTopbar planId={planId} />
      {children}
    </>
  );
}
