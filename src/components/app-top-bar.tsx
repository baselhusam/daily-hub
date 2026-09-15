"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
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
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import type { SidebarStats } from "@/lib/sidebar-stats";

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 68;
export const TOP_BAR_HEIGHT = 56;

type AppTopBarProps = {
  stats: SidebarStats;
  onSearchOpen: () => void;
  onSettingsOpen: () => void;
  collapsed: boolean;
  onToggle: () => void;
  animate?: boolean;
};

export const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/daily", label: "Habits", icon: CalendarCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

/** "Basel H." → "BH", "Basel" → "B": one letter per word, at most two. */
function nameInitials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "?";
}

/** "Workspace › Projects › Aurora" — the middle crumb only on a project page. */
function useBreadcrumb(projects: SidebarStats["projects"]) {
  const pathname = usePathname();
  if (pathname.startsWith("/projects/")) {
    const id = pathname.split("/")[2];
    const project = projects.find((candidate) => candidate.id === id);
    return { middle: "Projects", middleHref: "/projects", title: project?.name ?? "Project" };
  }
  const item = navItems.find((candidate) =>
    candidate.href === "/" ? pathname === "/" : pathname.startsWith(candidate.href)
  );
  return { middle: null, middleHref: null, title: item?.label ?? "DailyHub" };
}

export function AppTopBar({
  stats,
  onSearchOpen,
  onSettingsOpen,
  collapsed,
  onToggle,
  animate = true,
}: AppTopBarProps) {
  const crumb = useBreadcrumb(stats.projects);
  const initials = nameInitials(stats.settings.displayName);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 hidden dh:flex"
      style={{ height: TOP_BAR_HEIGHT }}
    >
      <div
        className={cn(
          "flex h-full shrink-0 items-center justify-center overflow-hidden border-r border-b border-border bg-paper px-2.5",
          animate && "transition-[width] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]"
        )}
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      >
        <button
          type="button"
          onClick={onSettingsOpen}
          className={cn(
            "flex h-[38px] max-w-full items-center justify-center gap-[9px] rounded-[9px] text-left transition-colors duration-[120ms] hover:bg-hover",
            collapsed ? "w-[38px]" : "px-[9px]"
          )}
          aria-label="Workspace settings"
          title="Workspace settings"
        >
          <BrandMark size={26} className="shrink-0 text-foreground" />
          {!collapsed ? (
            <>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] leading-[1.25] font-semibold tracking-[-0.015em]">
                  {stats.settings.workspaceName}
                </span>
                <span className="truncate text-[10.5px] leading-[1.25] text-faint">
                  {stats.settings.displayName}
                </span>
              </span>
              <ChevronDown className="h-[13px] w-[13px] shrink-0 text-faint" strokeWidth={1.9} />
            </>
          ) : null}
        </button>
      </div>

      <div className="relative flex min-w-0 flex-1 items-center gap-2.5 border-b border-border bg-background pr-5 pl-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-faint transition-colors duration-[120ms] hover:bg-hover hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[17px] w-[17px]" strokeWidth={1.8} />
          ) : (
            <PanelLeftClose className="h-[17px] w-[17px]" strokeWidth={1.8} />
          )}
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-[7px] text-[12.5px] text-faint"
        >
          <Link
            href="/"
            className="shrink-0 rounded-[5px] px-1 py-0.5 whitespace-nowrap transition-colors duration-[120ms] hover:bg-hover hover:text-foreground"
          >
            {stats.settings.workspaceName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
          {crumb.middle && crumb.middleHref ? (
            <>
              <Link
                href={crumb.middleHref}
                className="shrink-0 rounded-[5px] px-1 py-0.5 transition-colors duration-[120ms] hover:bg-hover hover:text-foreground"
              >
                {crumb.middle}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
            </>
          ) : null}
          <span className="truncate font-semibold text-foreground" aria-current="page">
            {crumb.title}
          </span>
        </nav>

        <div className="min-w-2 flex-1" />

        <button
          type="button"
          onClick={onSearchOpen}
          className="flex h-8 w-[300px] max-w-[36vw] shrink items-center gap-2 rounded-[8px] border border-border bg-paper px-[9px] text-left text-faint transition-colors duration-[120ms] hover:border-border-strong hover:bg-card"
          aria-label="Search"
          title="Search (⌘K or /)"
        >
          <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 truncate text-[12.5px]">
            Find a task, project or habit…
          </span>
          <kbd className="shrink-0 rounded-[5px] border border-border bg-card px-[5px] py-px font-mono text-[11px] font-semibold">
            ⌘K
          </kbd>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <NotificationBell notifications={stats.notifications} />
          <ThemeToggle />
          <span aria-hidden className="mx-1.5 h-5 w-px bg-border" />
          <a
            href="https://github.com/baselhusam/daily-hub"
            target="_blank"
            rel="noreferrer"
            aria-label="View DailyHub on GitHub"
            title="View DailyHub on GitHub"
            className="grid h-8 w-8 place-items-center rounded-[8px] text-muted-foreground transition-colors duration-[120ms] hover:bg-hover hover:text-foreground"
          >
            <Github className="h-[17px] w-[17px]" strokeWidth={1.7} />
          </a>
          <UserMenu
            initials={initials}
            displayName={stats.settings.displayName}
            workspaceName={stats.settings.workspaceName}
            collapsed={collapsed}
            onSearchOpen={onSearchOpen}
            onSettingsOpen={onSettingsOpen}
            onToggleSidebar={onToggle}
          />
        </div>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/94 pt-1.5 pr-[max(6px,env(safe-area-inset-right))] pb-[calc(7px+env(safe-area-inset-bottom))] pl-[max(6px,env(safe-area-inset-left))] backdrop-blur-[12px] dh:hidden">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
