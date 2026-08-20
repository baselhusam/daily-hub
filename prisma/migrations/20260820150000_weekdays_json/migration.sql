-- Convert DailyTask.weekdays from INTEGER[] to JSONB for cross-provider compatibility.
ALTER TABLE "DailyTask" ALTER COLUMN "weekdays" DROP DEFAULT;
ALTER TABLE "DailyTask" ALTER COLUMN "weekdays" TYPE JSONB USING to_jsonb("weekdays");
ALTER TABLE "DailyTask" ALTER COLUMN "weekdays" SET DEFAULT '[0,1,2,3,4,5,6]'::jsonb;
