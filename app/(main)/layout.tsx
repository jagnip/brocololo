import { Suspense } from "react";
import { AppSidebarContainer } from "@/components/app-sidebar-container";
import { RedirectToast } from "@/components/redirect-toast";

// App shell (sidebar + top bar) for all authenticated routes in (main).
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppSidebarContainer>{children}</AppSidebarContainer>
      <Suspense fallback={null}>
        <RedirectToast />
      </Suspense>
    </>
  );
}
