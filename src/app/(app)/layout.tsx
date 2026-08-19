import { AppShell } from "@/components/app-shell";
import { getSearchIndex } from "@/lib/search";
import { getSidebarStats } from "@/lib/sidebar-stats";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
