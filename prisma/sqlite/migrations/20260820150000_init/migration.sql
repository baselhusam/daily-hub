-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconKey" TEXT NOT NULL DEFAULT 'folder',
    "logoUrl" TEXT,
    "color" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dueDate" DATETIME,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "displayName" TEXT NOT NULL DEFAULT 'You',
    "role" TEXT NOT NULL DEFAULT 'Operator',
    "workspaceName" TEXT NOT NULL DEFAULT 'Personal HQ',
    "showStreaks" BOOLEAN NOT NULL DEFAULT true,
    "nudgeDays" INTEGER NOT NULL DEFAULT 7
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL DEFAULT 'check',
    "logoUrl" TEXT,
    "weekdays" TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CompletionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "completedOn" DATETIME NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minutes" INTEGER,
    "note" TEXT
);

-- CreateIndex
CREATE INDEX "CompletionLog_completedOn_idx" ON "CompletionLog"("completedOn");

-- CreateIndex
CREATE INDEX "CompletionLog_completedAt_idx" ON "CompletionLog"("completedAt");

-- CreateIndex
CREATE INDEX "CompletionLog_entityType_entityId_idx" ON "CompletionLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionLog_entityType_entityId_completedOn_key" ON "CompletionLog"("entityType", "entityId", "completedOn");

-- Seed default settings
INSERT INTO "Settings" ("id", "displayName", "role", "workspaceName", "showStreaks", "nudgeDays")
VALUES ('default', 'You', 'Operator', 'Personal HQ', 1, 7);
