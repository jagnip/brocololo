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

  it("exposes Meal plan and Log as peer destinations", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: "Meal plan" })).toHaveAttribute(
      "href",
      ROUTES.planCurrent,
    );
    expect(screen.getByRole("link", { name: "Log" })).toHaveAttribute(
      "href",
      ROUTES.logCurrent,
    );
    expect(screen.queryByRole("link", { name: "Manage plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Track plan" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log" }).closest("ul")).toBe(
      screen.getByRole("link", { name: "Meal plan" }).closest("ul"),
    );
  });

  it("marks only Meal plan active on a plan page", () => {
    navigationState.pathname = "/plan/plan-1";
    navigationState.searchParams = new URLSearchParams("tab=plan");
    renderSidebar();

    expect(screen.getByRole("link", { name: "Meal plan" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("link", { name: "Log" })).not.toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("marks only Log active on a log page", () => {
    navigationState.pathname = ROUTES.logPlanView("plan-1");
    renderSidebar();

    expect(screen.getByRole("link", { name: "Log" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("link", { name: "Meal plan" })).not.toHaveAttribute(
      "data-active",
      "true",
    );
  });
});
