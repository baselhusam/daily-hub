import { AnalyticsShell } from "@/components/analytics/analytics-shell";
import { getAnalyticsData } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  return <AnalyticsShell data={data} />;
}
