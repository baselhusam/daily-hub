import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardData } from "@/lib/dashboard";
import { getAnalyticsData } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [data, analytics] = await Promise.all([
    getDashboardData(),
    getAnalyticsData(),
  ]);

  return (
    <Suspense fallback={null}>
      <DashboardShell data={data} chartData={analytics.completionsByDay} />
    </Suspense>
  );
}
