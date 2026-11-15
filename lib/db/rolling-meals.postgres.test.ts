import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./index";
import { captureUncapturedPlansForRollingTx } from "./rolling-meals";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1";

afterAll(async () => {
  if (enabled) await prisma.$disconnect();
});

describe.skipIf(!enabled)("rolling meals PostgreSQL integration", () => {
  it("initializes after the default five-second transaction deadline and rolls back fixtures", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    const fixtureId = `integration-${randomUUID()}`;
    const rollback = new Error("intentional fixture rollback");
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({ data: { id: fixtureId, clerkId: fixtureId } });
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${fixtureId} FOR UPDATE`;
        await tx.$executeRaw`SELECT pg_sleep(5.2)`;
        await captureUncapturedPlansForRollingTx(tx, fixtureId);
        expect(await tx.rollingQueueState.findUnique({ where: { userId: fixtureId } })).not.toBeNull();
        throw rollback;
      });
      throw new Error("Fixture transaction unexpectedly committed");
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(await prisma.user.findUnique({ where: { id: fixtureId } })).toBeNull();
  }, 40000);
});
