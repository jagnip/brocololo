import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/lib/constants";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

const navigationState = {
  pathname: "/recipes",
  searchParams: new URLSearchParams(),
};

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => navigationState.searchParams,
}));

vi.mock("@/components/sidebar-user-menu", () => ({
  SidebarUserMenu: () => <div data-testid="sidebar-user-menu" />,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
  );
}

describe("AppSidebar meal plan links", () => {
  beforeEach(() => {
    navigationState.pathname = "/recipes";
    navigationState.searchParams = new URLSearchParams();
  });

  it("exposes Manage plan and Track plan under Meal plan", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "Meal plan" })).toHaveAttribute(
      "href",
      `${ROUTES.planCurrent}?tab=plan`,
    );
    expect(screen.getByRole("link", { name: "Manage plan" })).toHaveAttribute(
      "href",
      `${ROUTES.planCurrent}?tab=plan`,
    );
    expect(screen.getByRole("link", { name: "Track plan" })).toHaveAttribute(
      "href",
      `${ROUTES.planCurrent}?tab=log`,
    );
  });

  it("marks Manage plan active on the plan tab", () => {
    navigationState.pathname = "/plan/plan-1";
    navigationState.searchParams = new URLSearchParams("tab=plan");
    renderSidebar();

    expect(screen.getByRole("link", { name: "Manage plan" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("link", { name: "Track plan" })).not.toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("marks Track plan active on the log tab", () => {
    navigationState.pathname = "/plan/plan-1";
    navigationState.searchParams = new URLSearchParams("tab=log");
    renderSidebar();

    expect(screen.getByRole("link", { name: "Track plan" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("link", { name: "Manage plan" })).not.toHaveAttribute(
      "data-active",
      "true",
    );
  });
});
