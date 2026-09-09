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

  return (
    <aside
      onClick={(event) => {
        if (!collapsed) return;

        if (!isSidebarInteractive(event.target)) {
          onExpand?.();
        }
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
        "group/sidebar fixed top-[52px] bottom-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-border bg-paper dh:flex",
        animate &&
          "transition-[width] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]",
        collapsed ? "w-[68px] cursor-pointer" : "w-64"
      )}
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
          "relative z-10 flex min-h-0 flex-1 flex-col pb-3",
          collapsed ? "gap-3 p-2" : "gap-5 p-3.5"
        )}
      >
        <nav className="flex shrink-0 flex-col gap-0.5">
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
                  data-sidebar-interactive
                  title={item.label}
                  aria-current={isActive ? "page" : undefined}
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
                    <span className="absolute inset-0 rounded-md border border-border bg-card shadow-raised" />
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

          {collapsed && (stats.projects.length > 0 || stats.inboxTotalCount > 0) && (
            <div className="min-h-0 flex-1 overflow-y-auto pt-1">
              <div className="mx-auto mb-2 h-px w-7 bg-border" />
              <nav className="flex flex-col items-center gap-1" aria-label="Today filters">
                <Link
                  href="/"
                  data-sidebar-interactive
                  title="Everything"
                  aria-label={`Everything, ${stats.openTasks} open tasks`}
                  aria-current={pathname === "/" && !activeProjectId ? "page" : undefined}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-md transition-colors duration-[120ms]",
                    pathname === "/" && !activeProjectId
                      ? "border border-border bg-card text-foreground shadow-raised"
                      : "text-ink-soft hover:bg-hover"
                  )}
                >
                  <span className="h-[18px] w-[18px] rounded-md bg-foreground" />
                </Link>
                <Link
                  href="/?project=inbox"
                  data-sidebar-interactive
                  title="Inbox"
                  aria-label={`Inbox, ${stats.inboxCount} open tasks`}
                  aria-current={pathname === "/" && activeProjectId === "inbox" ? "page" : undefined}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-md transition-colors duration-[120ms]",
                    pathname === "/" && activeProjectId === "inbox"
                      ? "border border-border bg-card shadow-raised"
                      : "hover:bg-hover"
                  )}
                >
                  <InboxAvatar size={18} />
                </Link>
                {projects.map((project) => {
                  const isActive = pathname === "/" && activeProjectId === project.id;
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
                        "grid h-9 w-9 place-items-center rounded-md transition-colors duration-[120ms]",
                        isActive
                          ? "border border-border bg-card shadow-raised"
                          : "hover:bg-hover",
                        isDone && !isActive && "opacity-60 hover:opacity-100"
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

          {!collapsed && (stats.projects.length > 0 || stats.inboxTotalCount > 0) && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mb-1 flex items-center justify-between px-3">
                <p className="text-[11.5px] font-semibold tracking-[0.02em] text-faint">
                  Filter Today
                </p>
                {activeProjectId && (
                  <Link
                    href="/"
                    data-sidebar-interactive
                    className="text-[11px] font-semibold text-signal hover:text-signal-hover"
                  >
                    clear
                  </Link>
                )}
              </div>
              <ScrollArea className="min-h-0 flex-1">
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
                  <Link
                    href="/?project=inbox"
                    data-sidebar-interactive
                    className={cn(
                      "relative flex items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] font-medium",
                      pathname === "/" && activeProjectId === "inbox"
                        ? "bg-hover text-foreground"
                        : "text-foreground hover:bg-hover"
                    )}
                  >
                    <InboxAvatar size={18} />
                    <span className="flex-1">Inbox</span>
                    <span className="text-[11px] text-faint tabular-nums">
                      {stats.inboxCount}
                    </span>
                  </Link>
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      data-project-row
                      data-project-id={project.id}
                      className={cn(
                        "group/project relative flex items-center gap-1 rounded-md py-1.5 pr-3 text-[13.5px] font-medium transition-[background-color,opacity,box-shadow] duration-150",
                        pathname === "/" && activeProjectId === project.id
                          ? "bg-hover"
                          : "hover:bg-hover",
                        project.status === "DONE" &&
                          "opacity-60 hover:opacity-100 focus-within:opacity-100",
                        draggedProjectId === project.id && "select-none opacity-45",
                        dropProjectId === project.id &&
                          "bg-signal/10 shadow-[inset_0_2px_0_var(--color-signal)]"
                      )}
                    >
                      <button
                        type="button"
                        data-project-drag-handle
                        data-sidebar-interactive
                        className="grid h-[18px] w-[18px] shrink-0 touch-none cursor-grab place-items-center rounded text-faint/70 opacity-45 transition-opacity active:cursor-grabbing group-hover/project:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
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
                        className="flex min-w-0 flex-1 items-center gap-2"
                      >
                        <EntityAvatar
                          name={project.name}
                          color={project.color}
                          logoUrl={project.logoUrl}
                          iconKey={project.iconKey}
                          size={18}
                        />
                        <span className="flex-1 truncate">{project.name}</span>
                        {project.status === "DONE" ? (
                          <span className="shrink-0 rounded border border-border px-1.5 py-px text-[10px] font-semibold tracking-[0.02em] text-faint">
                            Done
                          </span>
                        ) : (
                          <span className="text-[11px] text-faint tabular-nums">
                            {project.openCount}
                          </span>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {!collapsed && stats.showStreaks && (
          <div className="mt-auto shrink-0 p-3">
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
          </div>
        )}
    </aside>
  );
}
