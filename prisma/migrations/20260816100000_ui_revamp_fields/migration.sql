-- AlterTable
ALTER TABLE "Task" ADD COLUMN "estimatedMinutes" INTEGER;

-- AlterTable
ALTER TABLE "CompletionLog" ADD COLUMN "minutes" INTEGER;

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dueDate" DATE,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "displayName" TEXT NOT NULL DEFAULT 'You',
    "role" TEXT NOT NULL DEFAULT 'Operator',
    "workspaceName" TEXT NOT NULL DEFAULT 'Personal HQ',
    "showStreaks" BOOLEAN NOT NULL DEFAULT true,
    "nudgeDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default settings
INSERT INTO "Settings" ("id", "displayName", "role", "workspaceName", "showStreaks", "nudgeDays")
VALUES ('default', 'You', 'Operator', 'Personal HQ', true, 7)
ON CONFLICT ("id") DO NOTHING;
