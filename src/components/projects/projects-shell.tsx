"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  LayoutGrid,
  List,
  ListFilter,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toggleMilestone } from "@/app/actions/milestones";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { SelectMenu } from "@/components/ui/select-menu";
import { TaskComposer } from "@/components/dashboard/task-composer";
import { formatDueDate } from "@/lib/dates";
import { useDisplayDay } from "@/lib/hydration";
import { useOptimisticFlags } from "@/lib/optimistic-toggle";
import { daysUntil } from "@/lib/streak-utils";
import { getProjectStatus, type ProjectStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ProjectFormDialog } from "./project-form-dialog";
import { DeleteProjectDialog, type DeleteProjectTarget } from "./delete-project-dialog";

export type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  iconKey: string;
  logoUrl: string | null;
  color: string;
  rawColor: string | null;
  colorSource: string;
  dueDate: Date | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  milestones: Array<{ id: string; name: string; dueDate: Date | null; done: boolean }>;
  openCount: number;
  doneCount: number;
  completionPct: number;
  stalled: boolean;
  idleDays: number;
  lastTouch: string | null;
};

type ProjectsShellProps = {
  projects: ProjectRecord[];
  todayISO: string;
  nudgeDays: number;
};

type Filter = "all" | ProjectStatus;
type SortKey = "ship" | "status" | "open" | "progress" | "touched" | "name";
type View = "list" | "grid";

const SORT_LABELS: Record<SortKey, string> = {
  ship: "Ship date",
  status: "Status",
  open: "Open tasks",
  progress: "Progress",
  touched: "Recently active",
  name: "Name",
};
const STATUS_ORDER: Record<ProjectStatus, number> = { ACTIVE: 0, PAUSED: 1, DONE: 2 };
const STATUS_PILL: Record<string, string> = {
  signal: "bg-signal-soft text-signal",
  warn: "bg-warn-wash text-warn",
  done: "bg-done-wash text-done",
  muted: "bg-paper text-muted-foreground",
};
const PREFS_KEY = "dailyhub:projects-view";

type Prefs = { view: View; sort: SortKey; dir: "asc" | "desc"; group: boolean };
const DEFAULT_PREFS: Prefs = { view: "list", sort: "ship", dir: "asc", group: false };

function shipMeta(
  project: ProjectRecord,
  today: Date,
  mode: "utc" | "local"
): { label: string; tone: "late" | "warn" | "faint" | "done" } {
  if (project.status === "DONE") return { label: "Done", tone: "done" };
  const days = daysUntil(project.dueDate, today, mode);
  if (days === null) {
    return { label: project.status === "PAUSED" ? "Paused" : "No ship date", tone: "faint" };
  }
  const when = formatDueDate(project.dueDate, today, mode).replace(/^\w{3}, /, "");
  if (days < 0) return { label: `Ships ${when} · ${Math.abs(days)}d late`, tone: "late" };
  if (days === 0) return { label: "Ships today", tone: "warn" };
  return { label: `Ships ${when} · ${days}d`, tone: days <= 14 ? "warn" : "faint" };
}

const SHIP_TONE: Record<string, string> = {
  late: "text-destructive",
  warn: "text-warn",
  faint: "text-faint",
  done: "text-done",
};

function milestoneDue(days: number | null): { label: string; late: boolean } {
  if (days === null) return { label: "", late: false };
  if (days < 0) return { label: `${Math.abs(days)}d late`, late: true };
  if (days === 0) return { label: "today", late: false };
  return { label: `${days}d`, late: false };
}

