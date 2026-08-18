import { DailyShell } from "@/components/daily/daily-shell";
import { getDailyPageData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const { dailyTasks } = await getDailyPageData();

  return <DailyShell dailyTasks={dailyTasks} />;
}
