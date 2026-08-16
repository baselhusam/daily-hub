"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { createTask, updateTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DialogInput,
  DialogSelect,
  FieldLabel,
} from "@/components/ui/input";
import { toDateOnlyString } from "@/lib/dates";
import type { DashboardBusiness, DashboardProject } from "@/lib/dashboard";

type TaskFormValues = {
  id: string;
  title: string;
  notes: string | null;
  projectId: string | null;
  businessId: string | null;
  dueDate: Date | null;
  estimatedMinutes: number | null;
};

type CreateTaskDialogProps = {
  businesses: DashboardBusiness[];
  projects: DashboardProject[];
  defaultProjectId?: string;
  task?: TaskFormValues;
  triggerLabel?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateTaskDialog({
  businesses,
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
  const isEdit = Boolean(task?.id);

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
                <DialogSelect
                  name="projectId"
                  defaultValue={task?.projectId ?? defaultProjectId ?? "none"}
                >
                  <option value="none">Inbox (no project)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </DialogSelect>
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Due</FieldLabel>
                <DialogInput
                  name="dueDate"
                  type="date"
                  defaultValue={
                    task?.dueDate ? toDateOnlyString(task.dueDate) : ""
                  }
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
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Business</FieldLabel>
              <DialogSelect
                name="businessId"
                defaultValue={task?.businessId ?? "none"}
              >
                <option value="none">None</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </DialogSelect>
            </label>
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
