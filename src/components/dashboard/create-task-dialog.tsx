"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { createTask, updateTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { DialogInput, FieldLabel } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { toDateOnlyString } from "@/lib/dates";

type TaskFormValues = {
  id: string;
  title: string;
  notes: string | null;
  projectId: string | null;
  dueDate: Date | null;
  estimatedMinutes: number | null;
};

type TaskProjectOption = {
  id: string;
  name: string;
  iconKey: string;
  logoUrl: string | null;
  color: string | null;
};

type CreateTaskDialogProps = {
  projects: TaskProjectOption[];
  defaultProjectId?: string;
  task?: TaskFormValues;
  triggerLabel?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateTaskDialog({
  projects,
  defaultProjectId,
  task,
  triggerLabel = "Add task",
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateTaskDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [projectId, setProjectId] = React.useState(
    task?.projectId ?? defaultProjectId ?? "none"
  );
  const [dueDate, setDueDate] = React.useState(
    task?.dueDate ? toDateOnlyString(task.dueDate) : ""
  );
  const isEdit = Boolean(task?.id);

  React.useEffect(() => {
    if (open) {
      setProjectId(task?.projectId ?? defaultProjectId ?? "none");
      setDueDate(task?.dueDate ? toDateOnlyString(task.dueDate) : "");
      setError(null);
    }
  }, [open, task, defaultProjectId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = isEdit
      ? await updateTask(new FormData(event.currentTarget))
      : await createTask(new FormData(event.currentTarget));
    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Failed to save task.");
      return;
    }

    event.currentTarget.reset();
    setOpen(false);
  }

  const projectOptions = [
    {
      value: "none",
      label: "Inbox (no project)",
      leading: <InboxAvatar size={20} />,
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
          size={20}
        />
      ),
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(trigger || controlledOpen === undefined) && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              {triggerLabel}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {task?.id && <input type="hidden" name="id" value={task.id} />}
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Task</FieldLabel>
              <DialogInput
                name="title"
                placeholder="What needs doing?"
                defaultValue={task?.title}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Notes</FieldLabel>
              <DialogInput
                name="notes"
                placeholder="Optional notes"
                defaultValue={task?.notes ?? ""}
              />
            </label>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Project</FieldLabel>
                <SelectMenu
                  name="projectId"
                  value={projectId}
                  onValueChange={setProjectId}
                  options={projectOptions}
                  ariaLabel="Project"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Due</FieldLabel>
                <DatePicker
                  name="dueDate"
                  value={dueDate}
                  onValueChange={setDueDate}
                  placeholder="No due date"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Est. minutes</FieldLabel>
                <DialogInput
                  name="estimatedMinutes"
                  type="number"
                  min={0}
                  placeholder="30"
                  defaultValue={task?.estimatedMinutes ?? ""}
                />
              </label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
