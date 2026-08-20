import { AppShell } from "@/components/app-shell";
import { ensureDatabaseReady } from "@/lib/prisma";
import { getSearchIndex } from "@/lib/search";
import { getSidebarStats } from "@/lib/sidebar-stats";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDatabaseReady();

  const [stats, searchIndex] = await Promise.all([
    getSidebarStats(),
    getSearchIndex(),
  ]);

  return (
    <AppShell stats={stats} searchIndex={searchIndex}>
      {children}
    </AppShell>
  );
}
