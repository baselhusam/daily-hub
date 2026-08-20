"use client";

import * as React from "react";
import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { SelectMenu } from "@/components/ui/select-menu";
import { DATE_INPUT_MAX, DATE_INPUT_MIN } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type QuickAddProject = {
  id: string;
  name: string;
  iconKey: string;
  logoUrl: string | null;
  color: string | null;
};

type QuickAddProps = {
  projects: QuickAddProject[];
  defaultProjectId?: string;
  className?: string;
};

export function QuickAdd({
  projects,
  defaultProjectId,
  className,
}: QuickAddProps) {
  const [title, setTitle] = React.useState("");
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? "");
  const [dueDate, setDueDate] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setProjectId(defaultProjectId ?? "");
  }, [defaultProjectId]);

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("title", trimmed);
    if (projectId) formData.set("projectId", projectId);
    if (dueDate) formData.set("dueDate", dueDate);

    try {
      const result = await createTask(formData);
      if (!result.success) {
        setError(result.error ?? "Could not add this task. Try again.");
        return;
      }
      setTitle("");
      setDueDate("");
    } catch {
      setError("Could not add this task. Try again.");
    } finally {
      setPending(false);
    }
  }

  const projectOptions = [
    {
      value: "",
      label: "Inbox",
      leading: <InboxAvatar size={16} />,
    },
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

  const canSubmit = Boolean(title.trim()) && !pending;

  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="group flex flex-wrap items-center gap-1 rounded-[12px] border border-border bg-card px-3 py-1.5 transition-[border-color] duration-[120ms] focus-within:border-signal">
        <div className="flex min-w-[12rem] flex-1 items-center gap-2.5">
          <span
            className="size-3.5 shrink-0 rounded-[3px] border border-dashed border-hairline"
            aria-hidden
          />
          <input
            id="quick-add-title"
            value={title}
            name="quickTask"
            aria-label="Task title"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task…"
            className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[15px] outline-none placeholder:text-faint"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <SelectMenu
            value={projectId}
            onValueChange={setProjectId}
            options={projectOptions}
            variant="plain"
            ariaLabel="Project"
            contentClassName="min-w-[200px]"
          />
          <DatePicker
            value={dueDate}
            onValueChange={setDueDate}
            min={DATE_INPUT_MIN}
            max={DATE_INPUT_MAX}
            variant="plain"
            placeholder="Due"
          />
          {canSubmit || pending ? (
            <Button
              type="submit"
              variant="ghost"
              disabled={!canSubmit}
              className="h-8 px-2.5 text-[13px] font-medium text-signal hover:bg-signal-soft hover:text-signal-hover"
            >
              {pending ? "Adding…" : "Add"}
            </Button>
          ) : (
            <span className="hidden px-2 text-[11px] text-faint group-focus-within:hidden sm:inline">
              N
            </span>
          )}
        </div>
      </div>
      {error ? (
        <p role="alert" aria-live="polite" className="px-1 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
