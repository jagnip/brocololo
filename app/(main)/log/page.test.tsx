import { expect, it, vi } from "vitest";
import LogIndexPage from "./page";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

it("opens Log directly rather than the legacy tracking tab", () => {
  LogIndexPage();
  expect(redirect).toHaveBeenCalledWith("/log/current");
});
