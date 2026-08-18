"use client";

import * as React from "react";
import { deleteProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DeleteProjectTarget = {
  id: string;
  name: string;
  logoUrl?: string | null;
  iconKey?: string | null;
  color?: string | null;
  openCount?: number;
  milestoneCount?: number;
};

type DeleteProjectDialogProps = {
  project: DeleteProjectTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function consequenceLine(project: DeleteProjectTarget) {
  const parts: string[] = [];
  if ((project.milestoneCount ?? 0) > 0) {
    parts.push(
      `${project.milestoneCount} milestone${project.milestoneCount === 1 ? "" : "s"} will be removed`
    );
  }
  if ((project.openCount ?? 0) > 0) {
    parts.push(
      `${project.openCount} open task${project.openCount === 1 ? "" : "s"} will stay, unlinked`
    );
  }
  if (parts.length === 0) return "This cannot be undone.";
  return `${parts.join(". ")}. This cannot be undone.`;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (open) {
      setPending(false);
      setError(null);
    }
  }, [open, project?.id]);

  async function handleConfirm() {
    if (!project) return;
    setPending(true);
    setError(null);

    try {
      const result = await deleteProject(project.id);
      if (!result.success) {
        setError(result.error ?? "Could not delete this project.");
        setPending(false);
        return;
      }
      onOpenChange(false);
    } catch {
      setError("Could not delete this project.");
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showClose={false}
        className="sm:max-w-[400px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <DialogHeader className="border-b-0 pb-0">
          <DialogTitle className="pr-0 text-[19px]">Delete project?</DialogTitle>
          <DialogDescription className="mt-1.5 text-[13.5px] leading-relaxed">
            Remove this workstream from DailyHub. Milestones go with it; tasks
            stay in your lists.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="pt-3">
          {project && (
            <div className="flex items-center gap-3 rounded-[10px] border border-border bg-paper px-3 py-2.5">
              <EntityAvatar
                name={project.name}
                color={project.color}
                logoUrl={project.logoUrl}
                iconKey={project.iconKey}
                size={34}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{project.name}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  {consequenceLine(project)}
                </p>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter className="justify-end">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !project}
            className="bg-destructive text-white hover:bg-[#C13B36] hover:text-white"
            onClick={handleConfirm}
          >
            {pending ? "Deleting..." : "Delete project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
