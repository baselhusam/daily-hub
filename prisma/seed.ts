import { prisma } from "../src/lib/prisma";
import { addDays } from "date-fns";
import { getTodayDate } from "../src/lib/dates";
import { toWeekdaysJson } from "../src/lib/weekdays-db";

async function main() {
  await prisma.completionLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.project.deleteMany();

  const today = getTodayDate();

  const dailyHub = await prisma.project.create({
    data: {
      name: "DailyHub",
      description: "Personal productivity dashboard",
      iconKey: "rocket",
      dueDate: addDays(today, 30),
      sortOrder: 0,
    },
  });

  const clientWork = await prisma.project.create({
    data: {
      name: "Client Delivery",
      iconKey: "folder",
      dueDate: addDays(today, 14),
      sortOrder: 1,
    },
  });

  const mediumSeries = await prisma.project.create({
    data: {
      name: "Medium Series",
      iconKey: "newspaper",
      dueDate: addDays(today, 7),
      sortOrder: 2,
    },
  });

  const personalSite = await prisma.project.create({
    data: {
      name: "Personal Site",
      description: "Portfolio and blog refresh",
      iconKey: "globe",
      dueDate: addDays(today, 21),
      sortOrder: 3,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        projectId: dailyHub.id,
        title: "Polish dashboard layout",
        priority: 2,
        dueDate: addDays(today, 3),
      },
      {
        projectId: clientWork.id,
        title: "Reply to client proposal email",
        priority: 3,
        dueDate: addDays(today, 1),
      },
      {
        projectId: mediumSeries.id,
        title: "Draft outline for next Medium post",
        priority: 2,
        dueDate: addDays(today, 5),
      },
      {
        projectId: personalSite.id,
        title: "Update homepage copy",
        priority: 1,
        dueDate: addDays(today, 10),
      },
      {
        title: "Send invoice follow-up",
        priority: 1,
        dueDate: addDays(today, -2),
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
        weekdays: toWeekdaysJson([1, 3, 5]),
        sortOrder: 0,
      },
      {
        title: "Check inbox",
        iconKey: "mail",
        weekdays: toWeekdaysJson([1, 2, 3, 4, 5]),
        sortOrder: 1,
      },
      {
        title: "Plan tomorrow",
        iconKey: "calendar",
        weekdays: toWeekdaysJson([0, 1, 2, 3, 4, 5, 6]),
        sortOrder: 2,
      },
      {
        title: "Deep work block",
        iconKey: "target",
        weekdays: toWeekdaysJson([1, 2, 3, 4, 5]),
        sortOrder: 3,
      },
      {
        title: "Weekend review",
        iconKey: "sun",
        weekdays: toWeekdaysJson([0, 6]),
        sortOrder: 4,
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
        completedOn: today,
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
