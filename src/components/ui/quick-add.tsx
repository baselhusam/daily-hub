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
      leading: <InboxAvatar size={18} />,
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
          size={18}
        />
      ),
    })),
  ];

  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="group grid grid-cols-2 items-stretch gap-2 rounded-[12px] border border-border bg-card p-2 shadow-raised transition-[border-color,box-shadow] duration-[120ms] focus-within:border-signal focus-within:shadow-[0_0_0_3px_var(--signal-wash)] sm:flex sm:flex-wrap">
        <div className="col-span-2 flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 sm:min-w-[180px]">
          <span className="h-[15px] w-[15px] shrink-0 rounded border-[1.6px] border-dashed border-hairline" />
          <input
            id="quick-add-title"
            value={title}
            name="quickTask"
            aria-label="Task title"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task and hit enter…"
            className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-faint"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-faint group-focus-within:hidden sm:inline">
            N
          </kbd>
        </div>
        <SelectMenu
          value={projectId}
          onValueChange={setProjectId}
          options={projectOptions}
          variant="compact"
          ariaLabel="Project"
          className="min-w-0 sm:min-w-[148px]"
          contentClassName="min-w-[200px]"
        />
        <DatePicker
          value={dueDate}
          onValueChange={setDueDate}
          min={DATE_INPUT_MIN}
          max={DATE_INPUT_MAX}
          variant="compact"
          placeholder="Due"
          className="min-w-0 sm:min-w-[148px]"
        />
        <Button
          type="submit"
          disabled={pending || !title.trim()}
          className="col-span-2 h-auto min-h-10 px-4 py-2.5 text-[13.5px] font-semibold sm:col-auto sm:px-5"
        >
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error ? (
        <p role="alert" aria-live="polite" className="px-1 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
