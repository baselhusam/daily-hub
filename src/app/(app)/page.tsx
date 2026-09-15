import { Suspense } from "react";
import { TodayShell } from "@/components/dashboard/today-shell";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <Suspense fallback={null}>
      <TodayShell data={data} />
    </Suspense>
  );
}
