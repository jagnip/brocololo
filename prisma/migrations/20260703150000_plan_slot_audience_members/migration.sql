-- Per-slot cooking audience (who eats each planned meal).
CREATE TABLE "plan_slot_audience_members" (
    "plan_slot_id" TEXT NOT NULL,
    "family_member_id" TEXT NOT NULL,

    CONSTRAINT "plan_slot_audience_members_pkey" PRIMARY KEY ("plan_slot_id","family_member_id")
);

CREATE INDEX "plan_slot_audience_members_family_member_id_idx" ON "plan_slot_audience_members"("family_member_id");

ALTER TABLE "plan_slot_audience_members" ADD CONSTRAINT "plan_slot_audience_members_plan_slot_id_fkey" FOREIGN KEY ("plan_slot_id") REFERENCES "plan_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plan_slot_audience_members" ADD CONSTRAINT "plan_slot_audience_members_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: each slot inherits its parent plan's audience.
INSERT INTO "plan_slot_audience_members" ("plan_slot_id", "family_member_id")
SELECT ps."id", pam."family_member_id"
FROM "plan_slots" ps
INNER JOIN "plan_audience_members" pam ON pam."plan_id" = ps."plan_id";
