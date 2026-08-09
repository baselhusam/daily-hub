"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { AnalyticsOverview } from "@/lib/analytics";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

type AppSidebarProps = {
  stats?: Pick<
    AnalyticsOverview,
    "openTasks" | "dailyConsistencyToday" | "completionsThisWeek"
  > | null;
};

export function AppSidebar({ stats }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          DailyHub
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {stats && (
        <div className="space-y-2 border-t p-4">
          <p className="text-xs font-medium text-muted-foreground">Quick stats</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open tasks</span>
              <span className="font-medium">{stats.openTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">This week</span>
              <span className="font-medium">{stats.completionsThisWeek}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily today</span>
              <span className="font-medium">{stats.dailyConsistencyToday}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t p-3">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