export function ProjectsShell({ projects, todayISO, nudgeDays }: ProjectsShellProps) {
  const router = useRouter();
  const { today, mode } = useDisplayDay(todayISO);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [prefs, setPrefs] = React.useState<Prefs>(DEFAULT_PREFS);
  const [editing, setEditing] = React.useState<ProjectRecord | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<DeleteProjectTarget | null>(null);
  const [composerFor, setComposerFor] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const milestoneFlags = useOptimisticFlags(
    React.useMemo(
      () =>
        projects.flatMap((project) =>
          project.milestones.map((milestone) => ({ id: milestone.id, value: milestone.done }))
        ),
      [projects]
    )
  );

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) });
    } catch {
      // Storage blocked; keep the defaults.
    }
  }, []);

  function updatePrefs(patch: Partial<Prefs>) {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }

  function setSort(sort: SortKey) {
    updatePrefs({ sort, dir: sort === "name" || sort === "ship" || sort === "status" ? "asc" : "desc" });
  }

  // A column header cycles: sorted one way → the other way → back to the
  // default order (ship date, soonest first).
  function headerSort(sort: SortKey) {
    if (prefs.sort !== sort) {
      setSort(sort);
      return;
    }
    const natural = sort === "name" || sort === "ship" || sort === "status" ? "asc" : "desc";
    if (prefs.dir === natural) {
      updatePrefs({ dir: natural === "asc" ? "desc" : "asc" });
    } else {
      updatePrefs({ sort: DEFAULT_PREFS.sort, dir: DEFAULT_PREFS.dir });
    }
  }

  async function handleToggleMilestone(id: string, currentlyDone: boolean) {
    setActionError(null);
    try {
      const result = await milestoneFlags.run(id, currentlyDone, () => toggleMilestone(id));
      if (!result.success) setActionError(result.error ?? "Could not update this milestone.");
    } catch {
      setActionError("Could not update this milestone. Try again.");
    }
  }

  const counts = {
    all: projects.length,
    ACTIVE: projects.filter((p) => p.status === "ACTIVE").length,
    PAUSED: projects.filter((p) => p.status === "PAUSED").length,
    DONE: projects.filter((p) => p.status === "DONE").length,
  };
  const normalizedQuery = query.trim().toLowerCase();
  const visible = React.useMemo(() => {
    const filtered = projects.filter((project) => {
      if (filter !== "all" && project.status !== filter) return false;
      if (!normalizedQuery) return true;
      return (
        project.name.toLowerCase().includes(normalizedQuery) ||
        (project.description ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
    const dir = prefs.dir === "asc" ? 1 : -1;
    const shipRank = (project: ProjectRecord) => {
      if (project.status === "DONE") return Number.POSITIVE_INFINITY;
      const days = daysUntil(project.dueDate, today, mode);
      return days === null ? 100000 : days;
    };
    return [...filtered].sort((a, b) => {
      switch (prefs.sort) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "status":
          return dir * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || a.name.localeCompare(b.name);
        case "open":
          return dir * (a.openCount - b.openCount) || a.name.localeCompare(b.name);
        case "progress":
          return dir * (a.completionPct - b.completionPct) || a.name.localeCompare(b.name);
        case "touched": {
          const at = a.lastTouch ?? "";
          const bt = b.lastTouch ?? "";
          return dir * at.localeCompare(bt) || a.name.localeCompare(b.name);
        }
        default: {
          const ra = shipRank(a);
          const rb = shipRank(b);
          if (ra !== rb) return dir * (ra < rb ? -1 : 1);
          return a.name.localeCompare(b.name);
        }
      }
    });
  }, [projects, filter, normalizedQuery, prefs.sort, prefs.dir, today, mode]);

  const live = projects.filter((p) => p.status !== "DONE");
  const stalled = projects.filter((p) => p.stalled).length;
  const shipping = live.filter((p) => {
    const days = daysUntil(p.dueDate, today, mode);
    return days !== null && days <= 30;
  });
  const cuttingClose = shipping.filter((p) => {
    const days = daysUntil(p.dueDate, today, mode);
    return days !== null && days <= 14;
  }).length;
  const openTotal = projects.reduce((sum, p) => sum + p.openCount, 0);
  const denominator = Math.max(1, projects.length);
  const summary = [
    {
      label: "Active",
      value: counts.ACTIVE,
      unit: `of ${projects.length}`,
      foot: "in flight now",
      dot: "var(--signal)",
      frac: counts.ACTIVE / denominator,
      go: "ACTIVE" as Filter,
    },
    {
      label: "Stalled",
      value: stalled,
      unit: stalled === 1 ? "project" : "projects",
      foot: `${nudgeDays}+ days quiet`,
      dot: "var(--warn)",
      frac: stalled / denominator,
      go: null,
    },
    {
      label: "Shipping",
      value: shipping.length,
      unit: "within 30d",
      foot: cuttingClose === 0 ? "none cutting it close" : `${cuttingClose} cutting it close`,
      dot: "var(--done)",
      frac: shipping.length / denominator,
      go: null,
    },
    {
      label: "Open tasks",
      value: openTotal,
      unit: "remaining",
      foot: `${(openTotal / denominator).toFixed(1)} per project`,
      dot: "var(--faint)",
      frac: Math.min(1, openTotal / 60),
      go: null,
    },
  ];
  const resultLabel =
    visible.length === projects.length
      ? `All ${projects.length} ${projects.length === 1 ? "project" : "projects"}`
      : `${visible.length} of ${projects.length} projects`;

  const groups = prefs.group
    ? (["ACTIVE", "PAUSED", "DONE"] as ProjectStatus[])
        .map((status) => ({
          label: getProjectStatus(status).label,
          rows: visible.filter((p) => p.status === status),
        }))
        .filter((group) => group.rows.length > 0)
    : [{ label: "", rows: visible }];

  const filters: Array<{ value: Filter; label: string; icon: React.ReactNode; tone: string }> = [
    { value: "all", label: "All", icon: <ListFilter className="h-3 w-3" />, tone: "text-foreground" },
    { value: "ACTIVE", label: "Active", icon: <Play className="h-3 w-3" />, tone: "text-signal" },
    { value: "PAUSED", label: "Paused", icon: <Pause className="h-3 w-3" />, tone: "text-warn" },
    { value: "DONE", label: "Done", icon: <Check className="h-3 w-3" />, tone: "text-done" },
  ];

  function editValues(project: ProjectRecord) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      iconKey: project.iconKey,
      logoUrl: project.logoUrl,
      color: project.rawColor,
      colorSource: project.colorSource === "manual" ? ("manual" as const) : ("auto" as const),
      dueDate: project.dueDate,
      status: project.status,
      milestones: project.milestones,
    };
  }

  function deleteTarget(project: ProjectRecord): DeleteProjectTarget {
    return {
      id: project.id,
      name: project.name,
      logoUrl: project.logoUrl,
      iconKey: project.iconKey,
      color: project.color,
      openCount: project.openCount,
      milestoneCount: project.milestones.length,
    };
  }

  return (
    <div className="page-gutter animate-dh-fade pt-[clamp(18px,2.4vw,26px)] pb-12">
      {editing ? (
        <ProjectFormDialog
          project={editValues(editing)}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          onRequestDelete={(target) => {
            setEditing(null);
            setPendingDelete(target);
          }}
        />
      ) : null}
      <DeleteProjectDialog
        project={pendingDelete}
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />

      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
              Workstreams
            </div>
            <h1 className="mt-[7px] text-[clamp(1.6rem,3.4vw,1.875rem)] leading-[1.1] tracking-[-0.035em]">
              Projects
            </h1>
            <p className="mt-[7px] text-[14px] text-muted-foreground">
              What each one still needs, and when it ships.
            </p>
          </div>
          <ProjectFormDialog />
        </header>

        {actionError ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-[10px] border border-destructive/25 bg-destructive-wash px-3.5 py-2.5 text-[13px] text-destructive"
          >
            {actionError}
          </p>
        ) : null}

        {projects.length > 0 ? (
          <div className="grid grid-cols-2 overflow-hidden rounded-[12px] border border-border bg-card shadow-raised lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {summary.map((tile, index) => (
              <button
                key={tile.label}
                type="button"
                onClick={tile.go ? () => setFilter(filter === tile.go ? "all" : tile.go!) : undefined}
                className={cn(
                  "flex flex-col gap-[9px] px-[18px] pt-3.5 pb-[13px] text-left transition-colors duration-[130ms] hover:bg-canvas-sunk",
                  index > 0 && "border-l border-rule-soft",
                  index >= 2 && "border-t border-rule-soft lg:border-t-0",
                  index === 2 && "border-l-0 lg:border-l",
                  !tile.go && "cursor-default"
                )}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.07em] text-faint uppercase">
                  <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: tile.dot }} />
                  {tile.label}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "text-[25px] leading-none font-semibold tracking-[-0.03em] tabular-nums",
                      tile.value === 0 ? "text-hairline" : "text-foreground"
                    )}
                  >
                    {tile.value}
                  </span>
                  <span className="text-[11.5px] text-faint">{tile.unit}</span>
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="block h-[3px] overflow-hidden rounded-[2px] bg-rule-soft">
                    <span
                      className="block h-full rounded-[2px]"
                      style={{ width: `${Math.max(4, Math.round(tile.frac * 100))}%`, backgroundColor: tile.dot }}
                    />
                  </span>
                  <span className="truncate text-[10.5px] text-muted-foreground">{tile.foot}</span>
                </span>
              </button>
            ))}
            <span className="col-span-2 flex items-center border-t border-rule-soft bg-canvas-sunk px-[18px] py-2.5 text-[11.5px] whitespace-nowrap text-faint lg:col-span-1 lg:border-t-0 lg:border-l">
              {resultLabel}
            </span>
          </div>
        ) : null}

        <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 border-b border-rule-soft bg-background px-1 pt-2.5 pb-3">
          <div className="inline-flex gap-0.5 rounded-[9px] border border-border bg-canvas-sunk p-[3px]">
            {filters.map((option) => {
              const on = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "inline-flex h-[26px] items-center gap-1.5 rounded-[6px] px-2.5 text-[11.5px] font-semibold transition-colors duration-[120ms]",
                    on ? "bg-card text-foreground shadow-raised" : "text-faint hover:text-foreground"
                  )}
                >
                  <span className={cn(on ? option.tone : "text-hairline")}>{option.icon}</span>
                  {option.label}
                  <span
                    className={cn(
                      "rounded-[4px] px-1 text-[10.5px] tabular-nums",
                      on ? `${option.tone} bg-paper` : "text-faint"
                    )}
                  >
                    {counts[option.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="flex h-[34px] w-[232px] max-w-full items-center gap-[7px] rounded-[8px] border border-border bg-card px-2.5 transition-colors focus-within:border-border-strong">
            <Search className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={1.8} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter projects"
              aria-label="Filter projects"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-faint"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="grid h-4 w-4 place-items-center rounded-full bg-hover text-muted-foreground"
              >
                <X className="h-2.5 w-2.5" strokeWidth={2.6} />
              </button>
            ) : null}
          </label>

          <span className="flex-1" />

          <button
            type="button"
            aria-pressed={prefs.group}
            onClick={() => updatePrefs({ group: !prefs.group })}
            className={cn(
              "inline-flex h-[34px] items-center gap-[7px] rounded-[8px] border border-border px-[11px] text-[12.5px] font-medium transition-colors hover:border-border-strong",
              prefs.group ? "bg-hover text-foreground" : "bg-card text-muted-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" strokeWidth={1.8} />
            Group by status
          </button>

          <div className="inline-flex h-[34px] items-center gap-1.5 rounded-[8px] border border-border bg-card pr-1 pl-2.5 text-[12.5px] text-muted-foreground">
            Sort
            <button
              type="button"
              onClick={() => updatePrefs({ dir: prefs.dir === "asc" ? "desc" : "asc" })}
              title={prefs.dir === "asc" ? "Ascending — click to reverse" : "Descending — click to reverse"}
              className="grid h-[18px] w-[18px] place-items-center rounded-[4px] text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              {prefs.dir === "asc" ? (
                <ArrowUp className="h-3 w-3" strokeWidth={2.2} />
              ) : (
                <ArrowDown className="h-3 w-3" strokeWidth={2.2} />
              )}
            </button>
            <SelectMenu
              value={prefs.sort}
              onValueChange={(next) => setSort(next as SortKey)}
              options={(Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
                value: key,
                label: SORT_LABELS[key],
              }))}
              variant="plain"
              ariaLabel="Sort projects"
              className="h-7 max-w-none px-1.5 text-[12.5px] font-semibold text-foreground hover:bg-hover"
              contentClassName="min-w-[170px]"
            />
          </div>

          <div className="inline-flex gap-0.5 rounded-[9px] border border-border bg-canvas-sunk p-[3px]" role="group" aria-label="View">
            {(
              [
                { value: "list", label: "List", icon: <List className="h-[15px] w-[15px]" strokeWidth={1.8} /> },
                { value: "grid", label: "Cards", icon: <LayoutGrid className="h-[15px] w-[15px]" strokeWidth={1.7} /> },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.label}
                aria-pressed={prefs.view === option.value}
                onClick={() => updatePrefs({ view: option.value })}
                className={cn(
                  "grid h-[26px] w-[30px] place-items-center rounded-[6px] transition-colors duration-[120ms]",
                  prefs.view === option.value
                    ? "bg-card text-foreground shadow-raised"
                    : "text-faint hover:text-foreground"
                )}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-[9px] rounded-[12px] border border-dashed border-border-strong bg-canvas-sunk px-5 pt-14 pb-[60px] text-center">
            <Search className="h-[26px] w-[26px] text-hairline" strokeWidth={1.6} />
            <p className="text-[13.5px] text-muted-foreground">
              {projects.length === 0 ? "No projects yet." : "No project matches that filter."}
            </p>
            {projects.length === 0 ? (
              <ProjectFormDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex h-[30px] items-center rounded-[8px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:border-border-strong"
                  >
                    Create the first one
                  </button>
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className="inline-flex h-[30px] items-center rounded-[8px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:border-border-strong"
              >
                Clear search
              </button>
            )}
          </div>
        ) : prefs.view === "list" ? (
          <div className="overflow-hidden rounded-[12px] border border-border bg-card shadow-raised">
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[minmax(0,1.35fr)_78px_132px_96px_minmax(0,0.9fr)_118px_56px] items-center gap-3.5 border-b border-border bg-canvas-sunk px-[18px] py-[7px] text-[10px] font-bold tracking-[0.075em] text-faint uppercase">
                  <SortHead label="Project" sort="name" prefs={prefs} onSort={headerSort} />
                  <SortHead label="Status" sort="status" prefs={prefs} onSort={headerSort} />
                  <SortHead label="Progress" sort="progress" prefs={prefs} onSort={headerSort} />
                  <SortHead label="Open · done" sort="open" prefs={prefs} onSort={headerSort} align="end" />
                  <span className="text-muted-foreground">Next milestone</span>
                  <SortHead label="Ship" sort="ship" prefs={prefs} onSort={headerSort} />
                  <span />
                </div>
                {groups.map((group) => (
                  <div key={group.label || "all"}>
                    {prefs.group ? (
                      <div className="flex items-center gap-2 border-b border-rule-soft bg-canvas-sunk/60 px-[18px] py-[9px]">
                        <span className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
                          {group.label}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                          {group.rows.length}
                        </span>
                      </div>
                    ) : null}
                    {group.rows.map((project) => {
                      const status = getProjectStatus(project.status);
                      const ship = shipMeta(project, today, mode);
                      const next = project.milestones.find((m) => !m.done);
                      const nextDue = milestoneDue(next ? daysUntil(next.dueDate, today, mode) : null);
                      return (
                        <div
                          key={project.id}
                          id={`project-${project.id}`}
                          role="link"
                          tabIndex={0}
                          onClick={() => router.push(`/projects/${project.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") router.push(`/projects/${project.id}`);
                          }}
                          className="grid cursor-pointer grid-cols-[minmax(0,1.35fr)_78px_132px_96px_minmax(0,0.9fr)_118px_56px] items-center gap-3.5 border-b border-rule-soft px-[18px] py-[11px] outline-none transition-colors duration-[120ms] last:border-b-0 hover:bg-canvas-sunk focus-visible:bg-canvas-sunk"
                        >
                          <span className="flex min-w-0 items-center gap-[11px]">
                            <EntityAvatar
                              name={project.name}
                              color={project.color}
                              logoUrl={project.logoUrl}
                              iconKey={project.iconKey}
                              size={28}
                              rounded="lg"
                            />
                            <span className="min-w-0">
                              <span className="flex items-center gap-[7px]">
                                <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
                                  {project.name}
                                </span>
                                {project.stalled ? (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" title="Stalled" />
                                ) : null}
                              </span>
                              <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                                {project.description || "No description"}
                              </span>
                            </span>
                          </span>
                          <span className={cn("justify-self-start rounded-[5px] px-[7px] py-px text-[10.5px] font-bold", STATUS_PILL[status.tone])}>
                            {status.label}
                          </span>
                          <span className="flex items-center gap-[9px]">
                            <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-track">
                              <span
                                className="block h-full rounded-full transition-[width] duration-200"
                                style={{ width: `${project.completionPct}%`, backgroundColor: project.color }}
                              />
                            </span>
                            <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">
                              {project.completionPct}%
                            </span>
                          </span>
                          <span className="text-right text-[12.5px] text-faint tabular-nums">
                            <b className={cn("font-semibold", project.openCount === 0 ? "text-faint" : "text-foreground")}>
                              {project.openCount}
                            </b>{" "}
                            · {project.doneCount}
                          </span>
                          <span className="min-w-0 truncate text-[12.5px] text-ink-soft">
                            {next ? next.name : "—"}{" "}
                            <span className={nextDue.late ? "text-destructive" : "text-faint"}>{nextDue.label}</span>
                          </span>
                          <span className={cn("text-[12px] font-semibold whitespace-nowrap tabular-nums", SHIP_TONE[ship.tone])}>
                            {ship.label}
                          </span>
                          <span className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditing(project);
                              }}
                              title="Edit project"
                              aria-label={`Edit ${project.name}`}
                              className="grid h-[26px] w-[26px] place-items-center rounded-[7px] text-hairline transition-colors hover:bg-hover hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} />
                            </button>
                            <span className="grid w-5 place-items-center text-hairline">
                              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.9} />
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between bg-canvas-sunk px-[18px] py-[9px] text-[11.5px] text-faint">
              <span>{resultLabel}</span>
              <span>
                Sorted by {SORT_LABELS[prefs.sort].toLowerCase()} {prefs.dir === "asc" ? "↑" : "↓"}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
            {visible.map((project) => {
              const status = getProjectStatus(project.status);
              const ship = shipMeta(project, today, mode);
              const reached = project.milestones.filter((m) => milestoneFlags.get(m.id, m.done)).length;
              return (
                <div
                  key={project.id}
                  id={`project-${project.id}`}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && event.target === event.currentTarget) {
                      router.push(`/projects/${project.id}`);
                    }
                  }}
                  className="flex cursor-pointer flex-col gap-3.5 rounded-[12px] border border-border bg-card p-[18px] shadow-raised outline-none transition-[border-color,box-shadow] duration-[140ms] hover:border-border-strong hover:shadow-float focus-visible:border-border-strong"
                >
                  <div className="flex items-start gap-3">
                    <EntityAvatar
                      name={project.name}
                      color={project.color}
                      logoUrl={project.logoUrl}
                      iconKey={project.iconKey}
                      size={38}
                      rounded="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[16px] font-semibold tracking-[-0.015em]">{project.name}</span>
                        <span className={cn("rounded-[5px] px-[7px] py-px text-[10.5px] font-bold tracking-[0.02em]", STATUS_PILL[status.tone])}>
                          {status.label}
                        </span>
                      </div>
                      {project.description ? (
                        <p className="mt-[5px] text-[13px] leading-[1.5] text-muted-foreground">{project.description}</p>
                      ) : null}
                    </div>
                    <span className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditing(project);
                        }}
                        aria-label={`Edit ${project.name}`}
                        className="grid h-7 w-7 place-items-center rounded-[7px] text-hairline transition-colors hover:bg-hover hover:text-foreground"
                      >
                        <Pencil className="h-[15px] w-[15px]" strokeWidth={1.7} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDelete(deleteTarget(project));
                        }}
                        aria-label={`Delete ${project.name}`}
                        className="grid h-7 w-7 place-items-center rounded-[7px] text-hairline transition-colors hover:bg-destructive-wash hover:text-destructive"
                      >
                        <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.7} />
                      </button>
                    </span>
                  </div>

                  <div>
                    <div className="mb-[7px] flex items-baseline justify-between">
                      <span className="text-[12px] text-muted-foreground">
                        <b className="text-[13px] font-semibold text-foreground tabular-nums">{project.openCount}</b> open ·{" "}
                        {project.doneCount} done
                      </span>
                      <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
                        {project.completionPct}%
                      </span>
                    </div>
                    <span className="block h-[5px] overflow-hidden rounded-full bg-track">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${project.completionPct}%`, backgroundColor: project.color }}
                      />
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-rule-soft pt-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
                        Milestones {project.milestones.length > 0 ? `${reached}/${project.milestones.length}` : ""}
                      </span>
                      <span className={cn("text-[11.5px] font-semibold tabular-nums", SHIP_TONE[ship.tone])}>
                        {ship.label}
                      </span>
                    </div>
                    {project.milestones.length === 0 ? (
                      <span className="text-[12.5px] text-faint">No milestones yet.</span>
                    ) : (
                      project.milestones.map((milestone) => {
                        const done = milestoneFlags.get(milestone.id, milestone.done);
                        const due = done ? null : milestoneDue(daysUntil(milestone.dueDate, today, mode));
                        return (
                          <div
                            key={milestone.id}
                            id={`milestone-${milestone.id}`}
                            className="flex items-center gap-[9px]"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Checkbox
                              checked={done}
                              onCheckedChange={() => void handleToggleMilestone(milestone.id, done)}
                              className="size-4"
                              aria-label={`Toggle ${milestone.name}`}
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-[13px] font-medium",
                                done ? "text-muted-foreground" : "text-foreground"
                              )}
                            >
                              {milestone.name}
                            </span>
                            {due ? (
                              <span className={cn("text-[11px] tabular-nums", due.late ? "text-destructive" : "text-faint")}>
                                {due.label}
                              </span>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {project.stalled ? (
                    <div className="flex items-center gap-2 rounded-[9px] border border-warn-border bg-warn-wash px-[11px] py-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                      <span className="text-[12.5px] font-medium text-warn">
                        {project.idleDays >= 99 ? "Never logged activity" : `No activity for ${project.idleDays} days`} ·{" "}
                        {project.openCount} open
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-auto border-t border-rule-soft pt-3" onClick={(event) => event.stopPropagation()}>
                    {composerFor === project.id ? (
                      <TaskComposer
                        today={today}
                        projectId={project.id}
                        onClose={() => setComposerFor(null)}
                        onError={setActionError}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setComposerFor(project.id)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-border bg-card px-2.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-border-strong"
                      >
                        <Plus className="h-[13px] w-[13px]" strokeWidth={2.2} />
                        Add task
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SortHead({
  label,
  sort,
  prefs,
  onSort,
  align,
}: {
  label: string;
  sort: SortKey;
  prefs: Prefs;
  onSort: (sort: SortKey) => void;
  align?: "end";
}) {
  const active = prefs.sort === sort;
  return (
    <button
      type="button"
      onClick={() => onSort(sort)}
      title={
        active
          ? `Sorted by ${SORT_LABELS[sort].toLowerCase()} — click to reverse, again to reset`
          : `Sort by ${SORT_LABELS[sort].toLowerCase()}`
      }
      className={cn(
        "inline-flex items-center gap-1 text-left tracking-[0.075em] uppercase transition-colors hover:text-foreground",
        active ? "font-bold text-foreground" : "font-bold text-faint",
        align === "end" && "justify-self-end"
      )}
    >
      {label}
      {active ? (
        prefs.dir === "asc" ? (
          <ArrowUp className="h-3 w-3 text-signal" strokeWidth={2.4} />
        ) : (
          <ArrowDown className="h-3 w-3 text-signal" strokeWidth={2.4} />
        )
      ) : null}
    </button>
  );
}
