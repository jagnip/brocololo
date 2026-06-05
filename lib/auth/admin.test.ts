import { afterEach, describe, expect, it } from "vitest";
import { isAdmin } from "./admin";

describe("isAdmin", () => {
  afterEach(() => {
    delete process.env.ADMIN_CLERK_IDS;
  });

  it("returns true when clerk id is listed", () => {
    process.env.ADMIN_CLERK_IDS = "user_admin,user_other";
    expect(isAdmin("user_admin")).toBe(true);
  });

  it("returns false for unknown clerk ids", () => {
    process.env.ADMIN_CLERK_IDS = "user_admin";
    expect(isAdmin("user_regular")).toBe(false);
  });

  it("returns false when env var is unset", () => {
    expect(isAdmin("user_admin")).toBe(false);
  });
});
