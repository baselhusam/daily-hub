"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ChainDots } from "@/components/ui/chain-dots";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SettingsDialog } from "@/components/settings-dialog";
import { cn } from "@/lib/utils";
import type { SidebarStats } from "@/lib/sidebar-stats";

const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard, countKey: "openTasks" as const },
  { href: "/projects", label: "Projects", icon: FolderKanban, countKey: "projectCount" as const },
  { href: "/daily", label: "Habits", icon: CalendarCheck, countKey: "habitCount" as const },
  { href: "/analytics", label: "Analytics", icon: BarChart3, countKey: null },
];

type AppSidebarProps = {
  stats: SidebarStats;
  collapsed?: boolean;
  onToggle?: () => void;
  animate?: boolean;
};

export function AppSidebar({
  stats,
  collapsed = false,
  onToggle,
  animate = true,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("project");
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-border bg-paper dh:flex",
          animate &&
            "transition-[width] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex flex-col pb-3",
            collapsed ? "gap-3 p-2" : "gap-5 p-3.5"
          )}
        >
          <div
            className={cn(
              "flex items-center",
              collapsed ? "flex-col gap-1.5" : "gap-1.5"
            )}
          >
            {collapsed && onToggle && (
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={false}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="grid h-9 w-full place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(15,15,15,.04)] transition-colors hover:border-[#D3D2CF] hover:text-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={cn(
                "flex items-center rounded-lg border border-border bg-card text-left shadow-[0_1px_2px_rgba(15,15,15,.04)] transition-colors hover:border-[#D3D2CF]",
                collapsed
                  ? "h-9 w-full justify-center"
                  : "min-w-0 flex-1 gap-2.5 px-2 py-2"
              )}
              title={collapsed ? stats.settings.workspaceName : undefined}
            >
              <BrandMark size={collapsed ? 22 : 28} className="text-foreground" />
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold tracking-[0.02em] text-faint">
                      {stats.settings.workspaceName}
                    </span>
                    <span className="block text-[13.5px] font-semibold tracking-[-0.01em]">
                      DailyHub
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-faint" />
                </>
              )}
            </button>
            {!collapsed && onToggle && (
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={true}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="grid h-[44px] w-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(15,15,15,.04)] transition-colors hover:border-[#D3D2CF] hover:text-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-0.5">
            {!collapsed && (
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.02em] text-faint">
                Main Menu
              </p>
            )}
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              const count =
                item.countKey !== null ? stats[item.countKey] : undefined;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "relative flex items-center rounded-md text-[13.5px] font-medium transition-colors duration-[120ms]",
                    collapsed
                      ? "h-9 justify-center"
                      : "gap-2.5 px-2.5 py-2",
                    isActive
                      ? "text-foreground"
                      : "text-ink-soft hover:bg-hover"
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-md border border-border bg-card shadow-[0_1px_2px_rgba(15,15,15,.05)]" />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex items-center",
                      collapsed ? "justify-center" : "w-full gap-2.5"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {count !== undefined && (
                          <span className="text-[11px] text-faint tabular-nums">
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>

          {!collapsed && stats.projects.length > 0 && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1 flex items-center justify-between px-3">
                <p className="text-[11.5px] font-semibold tracking-[0.02em] text-faint">
                  Filter Today
                </p>
                {activeProjectId && (
                  <Link
                    href="/"
                    className="text-[11px] font-semibold text-signal hover:text-[#1A7BD4]"
                  >
                    clear
                  </Link>
                )}
              </div>
              <ScrollArea className="max-h-48">
                <div className="space-y-0.5 pr-2">
                  <Link
                    href="/"
                    className={cn(
                      "relative flex items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] font-medium",
                      pathname === "/" && !activeProjectId
                        ? "bg-hover text-foreground"
                        : "text-foreground hover:bg-hover"
                    )}
                  >
                    <span className="h-[18px] w-[18px] shrink-0 rounded-md bg-foreground" />
                    <span className="flex-1">Everything</span>
                    <span className="text-[11px] text-faint tabular-nums">
                      {stats.openTasks}
                    </span>
                  </Link>
                  {stats.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/?project=${project.id}`}
                      className={cn(
                        "relative flex items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] font-medium",
                        pathname === "/" && activeProjectId === project.id
                          ? "bg-hover"
                          : "hover:bg-hover"
                      )}
                    >
                      <EntityAvatar
                        name={project.name}
                        color={project.color}
                        logoUrl={project.logoUrl}
                        iconKey={project.iconKey}
                        size={18}
                      />
                      <span className="flex-1 truncate">{project.name}</span>
                      <span className="text-[11px] text-faint tabular-nums">
                        {project.openCount}
                      </span>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div
          className={cn(
            "mt-auto flex flex-col gap-2",
            collapsed ? "p-2" : "p-3"
          )}
        >
          {!collapsed && stats.showStreaks && (
            <div className="rounded-[10px] border border-border bg-card p-3.5">
              <p className="mb-1.5 text-[11.5px] font-semibold tracking-[0.02em] text-faint">
                Chain
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[26px] font-semibold text-signal tabular-nums leading-none">
                  {stats.streak}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  days unbroken
                </span>
              </div>
              <ChainDots dots={stats.streakDots} className="mt-2.5" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title={
              collapsed
                ? `${stats.settings.displayName} · ${stats.settings.role}`
                : undefined
            }
            className={cn(
              "flex items-center rounded-lg border border-border bg-card text-left shadow-[0_1px_2px_rgba(15,15,15,.04)] transition-colors hover:border-[#D3D2CF]",
              collapsed
                ? "h-9 w-full justify-center"
                : "gap-2.5 px-2 py-2"
            )}
          >
            <span
              className={cn(
                "relative grid place-items-center rounded-full bg-border font-semibold text-muted-foreground",
                collapsed ? "h-[22px] w-[22px] text-[10px]" : "h-[30px] w-[30px] text-xs"
              )}
            >
              {stats.settings.displayName.slice(0, 1).toUpperCase()}
              <span className="absolute -right-px -bottom-px h-2 w-2 rounded-full border-2 border-card bg-signal" />
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-snug">
                  {stats.settings.displayName}
                </span>
                <span className="block text-[11px] text-faint">
                  {stats.settings.role}
                </span>
              </span>
            )}
          </button>
        </div>
      </aside>

      <SettingsDialog
        settings={{
          id: "default",
          ...stats.settings,
        }}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}
