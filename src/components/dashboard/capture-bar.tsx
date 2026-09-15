"use client";

import * as React from "react";
import { createTask } from "@/app/actions/tasks";
import { DatePicker } from "@/components/ui/date-picker";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { SelectMenu } from "@/components/ui/select-menu";
import { DATE_INPUT_MAX, DATE_INPUT_MIN } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CaptureGlyph } from "./today-card";
import type { ComposerProject } from "./task-composer";

export const CAPTURE_INPUT_ID = "quick-add-title";

type CaptureBarProps = {
  projects: ComposerProject[];
  /** Pre-selected target, e.g. the project the page is filtered to. */
  defaultProjectId?: string;
  onError: (message: string) => void;
  className?: string;
};

export type CaptureBarHandle = {
  focus: (options?: { projectId?: string | null }) => void;
};

/**
 * The one-line capture bar under the greeting. Enter adds; the target menu
 * decides whether it lands in the Inbox or a project. `N` anywhere on the
 * page focuses it (wired in the app shell via the input id).
 */
export const CaptureBar = React.forwardRef<CaptureBarHandle, CaptureBarProps>(
  function CaptureBar({ projects, defaultProjectId, onError, className }, ref) {
    const [title, setTitle] = React.useState("");
    const [projectId, setProjectId] = React.useState(defaultProjectId ?? "");
    const [dueDate, setDueDate] = React.useState("");
    const [pending, setPending] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      setProjectId(defaultProjectId ?? "");
    }, [defaultProjectId]);

    React.useImperativeHandle(ref, () => ({
      focus: (options) => {
        if (options && options.projectId !== undefined) {
          setProjectId(options.projectId ?? "");
        }
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      },
    }));

    async function submit() {
      const trimmed = title.trim();
      if (!trimmed || pending) return;
      setPending(true);
      const formData = new FormData();
      formData.set("title", trimmed);
      if (projectId) formData.set("projectId", projectId);
      if (dueDate) formData.set("dueDate", dueDate);
      try {
        const result = await createTask(formData);
        if (!result.success) {
          onError(result.error ?? "Could not add this task. Try again.");
          return;
        }
        setTitle("");
        setDueDate("");
        inputRef.current?.focus();
      } catch {
        onError("Could not add this task. Try again.");
      } finally {
        setPending(false);
      }
    }

    const target = projects.find((project) => project.id === projectId);
    const options = [
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
    const ready = title.trim().length > 0 && !pending;

    return (
      <form
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-[11px] border border-border bg-canvas-sunk px-2.5 py-[9px] transition-[border-color,box-shadow] duration-[120ms] focus-within:border-border-strong focus-within:bg-card",
          className
        )}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex min-w-[14rem] flex-1 items-center gap-2 pl-0.5">
          <CaptureGlyph size={20} />
          <input
            ref={inputRef}
            id={CAPTURE_INPUT_ID}
            value={title}
            name="quickTask"
            aria-label="Task title"
            autoComplete="off"
            spellCheck={false}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setTitle("");
                inputRef.current?.blur();
              }
            }}
            placeholder="Add a task — press N anywhere"
            className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[13.5px] text-foreground outline-none placeholder:text-faint"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <SelectMenu
            value={projectId}
            onValueChange={setProjectId}
            options={options}
            variant="plain"
            ariaLabel="Add to"
            className="h-[30px] max-w-[12rem] rounded-[7px] border border-border bg-card px-2.5 text-[12.5px] text-ink-soft hover:border-border-strong hover:bg-card"
            contentClassName="min-w-[200px]"
          />
          <DatePicker
            value={dueDate}
            onValueChange={setDueDate}
            min={DATE_INPUT_MIN}
            max={DATE_INPUT_MAX}
            variant="plain"
            placeholder="Due"
            className="h-[30px] rounded-[7px] border border-border bg-card px-2.5 text-[12.5px] text-ink-soft hover:border-border-strong hover:bg-card"
          />
          <button
            type="submit"
            disabled={!ready}
            className={cn(
              "inline-flex h-[30px] items-center rounded-[7px] px-[13px] text-[12.5px] font-semibold transition-colors duration-[120ms]",
              ready
                ? "bg-foreground text-background hover:bg-ink-soft"
                : "bg-foreground/85 text-background/90"
            )}
            title={target ? `Add to ${target.name}` : "Add to Inbox"}
          >
            {pending ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
    );
  }
);
