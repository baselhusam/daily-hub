import { AppShell } from "@/components/app-shell";
import { LogoColorBackfill } from "@/components/projects/logo-color-backfill";
import { ensureDatabaseReady } from "@/lib/prisma";
import { getLogoColorBackfillPlan } from "@/lib/pending-logo-colors";
import { getSearchIndex } from "@/lib/search";
import { getSidebarStats } from "@/lib/sidebar-stats";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDatabaseReady();

  const [stats, searchIndex, logoColorPlan] = await Promise.all([
    getSidebarStats(),
    getSearchIndex(),
    getLogoColorBackfillPlan(),
  ]);

  return (
    <>
      <AppShell stats={stats} searchIndex={searchIndex}>
        {children}
      </AppShell>
      <LogoColorBackfill plan={logoColorPlan} />
    </>
  );
}
