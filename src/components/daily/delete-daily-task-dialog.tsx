"use client";

import * as React from "react";
import { deleteDailyTask } from "@/app/actions/daily-tasks";
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

export type DeleteDailyTaskTarget = {
  id: string;
  title: string;
  iconKey: string;
  logoUrl?: string | null;
};

type DeleteDailyTaskDialogProps = {
  task: DeleteDailyTaskTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteDailyTaskDialog({
  task,
  open,
  onOpenChange,
  onDeleted,
}: DeleteDailyTaskDialogProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (open) {
      setPending(false);
      setError(null);
    }
  }, [open, task?.id]);

  async function handleConfirm() {
    if (!task) return;
    setPending(true);
    setError(null);

    try {
      const result = await deleteDailyTask(task.id);
      if (!result.success) {
        setError(result.error ?? "Could not delete this habit. Please try again.");
        setPending(false);
        return;
      }
      onOpenChange(false);
      onDeleted?.();
    } catch {
      setError("Could not delete this habit. Please try again.");
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
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
          <DialogTitle className="pr-0 text-[19px]">Delete habit?</DialogTitle>
          <DialogDescription className="mt-1.5 text-[13.5px] leading-relaxed">
            Remove it from your schedule. Logged check-ins stay in history, but the habit cannot be restored.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="pt-3">
          {task ? (
            <div className="flex items-center gap-3 rounded-[10px] border border-border bg-paper px-3 py-2.5">
              <EntityAvatar
                name={task.title}
                logoUrl={task.logoUrl}
                iconKey={task.iconKey}
                size={34}
                rounded="lg"
              />
              <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                {task.title}
              </p>
            </div>
          ) : null}
          {error ? (
            <p role="alert" aria-live="polite" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
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
            disabled={pending || !task}
            className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
            onClick={handleConfirm}
          >
            {pending ? "Deleting…" : "Delete habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
