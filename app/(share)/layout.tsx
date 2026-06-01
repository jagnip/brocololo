import type { ReactNode } from "react";

/** Minimal shell for public share pages (no app sidebar). */
export default function ShareLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
