-- Removes task completion logs left behind by a reopen bug. Reopening a task
-- only deleted the log dated on the day it was reopened, so a task finished on
-- Monday and reopened on Wednesday kept counting as done on Monday.
--
-- A task holds at most one completion at a time, so for every task that still
-- exists:
--   1. a task that is not DONE keeps no logs;
--   2. a DONE task keeps only its latest log.
-- Logs of deleted tasks are history and are left alone, as are habit logs.

DELETE FROM "CompletionLog"
WHERE "entityType" = 'TASK'
  AND "entityId" IN (SELECT "id" FROM "Task" WHERE "status" <> 'DONE');

DELETE FROM "CompletionLog"
WHERE "entityType" = 'TASK'
  AND "entityId" IN (SELECT "id" FROM "Task" WHERE "status" = 'DONE')
  AND EXISTS (
    SELECT 1 FROM "CompletionLog" AS "newer"
    WHERE "newer"."entityType" = 'TASK'
      AND "newer"."entityId" = "CompletionLog"."entityId"
      AND "newer"."completedOn" > "CompletionLog"."completedOn"
  );
