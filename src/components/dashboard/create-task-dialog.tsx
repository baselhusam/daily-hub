"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DashboardBusiness } from "@/lib/dashboard";

type CreateTaskDialogProps = {
  businesses: DashboardBusiness[];
  defaultBusinessId?: string;
  defaultProjectId?: string;
  triggerLabel?: string;
};

export function CreateTaskDialog({
  businesses,
  defaultBusinessId,
  defaultProjectId,
  triggerLabel = "Task",
}: CreateTaskDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = React.useState(
    defaultBusinessId ?? "none"
  );

  const selectedBusiness = businesses.find(
    (business) => business.id === selectedBusinessId
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createTask(new FormData(event.currentTarget));
    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create task.");
      return;
    }

    event.currentTarget.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" name="title" placeholder="Reply to email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Input id="task-notes" name="notes" placeholder="Optional notes" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-business">Business</Label>
            <select
              id="task-business"
              name="businessId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
            >
              <option value="none">None</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-project">Project</Label>
            <select
              id="task-project"
              name="projectId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={defaultProjectId ?? "none"}
            >
              <option value="none">None</option>
              {selectedBusiness?.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority (0-3)</Label>
            <Input
              id="task-priority"
              name="priority"
              type="number"
              min={0}
              max={3}
              defaultValue={0}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
