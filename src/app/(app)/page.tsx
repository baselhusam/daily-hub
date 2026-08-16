import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <Suspense fallback={null}>
      <DashboardShell data={data} />
    </Suspense>
  );
}
