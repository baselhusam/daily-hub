"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  CalendarCheck,
  PanelLeftClose,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EntityIcon } from "@/components/dashboard/entity-icon";
import { cn } from "@/lib/utils";
import type { SidebarStats } from "@/lib/sidebar-stats";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/daily", label: "Daily", icon: CalendarCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

type AppSidebarProps = {
  stats: SidebarStats;
  expanded: boolean;
  onCollapse: () => void;
};

export function AppSidebar({ stats, expanded, onCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("project");

  if (!expanded) {
    return null;
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-card md:flex">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3">
        <Link href="/" className="truncate text-sm font-semibold tracking-tight">
          DailyHub
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <nav className="space-y-1 px-3 py-4">
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
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {stats.projects.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col border-t px-3 py-3">
          <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
            Projects
          </p>
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-2">
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                  pathname === "/" && !activeProjectId
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                All tasks
              </Link>
              <Link
                href="/?project=inbox"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                  pathname === "/" && activeProjectId === "inbox"
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Inbox
              </Link>
              {stats.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/?project=${project.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                    pathname === "/" && activeProjectId === project.id
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <EntityIcon
                    iconKey={project.iconKey}
                    logoUrl={project.logoUrl}
                    size={14}
                  />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="mt-auto border-t">
        <div className="space-y-2 px-4 py-4">
          <p className="text-xs font-medium text-muted-foreground">Quick stats</p>
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Open tasks</dt>
              <dd className="font-medium tabular-nums">{stats.openTasks}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">This week</dt>
              <dd className="font-medium tabular-nums">
                {stats.completionsThisWeek}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Daily today</dt>
              <dd className="font-medium tabular-nums">
                {stats.dailyConsistencyToday}%
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
