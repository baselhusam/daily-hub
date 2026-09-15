import { DailyShell } from "@/components/daily/daily-shell";
import { getHabitsPageData } from "@/lib/habits-page";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const data = await getHabitsPageData();

  return <DailyShell data={data} />;
}
