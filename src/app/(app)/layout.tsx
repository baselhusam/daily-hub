import { AppShell } from "@/components/app-shell";
import { getSidebarStats } from "@/lib/sidebar-stats";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stats = await getSidebarStats();

  return <AppShell stats={stats}>{children}</AppShell>;
}
