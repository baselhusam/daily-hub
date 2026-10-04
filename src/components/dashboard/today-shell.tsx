"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { toggleDailyTask } from "@/app/actions/daily-tasks";
import { setProjectFocus, setTaskFocus } from "@/app/actions/focus";
import { toggleTask } from "@/app/actions/tasks";
import type { DashboardData } from "@/lib/dashboard";
import { getGreeting, isOverdue } from "@/lib/dates";
import { focusRemainingLabel, isFocusActive } from "@/lib/focus";
import { useDisplayDay } from "@/lib/hydration";
import { useOptimisticFlags } from "@/lib/optimistic-toggle";
import { useCollapsedProjects } from "@/lib/use-collapsed-projects";
import { cn, isTypingTarget } from "@/lib/utils";
import { BackToTop } from "./back-to-top";
import { CaptureBar, type CaptureBarHandle } from "./capture-bar";
import { ClosedEachDayCard, ClosedEachDayDialog, toClosedPoints } from "./closed-each-day";
import { FocusStrip, type FocusStripItem } from "./focus-strip";
import { HabitsCard } from "./habits-card";
import { InboxCard } from "./inbox-card";
import { MomentumAnalysisDialog, MomentumCard } from "./momentum-card";
import { isSameFocus, NudgeRow, type NudgeFocus } from "./nudge-row";
import { OpenTasksCard } from "./open-tasks-card";
import { ProjectGroup } from "./project-group";
import { UpNextCard } from "./up-next-card";
import { WEEK_REVIEW_ID, WeekReviewBanner } from "./week-review-banner";

const UP_NEXT_ID = "up-next";

/** Rail cards a nudge focus did not pick step back without leaving the layout. */
const DIMMED = "opacity-45 transition-opacity duration-[160ms] hover:opacity-100";

type TodayShellProps = {
  data: DashboardData;
};

