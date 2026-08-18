"use client";

import * as React from "react";
import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { DATE_INPUT_MAX, DATE_INPUT_MIN } from "@/lib/dates";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string };

type QuickAddProps = {
  projects: ProjectOption[];
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

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || pending) return;

    setPending(true);
    const formData = new FormData();
    formData.set("title", trimmed);
    if (projectId) formData.set("projectId", projectId);
    if (dueDate) formData.set("dueDate", dueDate);

    const result = await createTask(formData);
    setPending(false);

    if (result.success) {
      setTitle("");
      setDueDate("");
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-2 rounded-[10px] border border-border bg-card p-2",
        className
      )}
    >
      <div className="flex min-w-[180px] flex-1 items-center gap-2.5 px-2.5">
        <span className="h-[15px] w-[15px] shrink-0 rounded border-[1.6px] border-dashed border-[#C7C6C2]" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task and hit enter…"
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-faint"
        />
      </div>
      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="rounded-md border border-border bg-[#F1F1EF] px-2.5 py-2 text-[13.5px] font-medium outline-none dark:bg-muted"
      >
        <option value="">Inbox</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        min={DATE_INPUT_MIN}
        max={DATE_INPUT_MAX}
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="rounded-md border border-border bg-[#F1F1EF] px-2.5 py-2 text-[13.5px] text-muted-foreground outline-none dark:bg-muted"
      />
      <Button
        type="button"
        onClick={() => void submit()}
        disabled={pending || !title.trim()}
        className="px-5 py-2.5 text-[13.5px] font-semibold"
      >
        Add
      </Button>
    </div>
  );
}
