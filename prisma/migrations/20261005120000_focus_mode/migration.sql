-- Focus mode: a project or task the user wants front and centre for the next
-- few days. Both columns are nullable, so existing rows start out of focus.
ALTER TABLE "Project" ADD COLUMN "focusedAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "focusUntil" DATETIME;
ALTER TABLE "Task" ADD COLUMN "focusedAt" DATETIME;
ALTER TABLE "Task" ADD COLUMN "focusUntil" DATETIME;
