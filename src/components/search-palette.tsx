"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Flag,
  FolderKanban,
  LayoutGrid,
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

type ResultType = "page" | "project" | "task" | "milestone" | "habit";
type CreateKind = Exclude<ResultType, "page">;
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
  /** Two-letter mark for rows without a logo, like a page. */
  mark?: string;
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
    Icon: LucideIcon;
    aliases: string[];
    createSubtitle: string;
  }
> = {
  page: {
    label: "Page",
    Icon: LayoutGrid,
    aliases: [],
    createSubtitle: "",
  },
  project: {
    label: "Project",
    Icon: FolderKanban,
    aliases: ["project", "projects"],
    createSubtitle: "Add a new project",
  },
  task: {
    label: "Task",
    Icon: ListChecks,
    aliases: ["task", "tasks"],
    createSubtitle: "Add a new task",
  },
  milestone: {
    label: "Milestone",
    Icon: Flag,
    aliases: ["milestone", "milestones"],
    createSubtitle: "Add a milestone to a project",
  },
  habit: {
    label: "Habit",
    Icon: CalendarCheck,
    aliases: ["habit", "habits", "daily"],
    createSubtitle: "Add a new habit",
  },
};

/** The app's pages, always searchable and listed first while the box is empty. */
const PAGES: Array<{
  label: string;
  href: string;
  mark: string;
  Icon: LucideIcon;
  aliases: string[];
}> = [
  { label: "Today", href: "/", mark: "TD", Icon: LayoutGrid, aliases: ["home", "dashboard"] },
  { label: "Projects", href: "/projects", mark: "PR", Icon: FolderKanban, aliases: ["project"] },
  { label: "Habits", href: "/daily", mark: "HB", Icon: CalendarCheck, aliases: ["habit", "daily"] },
  { label: "Analytics", href: "/analytics", mark: "AN", Icon: BarChart3, aliases: ["stats", "insights"] },
];

const TYPE_ORDER: CreateKind[] = ["project", "task", "milestone", "habit"];
const EMPTY_LIMIT = 4;

function queryTokens(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function isInboxQuery(query: string): boolean {
  return query.trim().toLowerCase() === "inbox";
}

function isTypeQuery(query: string, type: CreateKind): boolean {
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

/** "Create …" shortcut for a type-name query; pages cover "see all". */
function createAction(type: CreateKind): PaletteItem {
  const meta = TYPE_META[type];
  return {
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
  };
}

function pageItems(query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  return PAGES.filter(
    (page) =>
      !q ||
      page.label.toLowerCase().includes(q) ||
      page.aliases.some((alias) => alias.startsWith(q))
  ).map((page) => ({
    key: `page-${page.href}`,
    type: "page",
    title: page.label,
    subtitle: "",
    href: page.href,
    badge: TYPE_META.page.label,
    name: page.label,
    logoUrl: null,
    iconKey: null,
    color: null,
    mark: page.mark,
  }));
}

function buildItems(index: SearchIndex, query: string): PaletteItem[] {
  const limit = query.trim() ? Number.POSITIVE_INFINITY : EMPTY_LIMIT;
  const items: PaletteItem[] = pageItems(query);
  const inboxHit = isInboxQuery(query);

  for (const type of TYPE_ORDER) {
    const typeHit = isTypeQuery(query, type);
    if (typeHit) items.push(createAction(type));

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
          subtitle: "Open and finished unfiled tasks",
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

/** The 22px mark at the start of a row: a logo, the inbox tray, or a chip. */
function ResultMark({ item }: { item: PaletteItem }) {
  if (item.action === "create") {
    return (
      <span className="inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border border-signal-wash bg-signal-wash text-signal">
        <Plus className="h-3 w-3" strokeWidth={2.2} />
      </span>
    );
  }
  if (item.inbox) return <InboxAvatar size={22} />;
  if (item.type === "page") {
    return (
      <span className="inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border border-border bg-canvas-sunk text-[9.5px] font-bold tracking-[0.02em] text-muted-foreground">
        {item.mark}
      </span>
    );
  }
  return (
    <EntityAvatar
      name={item.name}
      color={item.color}
      logoUrl={item.logoUrl}
      iconKey={item.iconKey}
      size={22}
    />
  );
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
    if (item.action === "create" && item.type !== "page") {
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
          className="w-[min(calc(100%-1.5rem),560px)] max-w-[560px] gap-0 overflow-hidden rounded-[14px] p-0 shadow-[0_30px_70px_-24px_rgb(15_15_15/0.5)] sm:max-w-[560px] dh:top-[112px] dh:max-h-[430px]"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Jump to a page, project, task, milestone or habit
          </DialogDescription>
          <div className="flex shrink-0 items-center gap-2.5 border-b border-rule-soft px-[15px] py-[13px]">
            <Search className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.8} />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Jump to a page, project, task or habit…"
              className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-faint dh:text-[14.5px]"
              role="combobox"
              aria-expanded
              aria-controls="search-palette-results"
              aria-activedescendant={items[activeIndex]?.key}
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden rounded-[5px] border border-border px-1.5 py-0.5 font-mono text-[11px] font-semibold text-faint sm:inline">
              esc
            </kbd>
          </div>
          <div
            id="search-palette-results"
            role="listbox"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
          >
            {items.length === 0 ? (
              <div className="px-2.5 pt-[34px] pb-[38px] text-center">
                <p className="text-[13.5px] text-muted-foreground">
                  {query.trim() ? "Nothing matches that search." : "Nothing to search yet."}
                </p>
                <p className="mt-1 text-[12px] text-faint">
                  {query.trim()
                    ? "Try a project name, a task title or a page."
                    : "Add a project, task or habit and it will show up here."}
                </p>
              </div>
            ) : (
              items.map((item, index) => (
                <button
                  key={item.key}
                  id={item.key}
                  ref={index === activeIndex ? activeRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                  className={cn(
                    "flex h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors duration-[120ms]",
                    index === activeIndex && "bg-canvas-sunk"
                  )}
                >
                  <ResultMark item={item} />
                  <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                    <span className="min-w-0 truncate text-[13.5px] font-medium">
                      <Highlight text={item.title} query={query} />
                    </span>
                    {item.subtitle ? (
                      // Gives way before the title does, but never vanishes.
                      <span className="min-w-[72px] shrink-[4] truncate text-[12px] text-faint">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </span>
                  {item.statusMark ? (
                    <span title={item.statusMark.label} className="shrink-0">
                      <OptionMark
                        icon={item.statusMark.Icon}
                        tone={item.statusMark.tone}
                        size={15}
                      />
                    </span>
                  ) : null}
                  <span className="shrink-0 text-[11.5px] text-faint">{item.badge}</span>
                </button>
              ))
            )}
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
