"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SidebarStats } from "@/lib/sidebar-stats";

type AppTopBarProps = {
  stats: SidebarStats;
  onSearchOpen: () => void;
};

const crumbs: Record<string, string> = {
  "/": "Overview",
  "/projects": "Projects",
  "/daily": "Habits",
  "/analytics": "Analytics",
};

export function AppTopBar({
  stats,
  onSearchOpen,
}: AppTopBarProps) {
  const pathname = usePathname();
  const crumb =
    crumbs[pathname] ??
    (pathname === "/" ? "Overview" : pathname.slice(1));

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/86 px-[clamp(14px,2.2vw,26px)] py-[11px] backdrop-blur-[10px]">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[13px] text-faint">DailyHub</span>
        <ChevronRight className="h-3.5 w-3.5 text-hairline" />
        <span className="truncate text-[13px] font-semibold">{crumb}</span>
      </div>
      <div className="min-w-2 flex-1" />
      <button
        type="button"
        onClick={onSearchOpen}
        className="flex max-w-[320px] flex-[0_1_320px] items-center gap-2 rounded-md border border-border bg-paper px-2.5 py-1.5 text-left transition-colors duration-[120ms] hover:border-border-strong"
        aria-label="Search"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-faint" />
        <span className="min-w-0 flex-1 truncate text-[13px] text-faint">
          Search…
        </span>
        <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[11.5px] font-semibold text-faint tabular-nums">
          ⌘K
        </span>
      </button>
      <ThemeToggle />
      <Link
        href="/analytics"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        aria-label="Analytics"
      >
        <BarChart3 className="h-4 w-4" />
      </Link>
      <NotificationBell notifications={stats.notifications} />
    </div>
  );
}

export const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/daily", label: "Habits", icon: CalendarCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/94 px-1.5 pt-1.5 pb-[calc(7px+env(safe-area-inset-bottom))] backdrop-blur-[12px] dh:hidden">
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
            className={
              "relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 transition-colors duration-[120ms] " +
              (isActive ? "text-foreground" : "text-faint hover:text-foreground")
            }
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 h-[2.5px] w-[26px] -translate-x-1/2 rounded-sm bg-signal" />
            )}
            <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 2} />
            <span className="text-[10.5px] font-semibold tracking-[0.01em]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
