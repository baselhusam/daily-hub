-- DropForeignKey
ALTER TABLE "CompletionLog" DROP CONSTRAINT "daily_completion";

-- CreateIndex
CREATE INDEX "CompletionLog_entityType_entityId_idx" ON "CompletionLog"("entityType", "entityId");
