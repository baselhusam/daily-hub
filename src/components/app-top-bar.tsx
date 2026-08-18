"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarCheck,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Search,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SidebarStats } from "@/lib/sidebar-stats";

type AppTopBarProps = {
  stats: SidebarStats;
  search: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

const crumbs: Record<string, string> = {
  "/": "Overview",
  "/projects": "Projects",
  "/daily": "Habits",
  "/analytics": "Analytics",
};

export function AppTopBar({
  stats,
  search,
  onSearchChange,
  searchInputRef,
}: AppTopBarProps) {
  const pathname = usePathname();
  const crumb =
    crumbs[pathname] ??
    (pathname === "/" ? "Overview" : pathname.slice(1));

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white/86 px-[clamp(14px,2.2vw,26px)] py-[11px] backdrop-blur-[10px] dark:bg-background/86">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[13px] text-faint">Dashboard</span>
        <ChevronRight className="h-3.5 w-3.5 text-[#C7C6C2]" />
        <span className="truncate text-[13px] font-semibold">{crumb}</span>
      </div>
      <div className="min-w-2 flex-1" />
      <div className="flex max-w-[320px] flex-[0_1_320px] items-center gap-2 rounded-md border border-[#EDEDEC] bg-paper px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-faint" />
        <input
          ref={searchInputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks…"
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-faint"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="grid h-[19px] w-[19px] place-items-center rounded bg-hover text-xs text-muted-foreground"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <span className="shrink-0 rounded border border-[#EDEDEC] bg-paper px-1.5 py-0.5 text-[11.5px] font-semibold text-faint tabular-nums">
            ⌘K
          </span>
        )}
      </div>
      <ThemeToggle />
      <Link
        href="/analytics"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-[#D3D2CF] hover:text-foreground"
        aria-label="Analytics"
      >
        <BarChart3 className="h-4 w-4" />
      </Link>
      <Link
        href="/daily"
        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-[#D3D2CF] hover:text-foreground"
        aria-label="Habits"
      >
        <Bell className="h-4 w-4" />
        {stats.hasNudges && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background bg-signal" />
        )}
      </Link>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-foreground text-xs font-semibold text-background">
        {stats.settings.displayName.slice(0, 1).toUpperCase()}
      </span>
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
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-white/94 px-1.5 pt-1.5 pb-[calc(7px+env(safe-area-inset-bottom))] backdrop-blur-[12px] dh:hidden dark:bg-background/94">
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
            className="relative flex flex-col items-center gap-1.5 py-2 text-foreground"
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 h-[2.5px] w-[26px] -translate-x-1/2 rounded-sm bg-signal" />
            )}
            <Icon className="h-[19px] w-[19px]" />
            <span className="text-[11.5px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
