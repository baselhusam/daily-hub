"use client";

import * as React from "react";
import { createMilestone } from "@/app/actions/milestones";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { DialogInput, FieldLabel } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";

type MilestoneProjectOption = {
  id: string;
  name: string;
  iconKey: string;
  logoUrl: string | null;
  color: string | null;
};

type CreateMilestoneDialogProps = {
  projects: MilestoneProjectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject?: () => void;
};

export function CreateMilestoneDialog({
  projects,
  open,
  onOpenChange,
  onCreateProject,
}: CreateMilestoneDialogProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [projectId, setProjectId] = React.useState(projects[0]?.id ?? "");
  const [dueDate, setDueDate] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setProjectId(projects[0]?.id ?? "");
      setDueDate("");
      setError(null);
    }
  }, [open, projects]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await createMilestone(new FormData(event.currentTarget));
    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create milestone.");
      return;
    }

    event.currentTarget.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {projects.length === 0 ? (
          <>
            <DialogHeader>
              <DialogTitle>New milestone</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-[13.5px] text-muted-foreground">
                Add a project first, then you can attach milestones to it.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {onCreateProject && (
                <Button type="button" onClick={onCreateProject}>
                  Create project
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New milestone</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Milestone</FieldLabel>
                <DialogInput
                  name="name"
                  placeholder="e.g. Beta launch"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Project</FieldLabel>
                <SelectMenu
                  name="projectId"
                  value={projectId}
                  onValueChange={setProjectId}
                  options={projects.map((project) => ({
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
                  }))}
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
              {error && <p className="text-sm text-destructive">{error}</p>}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
