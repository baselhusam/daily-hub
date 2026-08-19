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

  React.useEffect(() => {
    setProjectId(defaultProjectId ?? "");
  }, [defaultProjectId]);

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
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-2 rounded-[10px] border border-border bg-card p-2",
        className
      )}
    >
      <div className="flex min-w-[180px] flex-1 items-center gap-2.5 px-2.5">
        <span className="h-[15px] w-[15px] shrink-0 rounded border-[1.6px] border-dashed border-hairline" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task and hit enter…"
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-faint"
        />
      </div>
      <SelectMenu
        value={projectId}
        onValueChange={setProjectId}
        options={projectOptions}
        variant="compact"
        ariaLabel="Project"
        className="min-w-[148px]"
        contentClassName="min-w-[200px]"
      />
      <DatePicker
        value={dueDate}
        onValueChange={setDueDate}
        min={DATE_INPUT_MIN}
        max={DATE_INPUT_MAX}
        variant="compact"
        placeholder="Due"
        className="min-w-[148px]"
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
