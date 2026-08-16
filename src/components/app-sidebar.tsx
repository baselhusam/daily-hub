"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  CalendarCheck,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLockup, BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EntityIcon } from "@/components/dashboard/entity-icon";
import { cn } from "@/lib/utils";
import type { SidebarStats } from "@/lib/sidebar-stats";

const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/daily", label: "Habits", icon: CalendarCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

type AppSidebarProps = {
  stats: SidebarStats;
  expanded: boolean;
  onCollapse: () => void;
  onExpand: () => void;
};

export function AppSidebar({
  stats,
  expanded,
  onCollapse,
  onExpand,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("project");

  if (!expanded) {
    return (
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-12 flex-col items-center border-r bg-paper py-3 md:flex">
        <Link
          href="/"
          aria-label="DailyHub"
          className="flex h-10 w-10 items-center justify-center"
        >
          <BrandMark size={28} className="text-foreground" />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-1 h-8 w-8 text-faint"
          onClick={onExpand}
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[216px] flex-col border-r bg-paper md:flex">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3">
        <Link href="/" className="min-w-0">
          <BrandLockup size={28} wordmarkClassName="text-[15px] leading-none" />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-faint"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <nav className="space-y-0.5 px-2.5">
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
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition-colors duration-[120ms]",
                isActive
                  ? "border border-border bg-background font-medium text-foreground shadow-[0_1px_2px_rgba(15,15,15,.05)]"
                  : "text-ink-soft hover:bg-hover"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {stats.projects.length > 0 && (
        <div className="mt-6 flex min-h-0 flex-1 flex-col px-2.5">
          <p className="mb-1.5 px-2.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint">
            Projects
          </p>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 pr-2">
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors duration-[120ms]",
                  pathname === "/" && !activeProjectId
                    ? "border border-border bg-background font-medium text-foreground shadow-[0_1px_2px_rgba(15,15,15,.05)]"
                    : "text-ink-soft hover:bg-hover"
                )}
              >
                All
              </Link>
              <Link
                href="/?project=inbox"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors duration-[120ms]",
                  pathname === "/" && activeProjectId === "inbox"
                    ? "border border-border bg-background font-medium text-foreground shadow-[0_1px_2px_rgba(15,15,15,.05)]"
                    : "text-ink-soft hover:bg-hover"
                )}
              >
                Inbox
              </Link>
              {stats.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/?project=${project.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors duration-[120ms]",
                    pathname === "/" && activeProjectId === project.id
                      ? "border border-border bg-background font-medium text-foreground shadow-[0_1px_2px_rgba(15,15,15,.05)]"
                      : "text-ink-soft hover:bg-hover"
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

      <div className="mt-auto flex items-center justify-between px-4 py-3">
        <span className="text-xs text-faint">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
