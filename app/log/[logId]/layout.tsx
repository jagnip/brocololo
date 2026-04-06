import type { ReactNode } from "react";
import { LogTopbar } from "@/components/log/log-topbar";

export default async function LogDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ logId: string }>;
}) {
  const { logId } = await params;

  return (
    <>
      <LogTopbar logId={logId} />
      {children}
    </>
  );
}
