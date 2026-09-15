"use client";

import * as React from "react";
import { CalendarDays, Timer, Trash2 } from "lucide-react";
import { createTask, deleteTask, updateTask } from "@/app/actions/tasks";
import { DatePicker } from "@/components/ui/date-picker";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { SelectMenu } from "@/components/ui/select-menu";
import { DATE_INPUT_MAX, DATE_INPUT_MIN, toDateInputValue } from "@/lib/dates";
import { dueChipsFor, ESTIMATE_CHIPS, formatCustomDue, parseEstimateInput } from "@/lib/due-chips";
import { formatEstimate } from "@/lib/streak-utils";
import { cn } from "@/lib/utils";

export type ComposerProject = {
  id: string;
  name: string;
  iconKey: string;
  logoUrl: string | null;
  color: string | null;
};

export type ComposerTask = {
  id: string;
  title: string;
  notes: string | null;
  projectId: string | null;
  dueDate: Date | null;
  estimatedMinutes: number | null;
};

type TaskComposerProps = {
  today: Date;
  /** Where a new task lands; ignored when editing. */
  projectId: string | null;
  /** Editing an existing task instead of creating one. */
  task?: ComposerTask;
  /** Needed only in edit mode, for the project mover. */
  projects?: ComposerProject[];
  onClose: () => void;
  /** Fires after a successful create or save, before `onClose`. */
  onSaved?: () => void;
  onError?: (message: string) => void;
  className?: string;
};

/**
 * The inline card that opens under a task list — "Add task to X" — and the
 * same card pre-filled when a task's pencil is pressed. Enter in the title
 * commits, ⌘/Ctrl+Enter commits from the note, Esc closes. Dates and
 * estimates are one-tap chips; a custom date opens the calendar in place.
 */
