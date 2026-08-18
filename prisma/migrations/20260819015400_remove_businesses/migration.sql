-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_businessId_fkey";
ALTER TABLE "Task" DROP CONSTRAINT "Task_businessId_fkey";
ALTER TABLE "DailyTask" DROP CONSTRAINT "DailyTask_businessId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "businessId";
ALTER TABLE "Task" DROP COLUMN "businessId";
ALTER TABLE "DailyTask" DROP COLUMN "businessId";

-- DropTable
DROP TABLE "Business";
