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
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ChainDots } from "@/components/ui/chain-dots";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SettingsDialog } from "@/components/settings-dialog";
import { cn } from "@/lib/utils";
import { resolveEntityColor } from "@/lib/entity-colors";
import type { SidebarStats } from "@/lib/sidebar-stats";

const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard, countKey: "openTasks" as const },
  { href: "/projects", label: "Projects", icon: FolderKanban, countKey: "projectCount" as const },
  { href: "/daily", label: "Habits", icon: CalendarCheck, countKey: "habitCount" as const },
  { href: "/analytics", label: "Analytics", icon: BarChart3, countKey: null },
];

type AppSidebarProps = {
  stats: SidebarStats;
};

export function AppSidebar({ stats }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("project");
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-paper dh:flex">
        <div className="flex flex-col gap-5 p-3.5 pb-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-2 py-2 text-left shadow-[0_1px_2px_rgba(15,15,15,.04)] transition-colors hover:border-[#D3D2CF]"
          >
            <BrandMark size={28} className="text-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold tracking-[0.02em] text-faint">
                {stats.settings.workspaceName}
              </span>
              <span className="block text-[13.5px] font-semibold tracking-[-0.01em]">
                DailyHub
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-faint" />
          </button>

          <nav className="flex flex-col gap-0.5">
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.02em] text-faint">
              Main Menu
            </p>
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
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors duration-[120ms]",
                    isActive
                      ? "text-foreground"
                      : "text-ink-soft hover:bg-hover"
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-md border border-border bg-card shadow-[0_1px_2px_rgba(15,15,15,.05)]" />
                  )}
                  <span className="relative z-10 flex w-full items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {count !== undefined && (
                      <span className="text-[11px] text-faint tabular-nums">
                        {count}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>

          {stats.projects.length > 0 && (
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
                    <span className="h-2 w-2 rounded-sm bg-foreground" />
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
                      <span
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{
                          backgroundColor: resolveEntityColor(project.color),
                        }}
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

        <div className="mt-auto flex flex-col gap-2 p-3">
          {stats.showStreaks && (
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
            className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2 py-2 text-left shadow-[0_1px_2px_rgba(15,15,15,.04)] transition-colors hover:border-[#D3D2CF]"
          >
            <span className="relative grid h-[30px] w-[30px] place-items-center rounded-full bg-border text-xs font-semibold text-muted-foreground">
              {stats.settings.displayName.slice(0, 1).toUpperCase()}
              <span className="absolute -right-px -bottom-px h-2 w-2 rounded-full border-2 border-card bg-signal" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-snug">
                {stats.settings.displayName}
              </span>
              <span className="block text-[11px] text-faint">
                {stats.settings.role}
              </span>
            </span>
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
