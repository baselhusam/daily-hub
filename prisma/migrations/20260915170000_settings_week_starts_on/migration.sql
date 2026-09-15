-- Which day the week starts on: 1 = Monday (the previous hardcoded default),
-- 0 = Sunday. Read by the week-in-review, habits-kept and calendar views.
ALTER TABLE "Settings" ADD COLUMN "weekStartsOn" INTEGER NOT NULL DEFAULT 1;