export function TodayShell({ data }: TodayShellProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectFilter = searchParams.get("project");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [momentumOpen, setMomentumOpen] = React.useState(false);
  const [closedOpen, setClosedOpen] = React.useState(false);
  const captureRef = React.useRef<CaptureBarHandle>(null);

  const taskFlags = React.useMemo(
    () => [
      ...data.projects.flatMap((project) =>
        project.tasks.map((task) => ({ id: task.id, value: task.done }))
      ),
      ...data.inboxTasks.map((task) => ({ id: task.id, value: task.done })),
    ],
    [data.projects, data.inboxTasks]
  );
  const habitFlags = React.useMemo(
    () => data.dailyTasks.map((habit) => ({ id: habit.id, value: habit.completedToday })),
    [data.dailyTasks]
  );
  const optimisticTasks = useOptimisticFlags(taskFlags);
  const optimisticHabits = useOptimisticFlags(habitFlags);
  const { today, mode, hydrated } = useDisplayDay(data.todayISO);
  const closedPoints = React.useMemo(() => toClosedPoints(data.activity), [data.activity]);

  // The greeting and date come from the server first so the HTML matches, then
  // follow the browser's clock once hydrated (a late-night user may be a day
  // ahead of the server).
  const eyebrow = hydrated ? format(today, "EEEE, MMMM d") : data.todayEyebrow;
  const greeting = (hydrated ? getGreeting(data.settings.displayName) : data.greeting).replace(
    /\.$/,
    ""
  );

  const filterProject = data.projects.find((project) => project.id === projectFilter);
  const inboxOnly = projectFilter === "inbox";

  // A nudge pill's focus lives in the URL next to the project filter, so Back,
  // Escape, and the scope chip all clear it the same way.
  const focusParam = searchParams.get("focus");
  const focus: NudgeFocus | null =
    focusParam === "overdue"
      ? { kind: "overdue" }
      : focusParam === "milestones"
        ? { kind: "milestones" }
        : focusParam === "focused"
          ? { kind: "focused" }
          : focusParam === "stalled" && filterProject
            ? { kind: "stalled", projectId: filterProject.id }
            : null;

  const scoped = Boolean(filterProject) || inboxOnly || Boolean(focus);
  const scopeLabel =
    focus?.kind === "overdue"
      ? "Overdue"
      : focus?.kind === "milestones"
        ? "Milestones this week"
        : focus?.kind === "focused"
          ? "Focus mode"
          : focus?.kind === "stalled" && filterProject
          ? `${filterProject.name} · stalled`
          : (filterProject?.name ?? (inboxOnly ? "Inbox" : null));

  // Picked from the server's done state, not the optimistic one, so a task
  // checked off under the overdue focus stays on screen (struck through)
  // instead of vanishing from under the cursor.
  const overdueTaskIds =
    focus?.kind === "overdue"
      ? new Set(
          [...data.projects.flatMap((project) => project.tasks), ...data.inboxTasks]
            .filter((task) => !task.done && isOverdue(task.dueDate, today, mode))
            .map((task) => task.id)
        )
      : undefined;
  const milestoneProjectIds = new Set(
    data.nudges.milestonesThisWeek.map((item) => item.projectId)
  );

  // What the user chose to focus on. Lapsed focuses drop out here rather than
  // on the server, so they follow the browser's day like everything else.
  // Finished projects leave focus with their status; a task finished today
  // stays (struck through) so checking it off from the strip is visible.
  const focusedProjects = data.projects.filter(
    (project) => project.status !== "DONE" && isFocusActive(project, today, mode)
  );
  const focusedProjectIds = new Set(focusedProjects.map((project) => project.id));
  const focusedTasks = [
    ...data.projects.flatMap((project) =>
      project.tasks.map((task) => ({ task, project: project as typeof project | null }))
    ),
    ...data.inboxTasks.map((task) => ({ task, project: null })),
  ].filter(
    ({ task }) => (!task.done || task.doneToday) && isFocusActive(task, today, mode)
  );
  const focusedTaskIds = new Set(focusedTasks.map(({ task }) => task.id));
  const focusItems: FocusStripItem[] = [
    ...focusedProjects.map((project) => ({
      kind: "project" as const,
      id: project.id,
      name: project.name,
      color: project.color,
      logoUrl: project.logoUrl,
      iconKey: project.iconKey,
      remaining: focusRemainingLabel(project, today, mode) ?? "",
      openCount: project.tasks.filter((task) => !optimisticTasks.get(task.id, task.done)).length,
    })),
    ...focusedTasks.map(({ task, project }) => ({
      kind: "task" as const,
      id: task.id,
      title: task.title,
      done: optimisticTasks.get(task.id, task.done),
      remaining: focusRemainingLabel(task, today, mode) ?? "",
      project: project ? { name: project.name, color: project.color } : null,
    })),
  ];

  React.useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [projectFilter, focusParam]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !scoped) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector("[data-slot='dialog-content'], [data-slot='popover-content']")) {
        return;
      }
      event.preventDefault();
      router.push("/");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scoped, router]);

  const scopedProjects = filterProject
    ? [filterProject]
    : inboxOnly
      ? []
      : data.projects;
  const visibleProjects =
    focus?.kind === "overdue"
      ? scopedProjects.filter((project) =>
          project.tasks.some((task) => overdueTaskIds?.has(task.id))
        )
      : focus?.kind === "milestones"
        ? scopedProjects.filter((project) => milestoneProjectIds.has(project.id))
        : focus?.kind === "focused"
          ? scopedProjects.filter(
              (project) =>
                focusedProjectIds.has(project.id) ||
                project.tasks.some((task) => focusedTaskIds.has(task.id))
            )
          : scopedProjects;
  // Projects in focus lead Open work, ahead of the usual recent-activity order.
  const orderedProjects = [
    ...visibleProjects.filter((project) => focusedProjectIds.has(project.id)),
    ...visibleProjects.filter((project) => !focusedProjectIds.has(project.id)),
  ];
  const inboxMatchesFocus =
    (focus?.kind === "overdue" && data.inboxTasks.some((task) => overdueTaskIds?.has(task.id))) ||
    (focus?.kind === "focused" && data.inboxTasks.some((task) => focusedTaskIds.has(task.id)));
  // Focus mode and the overdue pill both hold every card open: folding one
  // would hide exactly what the pill asked to see.
  const holdOpen = focus?.kind === "overdue" || focus?.kind === "focused";

  // Every project, not just the visible ones: the hook prunes overrides for
  // ids it is not given, and a filter must not wipe out the hidden cards'.
  const collapseInputs = data.projects.map((project) => {
    const openCount = project.tasks.filter(
      (task) => !optimisticTasks.get(task.id, task.done)
    ).length;
    return {
      id: project.id,
      // A project the user navigated into is being read in full — never fold
      // it away underneath them.
      autoCollapsed:
        filterProject?.id !== project.id &&
        (project.status === "DONE" || (project.tasks.length > 1 && openCount === 0)),
    };
  });
  const {
    isCollapsed,
    toggle: toggleCollapsed,
    setAll: setAllCollapsed,
  } = useCollapsedProjects(collapseInputs);
  const allCollapsed =
    visibleProjects.length > 0 && visibleProjects.every((project) => isCollapsed(project.id));
  const noneCollapsed = visibleProjects.every((project) => !isCollapsed(project.id));

  const openTotal =
    data.stats.openTasks +
    taskFlags.reduce((delta, task) => {
      const shown = optimisticTasks.get(task.id, task.value);
      if (shown === task.value) return delta;
      return delta + (shown ? -1 : 1);
    }, 0);
  const habitsDone = data.dailyTasks.filter((habit) =>
    optimisticHabits.get(habit.id, habit.completedToday)
  ).length;
  const habitsDue = data.dailyTasks.length;
  const summary = [
    data.stats.overdueTasks > 0 ? `${data.stats.overdueTasks} overdue` : null,
    `${openTotal} still open`,
    habitsDue > 0 ? `${habitsDone} of ${habitsDue} habits done.` : "no habits today.",
  ]
    .filter(Boolean)
    .join(" · ");

  async function handleToggleTask(taskId: string, currentlyDone: boolean) {
    setActionError(null);
    try {
      const result = await optimisticTasks.run(taskId, currentlyDone, () => toggleTask(taskId));
      if (!result.success) {
        setActionError(result.error ?? "Could not update this task. Try again.");
      }
    } catch {
      setActionError("Could not update this task. Try again.");
    }
  }

  async function handleToggleHabit(habitId: string, currentlyDone: boolean) {
    setActionError(null);
    try {
      const result = await optimisticHabits.run(habitId, currentlyDone, () =>
        toggleDailyTask(habitId)
      );
      if (!result.success) {
        setActionError(result.error ?? "Could not update this habit. Try again.");
      }
    } catch {
      setActionError("Could not update this habit. Try again.");
    }
  }

  function jumpToOverdue() {
    const target = document.querySelector<HTMLElement>("[data-overdue]");
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.animate(
      [
        { backgroundColor: "var(--destructive-wash)" },
        { backgroundColor: "var(--destructive-wash)", offset: 0.6 },
        { backgroundColor: "transparent" },
      ],
      { duration: 1400, easing: "ease-out" }
    );
  }

  function toggleFocus(next: NudgeFocus) {
    const href = isSameFocus(focus, next)
      ? "/"
      : next.kind === "stalled"
        ? `/?project=${encodeURIComponent(next.projectId)}&focus=stalled`
        : `/?focus=${next.kind}`;
    router.push(href, { scroll: false });
  }

  /** Bring a focus pill's card or row into view, unfolding its project first. */
  function jumpToFocusItem(item: FocusStripItem) {
    const projectId =
      item.kind === "project"
        ? item.id
        : data.projects.find((project) => project.tasks.some((task) => task.id === item.id))?.id;
    if (projectId && isCollapsed(projectId) && !holdOpen) toggleCollapsed(projectId);
    const targetId = item.kind === "project" ? `project-${item.id}` : `task-${item.id}`;
    // A frame for the unfold to mount the row before measuring it.
    requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) {
        // Filtered out of view: drop the filter and let the hash scroll to it.
        router.push(`/#${targetId}`, { scroll: false });
        return;
      }
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.animate(
        [
          { boxShadow: "0 0 0 3px color-mix(in srgb, var(--signal) 28%, transparent)" },
          { boxShadow: "0 0 0 3px color-mix(in srgb, var(--signal) 28%, transparent)", offset: 0.6 },
          { boxShadow: "0 0 0 0 transparent" },
        ],
        { duration: 1400, easing: "ease-out" }
      );
    });
  }

  async function clearFocusItem(item: FocusStripItem) {
    setActionError(null);
    const result =
      item.kind === "project"
        ? await setProjectFocus(item.id, null)
        : await setTaskFocus(item.id, null);
    if (!result.success) setActionError(result.error ?? "Could not update focus. Try again.");
  }

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const isFreshWorkspace =
    !scoped && data.projects.length === 0 && data.inboxTasks.every((task) => task.done);
  const captureProjects = data.projects.map((project) => ({
    id: project.id,
    name: project.name,
    iconKey: project.iconKey,
    logoUrl: project.logoUrl,
    color: project.color,
  }));

  const rail = (
    // Sticky with its own scroll for short viewports. The bottom fade shows
    // that a clipped card continues, and the padding keeps the last card's
    // edge clear of it. Its grid cell must stretch to the full row (the grid
    // is items-start) or there is nothing to stick in.
    <div className="flex flex-col gap-3 @min-[760px]:sticky @min-[760px]:top-4 @min-[760px]:max-h-[calc(100svh-4.75rem)] @min-[760px]:overflow-y-auto @min-[760px]:overscroll-contain @min-[760px]:px-0.5 @min-[760px]:pb-8 @min-[760px]:[scrollbar-width:thin] @min-[760px]:[mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]">
      <HabitsCard
        habits={data.dailyTasks}
        getDone={(id, fallback) => optimisticHabits.get(id, fallback)}
        onToggle={(id, done) => void handleToggleHabit(id, done)}
        className={cn("shrink-0", focus && DIMMED)}
      />
      {!inboxOnly &&
      ((focus?.kind !== "overdue" && focus?.kind !== "focused") || inboxMatchesFocus) ? (
        <InboxCard
          tasks={data.inboxTasks}
          projects={data.projects}
          today={today}
          mode={mode}
          getDone={(id, fallback) => optimisticTasks.get(id, fallback)}
          onToggle={(id, done) => void handleToggleTask(id, done)}
          onError={setActionError}
          onCapture={() => captureRef.current?.focus({ projectId: null })}
          focusTaskIds={focus?.kind === "focused" ? focusedTaskIds : overdueTaskIds}
          tintMatches={focus?.kind !== "focused"}
          className={cn(
            "shrink-0",
            focus && focus.kind !== "overdue" && focus.kind !== "focused" && DIMMED
          )}
        />
      ) : null}
      {focus?.kind === "milestones" ? (
        <UpNextCard
          id={UP_NEXT_ID}
          items={data.nudges.milestonesThisWeek}
          heading="Milestones this week"
          highlighted
          className="shrink-0"
        />
      ) : (
        <UpNextCard
          id={UP_NEXT_ID}
          items={data.upNext}
          className={cn("shrink-0", focus && DIMMED)}
        />
      )}
    </div>
  );

  return (
    <div className="page-gutter @container animate-dh-fade pt-[clamp(18px,2.4vw,26px)] pb-12">
      <MomentumAnalysisDialog
        momentum={data.momentum}
        open={momentumOpen}
        onOpenChange={setMomentumOpen}
      />
      <ClosedEachDayDialog points={closedPoints} open={closedOpen} onOpenChange={setClosedOpen} />

      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
              {eyebrow}
            </div>
            <h1 className="mt-[7px] text-[clamp(1.6rem,3.4vw,1.875rem)] leading-[1.1] tracking-[-0.035em]">
              {greeting}
            </h1>
            <p className="mt-[7px] text-[14px] text-muted-foreground">{summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => jumpTo(WEEK_REVIEW_ID)}
              className="inline-flex h-[34px] items-center rounded-[8px] border border-border bg-card px-[13px] text-[13px] font-medium text-foreground shadow-raised transition-colors duration-[120ms] hover:border-border-strong"
            >
              Week review
            </button>
            <button
              type="button"
              onClick={() => captureRef.current?.focus()}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[8px] bg-signal px-3.5 text-[13px] font-semibold text-primary-foreground shadow-[0_1px_1px_color-mix(in_srgb,var(--signal)_22%,transparent)] transition-colors duration-[120ms] hover:bg-signal-hover"
            >
              <Plus className="h-[15px] w-[15px]" strokeWidth={2.4} />
              New task
            </button>
          </div>
        </header>

        <CaptureBar
          ref={captureRef}
          projects={captureProjects}
          defaultProjectId={filterProject?.id}
          onError={setActionError}
        />

        {actionError ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-[10px] border border-destructive/25 bg-destructive-wash px-3.5 py-2.5 text-[13px] text-destructive"
          >
            {actionError}
          </p>
        ) : null}

        <FocusStrip
          items={focusItems}
          active={focus?.kind === "focused"}
          onToggleMode={() => toggleFocus({ kind: "focused" })}
          onJump={jumpToFocusItem}
          onToggleTask={(id, done) => void handleToggleTask(id, done)}
          onClear={(item) => void clearFocusItem(item)}
        />

        <NudgeRow nudges={data.nudges} active={focus} onToggle={toggleFocus} />

        <section
          aria-label="Daily pulse"
          // Sized by the page, not the viewport, so the sidebar's state and
          // the window width both feed into which layout fits.
          className="grid grid-cols-1 gap-3 @min-[540px]:grid-cols-2 @min-[880px]:grid-cols-[minmax(0,0.82fr)_minmax(0,1.05fr)_minmax(0,1.5fr)]"
        >
          <OpenTasksCard
            total={openTotal}
            delta={data.openDelta}
            mix={data.openMix}
            onJumpToOverdue={data.nudges.overdue.count > 0 ? jumpToOverdue : undefined}
          />
          <MomentumCard
            momentum={data.momentum}
            habitsDone={habitsDone}
            habitsDue={habitsDue}
            onExpand={() => setMomentumOpen(true)}
          />
          <ClosedEachDayCard
            points={closedPoints}
            onExpand={() => setClosedOpen(true)}
            className="@min-[540px]:col-span-2 @min-[880px]:col-span-1"
          />
        </section>

        <div className="grid items-start gap-4 @min-[760px]:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.88fr)]">
          <div className="flex min-w-0 flex-col gap-3" aria-label="Open work">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-[9px]">
                <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Open work</h2>
                {scopeLabel ? (
                  <Link
                    href="/"
                    scroll={false}
                    className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-border bg-paper py-[3px] pr-[7px] pl-[9px] text-[11.5px] font-semibold text-ink-soft transition-colors duration-[120ms] hover:border-border-strong"
                    aria-label={`Clear filter (${scopeLabel})`}
                  >
                    <span className="truncate">{scopeLabel}</span>
                    <X className="h-[11px] w-[11px] shrink-0 text-faint" strokeWidth={2.2} />
                  </Link>
                ) : null}
              </span>
              {visibleProjects.length > 1 ? (
                <span className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => setAllCollapsed(true)}
                    className={cn(
                      "rounded-[6px] px-2 py-1 text-[12px] transition-colors duration-[120ms] hover:bg-hover hover:text-foreground",
                      allCollapsed ? "text-foreground" : "text-faint"
                    )}
                  >
                    Collapse all
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllCollapsed(false)}
                    className={cn(
                      "rounded-[6px] px-2 py-1 text-[12px] transition-colors duration-[120ms] hover:bg-hover hover:text-foreground",
                      noneCollapsed ? "text-foreground" : "text-faint"
                    )}
                  >
                    Expand all
                  </button>
                </span>
              ) : null}
            </div>

            {inboxOnly ? (
              <InboxCard
                tasks={data.inboxTasks}
                projects={data.projects}
                today={today}
                mode={mode}
                getDone={(id, fallback) => optimisticTasks.get(id, fallback)}
                onToggle={(id, done) => void handleToggleTask(id, done)}
                onError={setActionError}
                onCapture={() => captureRef.current?.focus({ projectId: null })}
                expanded
              />
            ) : visibleProjects.length === 0 ? (
              <EmptyScope
                line={
                  focus?.kind === "overdue"
                    ? inboxMatchesFocus
                      ? "Every overdue task is in the Inbox."
                      : "Nothing overdue any more."
                    : focus?.kind === "milestones"
                      ? "No project has a milestone due this week."
                      : focus?.kind === "focused"
                        ? inboxMatchesFocus
                          ? "Everything in focus is in the Inbox."
                          : "Nothing in focus. Use the target on a task, or a project's edit menu, to pick what matters this week."
                      : isFreshWorkspace
                        ? "No open work yet. Add a task above, or create a project to group related work."
                        : projectFilter
                          ? "That project isn't here any more."
                          : "No projects yet. Everything you capture lands in the Inbox."
                }
                showClear={Boolean(projectFilter) || Boolean(focus)}
              />
            ) : (
              orderedProjects.map((project, index) => (
                <ProjectGroup
                  key={project.id}
                  project={project}
                  projects={data.projects}
                  index={index}
                  today={today}
                  mode={mode}
                  expanded={filterProject?.id === project.id || focus?.kind === "overdue"}
                  collapsed={holdOpen ? false : isCollapsed(project.id)}
                  onToggleCollapsed={holdOpen ? () => {} : () => toggleCollapsed(project.id)}
                  onToggleTask={(taskId, done) => void handleToggleTask(taskId, done)}
                  getDone={(id, fallback) => optimisticTasks.get(id, fallback)}
                  onError={setActionError}
                  // A project in focus shows all its work; any other card in
                  // focus mode is here for its focused tasks only.
                  focusTaskIds={
                    focus?.kind === "focused"
                      ? focusedProjectIds.has(project.id)
                        ? undefined
                        : focusedTaskIds
                      : overdueTaskIds
                  }
                  tintMatches={focus?.kind !== "focused"}
                  highlight={
                    focus?.kind === "stalled"
                      ? "warn"
                      : focus?.kind === "milestones"
                        ? "done"
                        : undefined
                  }
                />
              ))
            )}
          </div>

          <div className="min-w-0 @min-[760px]:self-stretch">{rail}</div>
        </div>

        <WeekReviewBanner review={data.weekReview} />
      </div>

      <BackToTop />
    </div>
  );
}

function EmptyScope({ line, showClear }: { line: string; showClear: boolean }) {
  return (
    <div className="flex flex-col items-center gap-[9px] rounded-[12px] border border-dashed border-border-strong bg-canvas-sunk px-5 pt-11 pb-12 text-center">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--hairline)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="8.4" />
        <path d="M8.6 12.2l2.3 2.3 4.5-4.8" />
      </svg>
      <p className="max-w-[40ch] text-[13.5px] text-muted-foreground text-pretty">{line}</p>
      {showClear ? (
        <Link
          href="/"
          className="inline-flex h-[30px] items-center rounded-[8px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors duration-[120ms] hover:border-border-strong"
        >
          Show everything
        </Link>
      ) : null}
    </div>
  );
}