export function TaskComposer({
  today,
  projectId,
  task,
  projects = [],
  onClose,
  onSaved,
  onError,
  className,
}: TaskComposerProps) {
  const editing = Boolean(task);
  const [title, setTitle] = React.useState(task?.title ?? "");
  const [note, setNote] = React.useState(task?.notes ?? "");
  const [due, setDue] = React.useState(
    task?.dueDate ? toDateInputValue(task.dueDate) : ""
  );
  const [estimate, setEstimate] = React.useState<number | null>(
    task?.estimatedMinutes ?? null
  );
  const [target, setTarget] = React.useState(task?.projectId ?? projectId ?? "");
  const [customDateOpen, setCustomDateOpen] = React.useState(false);
  const [customEstimateOpen, setCustomEstimateOpen] = React.useState(false);
  const [customEstimateText, setCustomEstimateText] = React.useState("");
  const [customEstimateInvalid, setCustomEstimateInvalid] = React.useState(false);
  const estimateInputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  const dueChips = React.useMemo(() => dueChipsFor(today), [today]);
  const dueIsCustom = due !== "" && !dueChips.some((chip) => chip.value === due);
  const estimateIsCustom =
    estimate !== null && !ESTIMATE_CHIPS.some((chip) => chip.minutes === estimate);
  const ready = title.trim().length > 0 && !pending;

  React.useEffect(() => {
    if (customEstimateOpen) {
      estimateInputRef.current?.focus();
      estimateInputRef.current?.select();
    }
  }, [customEstimateOpen]);

  function openCustomEstimate() {
    setCustomEstimateText(
      estimateIsCustom && estimate !== null ? (formatEstimate(estimate) ?? "") : ""
    );
    setCustomEstimateInvalid(false);
    setCustomEstimateOpen(true);
  }

  /** Reads the typed estimate; an empty box clears, gibberish is refused. */
  function commitCustomEstimate() {
    const text = customEstimateText.trim();
    if (!text) {
      if (estimateIsCustom) setEstimate(null);
      setCustomEstimateOpen(false);
      return;
    }
    const minutes = parseEstimateInput(text);
    if (minutes === null) {
      setCustomEstimateInvalid(true);
      estimateInputRef.current?.select();
      return;
    }
    setEstimate(minutes);
    setCustomEstimateOpen(false);
  }

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    setPending(true);
    const formData = new FormData();
    formData.set("title", trimmed);
    formData.set("notes", note.trim());
    formData.set("projectId", target || "none");
    formData.set("dueDate", due);
    formData.set("estimatedMinutes", estimate === null ? "" : String(estimate));
    if (task) formData.set("id", task.id);
    try {
      const result = task ? await updateTask(formData) : await createTask(formData);
      if (!result.success) {
        onError?.(result.error ?? "Could not save this task. Try again.");
        return;
      }
      onSaved?.();
      onClose();
    } catch {
      onError?.("Could not save this task. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!task) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setPending(true);
    try {
      const result = await deleteTask(task.id);
      if (!result.success) {
        onError?.(result.error ?? "Could not delete this task. Try again.");
        return;
      }
      onClose();
    } catch {
      onError?.("Could not delete this task. Try again.");
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent, fromNote = false) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Enter") return;
    if (fromNote && !(event.metaKey || event.ctrlKey)) return;
    if (!fromNote && event.shiftKey) return;
    event.preventDefault();
    void submit();
  }

  const projectOptions = [
    { value: "", label: "Inbox", leading: <InboxAvatar size={16} /> },
    ...projects.map((project) => ({
      value: project.id,
      label: project.name,
      leading: (
        <EntityAvatar
          name={project.name}
          color={project.color}
          logoUrl={project.logoUrl}
          iconKey={project.iconKey}
          size={16}
        />
      ),
    })),
  ];

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={editing ? "Edit task" : "New task"}
      className={cn(
        "animate-dh-in rounded-[10px] border bg-canvas-sunk px-3 py-[11px]",
        editing ? "border-hairline" : "border-border-strong/70",
        className
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={titleRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => handleKeyDown(event)}
        placeholder={editing ? "Task title" : "What needs doing?"}
        aria-label="Task title"
        autoComplete="off"
        spellCheck={false}
        maxLength={200}
        className="h-7 w-full border-0 bg-transparent text-[14.5px] font-medium text-foreground outline-none placeholder:text-faint"
      />
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => handleKeyDown(event, true)}
        rows={2}
        placeholder="Add details (optional)"
        aria-label="Task details"
        maxLength={500}
        className="mt-px w-full resize-none border-0 bg-transparent text-[12.5px] leading-[1.5] text-ink-soft outline-none placeholder:text-faint"
      />

      <div className="mt-2 flex flex-col gap-1.5 border-t border-track pt-[9px]">
        <ChipRow label="Due">
          {dueChips.map((chip) => (
            <Chip
              key={chip.label}
              active={due === chip.value}
              onClick={() => {
                setCustomDateOpen(false);
                setDue(due === chip.value ? "" : chip.value);
              }}
            >
              {chip.label}
            </Chip>
          ))}
          {customDateOpen || dueIsCustom ? (
            // Mounted with the calendar already open, so the "Date" tap goes
            // straight to picking; closing it with nothing chosen puts the
            // button back, and a chosen date reads as the selected chip.
            <DatePicker
              key={dueIsCustom ? "custom" : "picking"}
              value={dueIsCustom ? due : ""}
              defaultOpen={!dueIsCustom}
              onOpenChange={(next) => {
                if (!next) setCustomDateOpen(false);
              }}
              onValueChange={(next) => {
                setDue(next);
                setCustomDateOpen(false);
              }}
              min={DATE_INPUT_MIN}
              max={DATE_INPUT_MAX}
              variant="chip"
              placeholder="Date"
              formatLabel={(date) => formatCustomDue(toDateInputValue(date), today)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setCustomDateOpen(true)}
              className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-card px-2.5 text-[11.5px] text-muted-foreground transition-colors duration-[110ms] hover:border-faint hover:text-foreground"
            >
              <CalendarDays className="h-3 w-3" />
              Date
            </button>
          )}
        </ChipRow>
        <ChipRow label="Est">
          {ESTIMATE_CHIPS.map((chip) => (
            <Chip
              key={chip.label}
              active={estimate === chip.minutes}
              onClick={() =>
                setEstimate(estimate === chip.minutes ? null : chip.minutes)
              }
            >
              {chip.label}
            </Chip>
          ))}
          {customEstimateOpen ? (
            <input
              ref={estimateInputRef}
              value={customEstimateText}
              onChange={(event) => {
                setCustomEstimateText(event.target.value);
                setCustomEstimateInvalid(false);
              }}
              onBlur={commitCustomEstimate}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  commitCustomEstimate();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setCustomEstimateOpen(false);
                }
              }}
              placeholder="45m, 1.5h"
              aria-label="Custom estimate"
              aria-invalid={customEstimateInvalid || undefined}
              inputMode="text"
              autoComplete="off"
              className={cn(
                "h-[26px] w-[84px] rounded-full border bg-card px-2.5 text-[11.5px] font-medium text-foreground outline-none placeholder:text-faint",
                customEstimateInvalid
                  ? "border-destructive ring-[3px] ring-destructive/15"
                  : "border-foreground ring-[3px] ring-signal/16"
              )}
            />
          ) : estimateIsCustom && estimate !== null ? (
            <Chip active onClick={openCustomEstimate}>
              {formatEstimate(estimate)}
            </Chip>
          ) : (
            <button
              type="button"
              onClick={openCustomEstimate}
              className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-card px-2.5 text-[11.5px] text-muted-foreground transition-colors duration-[110ms] hover:border-faint hover:text-foreground"
            >
              <Timer className="h-3 w-3" />
              Custom
            </button>
          )}
        </ChipRow>
        {editing ? (
          <ChipRow label="In">
            <SelectMenu
              value={target}
              onValueChange={setTarget}
              options={projectOptions}
              variant="plain"
              ariaLabel="Project"
              className="h-[26px] rounded-full border border-border bg-card px-2.5 text-[11.5px] font-medium text-foreground hover:border-border-strong"
              contentClassName="min-w-[200px]"
            />
          </ChipRow>
        ) : null}
      </div>

      <div className="mt-[9px] flex items-center gap-2.5 border-t border-track pt-[9px]">
        {editing ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={pending}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-[12px] transition-colors duration-[120ms]",
              confirmDelete
                ? "bg-destructive-wash font-semibold text-destructive"
                : "text-faint hover:bg-destructive-wash hover:text-destructive"
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? "Delete for good?" : "Delete"}
          </button>
        ) : (
          <span
            className={cn(
              "min-w-0 truncate text-[11.5px]",
              ready ? "text-faint" : "text-hairline"
            )}
          >
            {ready ? "Enter to add · Esc to cancel" : "Name the task to add it"}
          </span>
        )}
        <span className="min-w-2 flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 items-center rounded-[7px] px-2.5 text-[12px] text-faint transition-colors duration-[120ms] hover:bg-hover hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!ready}
          className={cn(
            "inline-flex h-7 items-center rounded-[7px] px-3 text-[12px] font-semibold transition-colors duration-[120ms]",
            editing
              ? "bg-signal text-primary-foreground hover:bg-signal-hover disabled:opacity-60"
              : ready
                ? "bg-foreground text-background hover:bg-ink-soft"
                : "cursor-default bg-track text-faint/80"
          )}
        >
          {pending ? (editing ? "Saving…" : "Adding…") : editing ? "Save" : "Add task"}
        </button>
      </div>
    </div>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-[30px] shrink-0 text-[10px] font-semibold tracking-[0.07em] text-faint uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[26px] items-center rounded-full border px-[11px] text-[11.5px] font-medium transition-colors duration-[110ms]",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-ink-soft hover:border-hairline"
      )}
    >
      {children}
    </button>
  );
}
