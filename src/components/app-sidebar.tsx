"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  FolderKanban,
  GripVertical,
  LayoutDashboard,
  PanelLeftOpen,
} from "lucide-react";
import * as React from "react";
import { ChainDots } from "@/components/ui/chain-dots";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { reorderProjects } from "@/app/actions/projects";
import { cn } from "@/lib/utils";
import type { SidebarStats } from "@/lib/sidebar-stats";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_WIDTH,
  TOP_BAR_HEIGHT,
} from "@/components/app-top-bar";

const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard, countKey: "openTasks" as const },
  { href: "/projects", label: "Projects", icon: FolderKanban, countKey: "projectCount" as const },
  { href: "/daily", label: "Habits", icon: CalendarCheck, countKey: "habitCount" as const },
  { href: "/analytics", label: "Analytics", icon: BarChart3, countKey: null },
];

type AppSidebarProps = {
  stats: SidebarStats;
  collapsed?: boolean;
  animate?: boolean;
  onExpand?: () => void;
};

function isDoneProject(project: { status: string }) {
  return project.status === "DONE";
}

export function AppSidebar({
  stats,
  collapsed = false,
  animate = true,
  onExpand,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("project");
  const [projects, setProjects] = React.useState(stats.projects);
  const projectsRef = React.useRef(stats.projects);
  const [draggedProjectId, setDraggedProjectId] = React.useState<string | null>(null);
  const [dropProjectId, setDropProjectId] = React.useState<string | null>(null);
  const [showExpandHint, setShowExpandHint] = React.useState(false);
  const expandHintRef = React.useRef<HTMLSpanElement>(null);
  const draggedProjectIdRef = React.useRef<string | null>(null);
  const dropProjectIdRef = React.useRef<string | null>(null);
  const projectOrderSaveRef = React.useRef<Promise<unknown>>(Promise.resolve());

  React.useEffect(() => {
    projectsRef.current = stats.projects;
    setProjects(stats.projects);
  }, [stats.projects]);

  const saveProjectOrder = React.useCallback((nextProjects: typeof projects) => {
    const ids = nextProjects.map((project) => project.id);
    projectOrderSaveRef.current = projectOrderSaveRef.current
      .catch(() => undefined)
      .then(() => reorderProjects(ids));
  }, []);

  const moveProject = React.useCallback(
    (sourceId: string, destinationId: string) => {
      if (sourceId === destinationId) return;

      const current = projectsRef.current;
      const sourceIndex = current.findIndex((project) => project.id === sourceId);
      const destinationIndex = current.findIndex(
        (project) => project.id === destinationId
      );
      if (sourceIndex === -1 || destinationIndex === -1) return;
      // Done projects always sit below live ones, so a move across that line
      // would only snap back on the next load.
      if (isDoneProject(current[sourceIndex]) !== isDoneProject(current[destinationIndex]))
        return;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(destinationIndex, 0, moved);
      projectsRef.current = next;
      setProjects(next);
      saveProjectOrder(next);
    },
    [saveProjectOrder]
  );

  const moveProjectByOffset = React.useCallback(
    (projectId: string, offset: -1 | 1) => {
      const index = projectsRef.current.findIndex((project) => project.id === projectId);
      const destination = projectsRef.current[index + offset];
      if (destination) moveProject(projectId, destination.id);
    },
    [moveProject]
  );

  const clearProjectDrag = React.useCallback(() => {
    draggedProjectIdRef.current = null;
    dropProjectIdRef.current = null;
    setDraggedProjectId(null);
    setDropProjectId(null);
  }, []);

  const startProjectDrag = React.useCallback((projectId: string) => {
    draggedProjectIdRef.current = projectId;
    dropProjectIdRef.current = null;
    setDraggedProjectId(projectId);
    setDropProjectId(null);
  }, []);

  const updateProjectDrop = React.useCallback((clientX: number, clientY: number) => {
    const sourceId = draggedProjectIdRef.current;
    if (!sourceId) return;

    const row = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-project-row]");
    const nextDropProjectId = row?.dataset.projectId ?? null;
    const source = projectsRef.current.find((project) => project.id === sourceId);
    const destination = projectsRef.current.find(
      (project) => project.id === nextDropProjectId
    );
    const validDropProjectId =
      nextDropProjectId === sourceId ||
      !source ||
      !destination ||
      isDoneProject(source) !== isDoneProject(destination)
        ? null
        : nextDropProjectId;

    if (dropProjectIdRef.current !== validDropProjectId) {
      dropProjectIdRef.current = validDropProjectId;
      setDropProjectId(validDropProjectId);
    }
  }, []);

  const finishProjectDrag = React.useCallback(() => {
    const sourceId = draggedProjectIdRef.current;
    const destinationId = dropProjectIdRef.current;
    if (sourceId && destinationId) moveProject(sourceId, destinationId);
    clearProjectDrag();
  }, [clearProjectDrag, moveProject]);

  React.useEffect(() => {
    const handleMove = (event: MouseEvent) =>
      updateProjectDrop(event.clientX, event.clientY);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("pointerup", finishProjectDrag);
    window.addEventListener("mouseup", finishProjectDrag);
    window.addEventListener("pointercancel", clearProjectDrag);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("pointerup", finishProjectDrag);
      window.removeEventListener("mouseup", finishProjectDrag);
      window.removeEventListener("pointercancel", clearProjectDrag);
    };
  }, [clearProjectDrag, finishProjectDrag, updateProjectDrop]);

  const isSidebarInteractive = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest("[data-sidebar-interactive]"));

  const onToday = pathname === "/";
  const scoped = onToday && Boolean(activeProjectId);
  const hasFilters = stats.projects.length > 0 || stats.inboxTotalCount > 0;
  const bestYet =
    stats.showStreaks && stats.streak > 0 && stats.streak >= stats.bestStreak;

  return (
    <aside
      onClick={(event) => {
        if (!collapsed) return;
        if (!isSidebarInteractive(event.target)) onExpand?.();
      }}
      onPointerMove={(event) => {
        if (!collapsed || isSidebarInteractive(event.target)) {
          setShowExpandHint(false);
          return;
        }
        const hint = expandHintRef.current;
        if (hint) {
          hint.style.transform = `translate3d(${event.clientX + 12}px, ${event.clientY + 12}px, 0)`;
        }
        setShowExpandHint(true);
      }}
      onPointerLeave={() => setShowExpandHint(false)}
      className={cn(
        "group/sidebar fixed bottom-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-border bg-paper dh:flex",
        animate && "transition-[width] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]",
        collapsed ? "cursor-pointer" : ""
      )}
      style={{
        top: TOP_BAR_HEIGHT,
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
      }}
    >
      {collapsed && (
        <span
          ref={expandHintRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none fixed top-0 left-0 z-[60] inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground shadow-raised transition-opacity duration-100",
            showExpandHint ? "opacity-100" : "opacity-0"
          )}
          style={{ transform: "translate3d(-9999px, -9999px, 0)" }}
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
          Open
        </span>
      )}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col pt-3.5 pb-4",
          collapsed ? "gap-3 px-3" : "gap-[18px] px-3"
        )}
      >
        <nav className="flex shrink-0 flex-col gap-0.5" aria-label="Main menu">
          {!collapsed && (
            <p className="px-2.5 pb-2 text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
              Main menu
            </p>
          )}
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? onToday : pathname.startsWith(item.href);
            const Icon = item.icon;
            const count = item.countKey !== null ? stats[item.countKey] : undefined;

            return (
              <Link
                key={item.href}
                href={item.href}
                data-sidebar-interactive
                title={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-[34px] items-center rounded-[8px] px-2.5 text-[13.5px] font-medium transition-colors duration-[120ms]",
                  isActive ? "text-foreground" : "text-ink-soft hover:bg-hover hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                {isActive && (
                  <>
                    <span className="absolute inset-0 rounded-[8px] border border-border bg-card shadow-raised" />
                    <span className="absolute top-[9px] bottom-[9px] left-[-12px] w-[2.5px] rounded-r-[2px] bg-signal" />
                  </>
                )}
                <span
                  className={cn(
                    "relative flex w-full items-center gap-2.5",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      {count !== undefined && (
                        <span className="grid h-[18px] min-w-5 place-items-center rounded-[6px] bg-hover px-[5px] text-[11px] font-semibold text-muted-foreground tabular-nums">
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

        {collapsed && hasFilters && (
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-0.5 [scrollbar-width:none]">
            <div className="mx-auto mb-1.5 h-px w-5 bg-border-strong/60" />
            <nav className="flex flex-col items-center gap-1" aria-label="Today filters">
              <Link
                href="/"
                data-sidebar-interactive
                title="Everything"
                aria-label={`Everything, ${stats.openTasks} open tasks`}
                aria-current={onToday && !activeProjectId ? "page" : undefined}
                className={cn(
                  "grid h-[30px] w-[30px] place-items-center rounded-[8px] transition-colors duration-[120ms] hover:bg-hover",
                  onToday && !activeProjectId && "border border-border bg-card shadow-raised"
                )}
              >
                <span className="h-[18px] w-[18px] rounded-[5px] bg-foreground" />
              </Link>
              <Link
                href="/?project=inbox"
                data-sidebar-interactive
                title="Inbox"
                aria-label={`Inbox, ${stats.inboxCount} open tasks`}
                aria-current={onToday && activeProjectId === "inbox" ? "page" : undefined}
                className={cn(
                  "grid h-[30px] w-[30px] place-items-center rounded-[8px] transition-colors duration-[120ms] hover:bg-hover",
                  onToday && activeProjectId === "inbox" && "border border-border bg-card shadow-raised"
                )}
              >
                <InboxAvatar size={18} />
              </Link>
              {projects.map((project) => {
                const isActive = onToday && activeProjectId === project.id;
                const isDone = project.status === "DONE";
                return (
                  <Link
                    key={project.id}
                    href={`/?project=${project.id}`}
                    data-sidebar-interactive
                    title={isDone ? `${project.name} — Done` : project.name}
                    aria-label={
                      isDone
                        ? `${project.name}, done`
                        : `${project.name}, ${project.openCount} open tasks`
                    }
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "grid h-[30px] w-[30px] place-items-center rounded-[8px] transition-[background-color,opacity] duration-[120ms] hover:bg-hover",
                      isActive && "border border-border bg-card shadow-raised",
                      isDone && !isActive && "opacity-55 hover:opacity-100"
                    )}
                  >
                    <EntityAvatar
                      name={project.name}
                      color={project.color}
                      logoUrl={project.logoUrl}
                      iconKey={project.iconKey}
                      size={18}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {!collapsed && hasFilters && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between px-2.5 pb-2">
              <p className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
                Filter today
              </p>
              <Link
                href="/"
                data-sidebar-interactive
                aria-disabled={!scoped}
                tabIndex={scoped ? 0 : -1}
                className={cn(
                  "text-[11px] font-semibold transition-colors duration-[120ms]",
                  scoped ? "text-signal hover:text-signal-hover" : "pointer-events-none text-faint"
                )}
              >
                clear
              </Link>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-0.5 pr-2">
                <Link
                  href="/"
                  data-sidebar-interactive
                  aria-current={onToday && !activeProjectId ? "page" : undefined}
                  className={cn(
                    "flex h-[30px] items-center gap-[9px] rounded-[7px] px-2.5 text-[13px] font-medium transition-colors duration-[120ms] hover:bg-hover",
                    onToday && !activeProjectId && "bg-hover"
                  )}
                >
                  <span className="h-[18px] w-[18px] shrink-0 rounded-[5px] bg-foreground" />
                  <span className="flex-1 truncate">Everything</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {stats.openTasks}
                  </span>
                </Link>
                <Link
                  href="/?project=inbox"
                  data-sidebar-interactive
                  aria-current={onToday && activeProjectId === "inbox" ? "page" : undefined}
                  className={cn(
                    "flex h-[30px] items-center gap-[9px] rounded-[7px] px-2.5 text-[13px] font-medium transition-colors duration-[120ms] hover:bg-hover",
                    onToday && activeProjectId === "inbox" && "bg-hover"
                  )}
                >
                  <InboxAvatar size={18} />
                  <span className="flex-1 truncate">Inbox</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {stats.inboxCount}
                  </span>
                </Link>
                {projects.map((project) => {
                  const isActive = onToday && activeProjectId === project.id;
                  const isDone = project.status === "DONE";
                  return (
                    <div
                      key={project.id}
                      data-project-row
                      data-project-id={project.id}
                      className={cn(
                        "group/project relative flex h-[30px] items-center rounded-[7px] px-2.5 text-[13px] font-medium transition-[background-color,opacity,box-shadow] duration-150 hover:bg-hover",
                        isActive && "bg-hover",
                        draggedProjectId === project.id && "select-none opacity-45",
                        dropProjectId === project.id &&
                          "bg-signal/10 shadow-[inset_0_2px_0_var(--color-signal)]"
                      )}
                    >
                      <button
                        type="button"
                        data-project-drag-handle
                        data-sidebar-interactive
                        className="absolute top-1/2 left-[-3px] grid h-[18px] w-[13px] -translate-y-1/2 touch-none cursor-grab place-items-center rounded text-faint/80 opacity-0 transition-opacity active:cursor-grabbing group-hover/project:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
                        aria-label={`Reorder ${project.name}`}
                        title="Drag to reorder"
                        onPointerDown={(event) => {
                          if (event.button !== 0) return;
                          event.preventDefault();
                          startProjectDrag(project.id);
                        }}
                        onMouseDown={(event) => {
                          if (event.button !== 0) return;
                          event.preventDefault();
                          startProjectDrag(project.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            moveProjectByOffset(project.id, -1);
                          }
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            moveProjectByOffset(project.id, 1);
                          }
                        }}
                      >
                        <GripVertical className="h-3.5 w-3.5" strokeWidth={2.3} />
                      </button>
                      <Link
                        href={`/?project=${project.id}`}
                        data-sidebar-interactive
                        title={project.name}
                        aria-current={isActive ? "page" : undefined}
                        className="flex h-full min-w-0 flex-1 items-center gap-[9px]"
                      >
                        <EntityAvatar
                          name={project.name}
                          color={project.color}
                          logoUrl={project.logoUrl}
                          iconKey={project.iconKey}
                          size={18}
                        />
                        <span
                          className={cn(
                            "flex-1 truncate",
                            isDone ? "text-faint" : "text-foreground"
                          )}
                        >
                          {project.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {isDone ? "done" : project.openCount}
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {!collapsed && stats.showStreaks && (
          <div className="mt-auto shrink-0 rounded-[11px] border border-border bg-card px-3.5 py-[13px] shadow-raised">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
                Chain
              </span>
              {bestYet ? (
                <span className="rounded-[5px] bg-done-wash px-1.5 py-px text-[10.5px] font-bold text-done">
                  best yet
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-signal tabular-nums">
                {stats.streak}
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                {stats.streak === 1 ? "day unbroken" : "days unbroken"}
              </span>
            </div>
            <ChainDots dots={stats.streakDots} className="mt-[11px]" size="bar" />
          </div>
        )}
      </div>
    </aside>
  );
}
