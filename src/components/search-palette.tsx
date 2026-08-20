"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Flag,
  FolderKanban,
  ListChecks,
  Plus,
  Search,
} from "lucide-react";
import { loadSearchIndex } from "@/app/actions/search";
import { CreateTaskDialog } from "@/components/dashboard/create-task-dialog";
import { DailyTaskFormDialog } from "@/components/daily/daily-task-form-dialog";
import { CreateMilestoneDialog } from "@/components/projects/create-milestone-dialog";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { OptionMark } from "@/components/ui/option-mark";
import type { SearchIndex } from "@/lib/search";
import {
  getHabitStatus,
  getProjectStatus,
  type OptionTone,
} from "@/lib/status";
import { cn, formatCount } from "@/lib/utils";

type SearchPaletteProps = {
  index: SearchIndex;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ResultType = "project" | "task" | "milestone" | "habit";
type CreateKind = ResultType;
type ItemAction = "see" | "create";

type PaletteItem = {
  key: string;
  type: ResultType;
  title: string;
  subtitle: string;
  href?: string;
  action?: ItemAction;
  badge: string;
  name: string;
  logoUrl: string | null;
  iconKey: string | null;
  color: string | null;
  inbox?: boolean;
  statusMark?: {
    Icon: LucideIcon;
    tone: OptionTone;
    label: string;
  };
};

const TYPE_META: Record<
  ResultType,
  {
    label: string;
    plural: string;
    Icon: typeof FolderKanban;
    aliases: string[];
    seeHref: string;
    seeSubtitle: string;
    createSubtitle: string;
  }
> = {
  project: {
    label: "Project",
    plural: "Projects",
    Icon: FolderKanban,
    aliases: ["project", "projects"],
    seeHref: "/projects",
    seeSubtitle: "Open the projects page",
    createSubtitle: "Add a new project",
  },
  task: {
    label: "Task",
    plural: "Tasks",
    Icon: ListChecks,
    aliases: ["task", "tasks"],
    seeHref: "/",
    seeSubtitle: "Open today’s open work",
    createSubtitle: "Add a new task",
  },
  milestone: {
    label: "Milestone",
    plural: "Milestones",
    Icon: Flag,
    aliases: ["milestone", "milestones"],
    seeHref: "/projects",
    seeSubtitle: "See milestones on projects",
    createSubtitle: "Add a milestone to a project",
  },
  habit: {
    label: "Habit",
    plural: "Habits",
    Icon: CalendarCheck,
    aliases: ["habit", "habits", "daily"],
    seeHref: "/daily",
    seeSubtitle: "Open the habits page",
    createSubtitle: "Add a new habit",
  },
};

const TYPE_ORDER: ResultType[] = ["project", "task", "milestone", "habit"];
const EMPTY_LIMIT = 4;

function queryTokens(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function isInboxQuery(query: string): boolean {
  return query.trim().toLowerCase() === "inbox";
}

function isTypeQuery(query: string, type: ResultType): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return TYPE_META[type].aliases.some(
    (alias) => alias === q || (q.length >= 3 && alias.startsWith(q))
  );
}

function matchesQuery(
  query: string,
  ...fields: Array<string | null | undefined>
) {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return true;
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function matchScore(
  query: string,
  title: string | null | undefined
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = (title ?? "").toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  const first = queryTokens(query)[0];
  if (first && t.startsWith(first)) return 2;
  if (t.includes(q)) return 3;
  return 4;
}

function takeMatching<T>(
  list: T[],
  query: string,
  fields: (item: T) => Array<string | null | undefined>,
  map: (item: T) => PaletteItem,
  limit: number
): PaletteItem[] {
  const ranked: Array<{ item: T; score: number; index: number }> = [];
  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    const values = fields(item);
    if (!matchesQuery(query, ...values)) continue;
    ranked.push({ item, score: matchScore(query, values[0]), index });
  }
  ranked.sort((a, b) => a.score - b.score || a.index - b.index);
  return ranked
    .slice(0, Number.isFinite(limit) ? limit : ranked.length)
    .map((row) => map(row.item));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  const tokens = [
    ...new Set(queryTokens(query).filter((token) => token.length >= 2)),
  ].sort((a, b) => b.length - a.length);
  const skip =
    tokens.length === 1 &&
    (isInboxQuery(query) || TYPE_ORDER.some((type) => isTypeQuery(query, type)));
  if (tokens.length === 0 || skip) return text;

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, index) => {
        const isMatch = tokens.some(
          (token) => token === part.toLowerCase()
        );
        return isMatch ? (
          <span key={index} className="text-signal">
            {part}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </>
  );
}

function joinMeta(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function projectHref(status: "ACTIVE" | "PAUSED" | "DONE", id: string) {
  if (status === "DONE") return `/projects#project-${id}`;
  return `/?project=${id}`;
}

function typeActions(type: ResultType): PaletteItem[] {
  const meta = TYPE_META[type];
  return [
    {
      key: `see-${type}`,
      type,
      title: `See all ${meta.plural.toLowerCase()}`,
      subtitle: meta.seeSubtitle,
      href: meta.seeHref,
      action: "see",
      badge: "View",
      name: meta.label,
      logoUrl: null,
      iconKey: null,
      color: null,
    },
    {
      key: `create-${type}`,
      type,
      title: `Create ${meta.label.toLowerCase()}`,
      subtitle: meta.createSubtitle,
      action: "create",
      badge: "Create",
      name: meta.label,
      logoUrl: null,
      iconKey: null,
      color: null,
    },
  ];
}

function buildItems(index: SearchIndex, query: string): PaletteItem[] {
  const limit = query.trim() ? Number.POSITIVE_INFINITY : EMPTY_LIMIT;
  const items: PaletteItem[] = [];
  const inboxHit = isInboxQuery(query);

  for (const type of TYPE_ORDER) {
    const typeHit = isTypeQuery(query, type);
    if (typeHit) items.push(...typeActions(type));

    const entityQuery = typeHit ? "" : query;

    if (type === "project") {
      items.push(
        ...takeMatching(
          index.projects,
          entityQuery,
          (project) => [project.name, project.description],
          (project) => ({
            key: `project-${project.id}`,
            type: "project",
            title: project.name,
            subtitle: joinMeta([
              formatCount(project.openCount, "open task"),
              project.dueLabel ? `due ${project.dueLabel}` : null,
            ]),
            href: projectHref(project.status, project.id),
            badge: TYPE_META.project.label,
            name: project.name,
            logoUrl: project.logoUrl,
            iconKey: project.iconKey,
            color: project.color,
            statusMark:
              project.status === "ACTIVE"
                ? undefined
                : getProjectStatus(project.status),
          }),
          limit
        )
      );
    }

    if (type === "task") {
      if (inboxHit) {
        items.push({
          key: "see-inbox",
          type: "task",
          title: "See inbox",
          subtitle: "Open and logged unfiled tasks",
          href: "/?project=inbox",
          action: "see",
          badge: "Inbox",
          name: "Inbox",
          logoUrl: null,
          iconKey: null,
          color: null,
          inbox: true,
        });
        items.push({
          key: "create-inbox",
          type: "task",
          title: "Add to inbox",
          subtitle: "Capture a task without a project",
          action: "create",
          badge: "Create",
          name: "Inbox",
          logoUrl: null,
          iconKey: null,
          color: null,
          inbox: true,
        });
      }

      const taskList = inboxHit
        ? index.tasks.filter((task) => !task.project)
        : index.tasks;
      const taskQuery = inboxHit ? "" : entityQuery;

      items.push(
        ...takeMatching(
          taskList,
          taskQuery,
          (task) => [
            task.title,
            task.notes,
            task.project?.name,
            task.project ? null : "Inbox",
            task.addedLabel,
          ],
          (task) => ({
            key: `task-${task.id}`,
            type: "task",
            title: task.title,
            subtitle: joinMeta([
              task.project?.name ?? "Inbox",
              task.addedLabel,
              task.completedLabel,
              task.status === "DONE" ? null : task.dueLabel,
            ]),
            href: !task.projectId
              ? `/?project=inbox#task-${task.id}`
              : task.visibleOnToday
                ? `/?project=${task.projectId}#task-${task.id}`
                : `/projects#project-${task.projectId}`,
            badge: task.project ? TYPE_META.task.label : "Inbox",
            name: task.project?.name ?? task.title,
            logoUrl: task.project?.logoUrl ?? null,
            iconKey: task.project?.iconKey ?? null,
            color: task.project?.color ?? null,
            inbox: !task.project,
            statusMark:
              task.status === "DONE"
                ? { Icon: CheckCircle2, tone: "done", label: "Done" }
                : undefined,
          }),
          limit
        )
      );
    }

    if (type === "milestone") {
      items.push(
        ...takeMatching(
          index.milestones,
          entityQuery,
          (milestone) => [milestone.name, milestone.project.name],
          (milestone) => ({
            key: `milestone-${milestone.id}`,
            type: "milestone",
            title: milestone.name,
            subtitle: joinMeta([
              milestone.project.name,
              milestone.dueLabel,
            ]),
            href: `/projects#milestone-${milestone.id}`,
            badge: TYPE_META.milestone.label,
            name: milestone.project.name,
            logoUrl: milestone.project.logoUrl,
            iconKey: milestone.project.iconKey,
            color: milestone.project.color,
            statusMark: milestone.done
              ? { Icon: CheckCircle2, tone: "done", label: "Done" }
              : undefined,
          }),
          limit
        )
      );
    }

    if (type === "habit") {
      items.push(
        ...takeMatching(
          index.habits,
          entityQuery,
          (habit) => [habit.title],
          (habit) => ({
            key: `habit-${habit.id}`,
            type: "habit",
            title: habit.title,
            subtitle: habit.scheduleLabel,
            href: `/daily#habit-${habit.id}`,
            badge: TYPE_META.habit.label,
            name: habit.title,
            logoUrl: habit.logoUrl,
            iconKey: habit.iconKey,
            color: null,
            statusMark: habit.isActive
              ? undefined
              : getHabitStatus(false),
          }),
          limit
        )
      );
    }
  }

  return items;
}

export function SearchPalette({
  index: initialIndex,
  open,
  onOpenChange,
}: SearchPaletteProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const activeRef = React.useRef<HTMLButtonElement>(null);
  const [catalog, setCatalog] = React.useState(initialIndex);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [createKind, setCreateKind] = React.useState<CreateKind | null>(null);

  const items = React.useMemo(
    () => buildItems(catalog, query),
    [catalog, query]
  );

  React.useEffect(() => {
    setCatalog(initialIndex);
  }, [initialIndex]);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    void loadSearchIndex()
      .then(setCatalog)
      .catch(() => {});
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  React.useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(Math.max(0, items.length - 1));
    }
  }, [activeIndex, items.length]);

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function close() {
    onOpenChange(false);
  }

  function openCreate(kind: CreateKind) {
    close();
    window.setTimeout(() => setCreateKind(kind), 140);
  }

  function select(item: PaletteItem) {
    if (item.action === "create") {
      openCreate(item.type);
      return;
    }
    close();
    if (item.href) router.push(item.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        items.length === 0 ? 0 : (current + 1) % items.length
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        items.length === 0 ? 0 : (current - 1 + items.length) % items.length
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) select(item);
    }
  }

  const projectOptions = catalog.projects.map((project) => ({
    id: project.id,
    name: project.name,
    iconKey: project.iconKey,
    logoUrl: project.logoUrl,
    color: project.color,
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showClose={false}
          placement="top"
          className="w-[min(calc(100%-1.5rem),480px)] max-w-[480px] gap-0 overflow-hidden p-0 sm:max-w-[480px]"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search projects, tasks, milestones, and habits
          </DialogDescription>
          <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
            <Search className="h-4 w-4 shrink-0 text-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Find a task or inbox…"
              className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-faint dh:text-[14.5px]"
              role="combobox"
              aria-expanded
              aria-controls="search-palette-results"
              aria-activedescendant={items[activeIndex]?.key}
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden rounded border border-border bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-faint sm:inline">
              esc
            </kbd>
          </div>
          <div
            id="search-palette-results"
            role="listbox"
            className="max-h-[min(360px,50dvh)] overflow-y-auto overscroll-contain py-1.5"
          >
            {items.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-[13px] text-muted-foreground">
                {query.trim()
                  ? `No matches for “${query.trim()}”. Try a task title or inbox.`
                  : "Nothing to search yet."}
              </p>
            ) : (
              items.map((item, index) => {
                const meta = TYPE_META[item.type];
                const TypeIcon = meta.Icon;
                const showTypeHeader =
                  index === 0 || items[index - 1]?.type !== item.type;

                return (
                  <React.Fragment key={item.key}>
                    {showTypeHeader && (
                      <p className="px-3.5 pt-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-faint uppercase">
                        {meta.plural}
                      </p>
                    )}
                    <button
                      id={item.key}
                      ref={index === activeIndex ? activeRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => select(item)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors duration-[120ms]",
                        index === activeIndex
                          ? "bg-hover"
                          : "hover:bg-canvas-sunk"
                      )}
                    >
                      {item.action === "see" && item.inbox ? (
                        <InboxAvatar size={28} />
                      ) : item.action === "see" ? (
                        <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-paper text-muted-foreground">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      ) : item.action === "create" ? (
                        <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-md border border-signal-wash bg-signal-wash text-signal">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      ) : item.inbox ? (
                        <InboxAvatar size={28} />
                      ) : (
                        <EntityAvatar
                          name={item.name}
                          color={item.color}
                          logoUrl={item.logoUrl}
                          iconKey={item.iconKey}
                          size={28}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">
                          <Highlight text={item.title} query={query} />
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-faint">
                          {item.subtitle}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        {item.statusMark ? (
                          <span title={item.statusMark.label}>
                            <OptionMark
                              icon={item.statusMark.Icon}
                              tone={item.statusMark.tone}
                              size={16}
                            />
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 rounded border border-border bg-paper px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[0.02em] text-muted-foreground">
                          {item.action ? (
                            item.action === "create" ? (
                              <Plus className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )
                          ) : (
                            <TypeIcon className="h-3 w-3" />
                          )}
                          {item.badge}
                        </span>
                      </span>
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border px-3.5 py-2">
            <p className="text-[11.5px] text-faint">
              Projects, tasks, inbox, habits
            </p>
            <p className="hidden text-[11.5px] text-faint sm:block">
              ↑↓ move · ↵ open
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <ProjectFormDialog
        open={createKind === "project"}
        onOpenChange={(next) => {
          if (!next) setCreateKind(null);
        }}
      />
      <CreateTaskDialog
        projects={projectOptions}
        open={createKind === "task"}
        onOpenChange={(next) => {
          if (!next) setCreateKind(null);
        }}
      />
      <CreateMilestoneDialog
        projects={projectOptions}
        open={createKind === "milestone"}
        onOpenChange={(next) => {
          if (!next) setCreateKind(null);
        }}
        onCreateProject={() => setCreateKind("project")}
      />
      <DailyTaskFormDialog
        open={createKind === "habit"}
        onOpenChange={(next) => {
          if (!next) setCreateKind(null);
        }}
      />
    </>
  );
}
