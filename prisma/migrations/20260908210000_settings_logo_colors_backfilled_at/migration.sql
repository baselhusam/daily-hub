-- Marks the one-time backfill that derives a colour from each existing
-- project's logo as done, so it runs once per database and never again.
ALTER TABLE "Settings" ADD COLUMN "logoColorsBackfilledAt" DATETIME;
