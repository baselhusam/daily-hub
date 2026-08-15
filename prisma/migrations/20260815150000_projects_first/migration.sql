-- AlterTable: make project businessId optional, add logoUrl and dueDate
ALTER TABLE "Project" ALTER COLUMN "businessId" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "dueDate" DATE;

-- AlterTable: add logoUrl and weekdays to DailyTask
ALTER TABLE "DailyTask" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "DailyTask" ADD COLUMN "weekdays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[];

-- AlterTable: change foreign key on Project.businessId to SET NULL on delete
ALTER TABLE "Project" DROP CONSTRAINT "Project_businessId_fkey";
ALTER TABLE "Project" ADD CONSTRAINT "Project_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
