import { PrismaClient } from "@prisma/client";
import { getTodayDate } from "../src/lib/dates";

const prisma = new PrismaClient();

async function main() {
  await prisma.completionLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.project.deleteMany();
  await prisma.business.deleteMany();

  const consulting = await prisma.business.create({
    data: {
      name: "Consulting",
      slug: "consulting",
      iconKey: "briefcase",
      color: "#525252",
      sortOrder: 0,
    },
  });

  const content = await prisma.business.create({
    data: {
      name: "Content Studio",
      slug: "content-studio",
      iconKey: "pen-line",
      color: "#737373",
      sortOrder: 1,
    },
  });

  const dailyHub = await prisma.project.create({
    data: {
      businessId: consulting.id,
      name: "DailyHub",
      description: "Personal productivity dashboard",
      iconKey: "rocket",
      sortOrder: 0,
    },
  });

  const clientWork = await prisma.project.create({
    data: {
      businessId: consulting.id,
      name: "Client Delivery",
      iconKey: "folder",
      sortOrder: 1,
    },
  });

  const mediumSeries = await prisma.project.create({
    data: {
      businessId: content.id,
      name: "Medium Series",
      iconKey: "newspaper",
      sortOrder: 0,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        businessId: consulting.id,
        projectId: dailyHub.id,
        title: "Polish dashboard layout",
        priority: 2,
      },
      {
        businessId: consulting.id,
        projectId: clientWork.id,
        title: "Reply to client proposal email",
        priority: 3,
      },
      {
        businessId: content.id,
        projectId: mediumSeries.id,
        title: "Draft outline for next Medium post",
        priority: 2,
      },
      {
        title: "Send invoice follow-up",
        priority: 1,
      },
      {
        title: "Review calendar for the week",
        priority: 0,
      },
    ],
  });

  const dailyTasks = await prisma.dailyTask.createMany({
    data: [
      {
        title: "Publish Medium post",
        iconKey: "newspaper",
        businessId: content.id,
        sortOrder: 0,
      },
      {
        title: "Check inbox",
        iconKey: "mail",
        sortOrder: 1,
      },
      {
        title: "Plan tomorrow",
        iconKey: "calendar",
        sortOrder: 2,
      },
      {
        title: "Deep work block",
        iconKey: "target",
        businessId: consulting.id,
        sortOrder: 3,
      },
    ],
  });

  const firstDaily = await prisma.dailyTask.findFirst({
    where: { title: "Check inbox" },
  });

  if (firstDaily) {
    await prisma.completionLog.create({
      data: {
        entityType: "DAILY_TASK",
        entityId: firstDaily.id,
        completedOn: getTodayDate(),
      },
    });
  }

  console.log(`Seeded ${dailyTasks.count} daily tasks and sample data.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
