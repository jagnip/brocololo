-- Add optional plural unit label for amount-aware UI wording.
ALTER TABLE "units"
ADD COLUMN "name_plural" TEXT;
