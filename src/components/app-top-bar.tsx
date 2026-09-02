"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  FolderKanban,
  Github,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SidebarStats } from "@/lib/sidebar-stats";

type AppTopBarProps = {
  stats: SidebarStats;
  onSearchOpen: () => void;
  onSettingsOpen: () => void;
  collapsed: boolean;
  onToggle: () => void;
  animate?: boolean;
};

export function AppTopBar({
  stats,
  onSearchOpen,
  onSettingsOpen,
  collapsed,
  onToggle,
  animate = true,
}: AppTopBarProps) {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 hidden h-[52px] dh:flex">
        <div
          className={cn(
            "flex h-full items-center justify-center border-r border-border bg-paper",
            animate &&
              "transition-[width,padding] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]",
            collapsed ? "w-[68px] px-1" : "w-64 px-3"
          )}
        >
          <button
            type="button"
            onClick={onSettingsOpen}
            className={cn(
              "flex min-w-0 items-center rounded-md text-left transition-colors duration-[120ms] hover:bg-hover",
              collapsed ? "h-8 w-8 justify-center" : "h-8 gap-2 px-1.5"
            )}
            aria-label="Workspace settings"
            title={stats.settings.workspaceName}
          >
            <BrandMark
              size={collapsed ? 22 : 24}
              className="text-foreground"
            />
            {!collapsed && (
              <span className="max-w-[9.5rem] truncate text-[13.5px] font-semibold tracking-[-0.02em] leading-none">
                {stats.settings.workspaceName}
              </span>
            )}
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-border bg-background pl-2 pr-[clamp(14px,2.2vw,26px)]">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-[120ms] hover:bg-hover hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <div className="min-w-2 flex-1" />
          <button
            type="button"
            onClick={onSearchOpen}
            className="flex max-w-[320px] flex-[0_1_320px] items-center gap-2 rounded-md border border-border bg-paper px-2.5 py-1.5 text-left transition-colors duration-[120ms] hover:border-border-strong"
            aria-label="Search"
            title="Search (⌘K or /)"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-faint" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-faint">
              Find a task…
            </span>
            <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[11.5px] font-semibold text-faint tabular-nums">
              ⌘K
            </span>
          </button>
          <ThemeToggle />
          <NotificationBell notifications={stats.notifications} />
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border bg-card text-muted-foreground shadow-none hover:text-foreground"
          >
            <a
              href="https://github.com/baselhusam/daily-hub"
              target="_blank"
              rel="noreferrer"
              aria-label="View DailyHub on GitHub"
              title="View DailyHub on GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>
    </>
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
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/94 pt-1.5 pr-[max(6px,env(safe-area-inset-right))] pb-[calc(7px+env(safe-area-inset-bottom))] pl-[max(6px,env(safe-area-inset-left))] backdrop-blur-[12px] dh:hidden">
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
            aria-current={isActive ? "page" : undefined}
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
