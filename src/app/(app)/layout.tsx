import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { getSidebarStats } from "@/lib/sidebar-stats";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stats = await getSidebarStats();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar stats={stats} />
      <div className="flex flex-1 flex-col overflow-auto">
        <MobileNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
