"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import {
  createDailyTask,
  updateDailyTask,
} from "@/app/actions/daily-tasks";
import { uploadLogo } from "@/app/actions/upload";
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
import { ICON_OPTIONS } from "@/lib/icons";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { cn } from "@/lib/utils";

type BusinessOption = { id: string; name: string };

export type DailyTaskFormValues = {
  id?: string;
  title: string;
  iconKey: string;
  logoUrl: string | null;
  weekdays: number[];
  businessId: string | null;
  isActive: boolean;
};

type DailyTaskFormDialogProps = {
  businesses: BusinessOption[];
  task?: DailyTaskFormValues;
  trigger?: React.ReactNode;
};

export function DailyTaskFormDialog({
  businesses,
  task,
  trigger,
}: DailyTaskFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = React.useState<number[]>(
    task?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]
  );
  const isEdit = Boolean(task?.id);

  React.useEffect(() => {
    if (open) {
      setSelectedWeekdays(task?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
    }
  }, [open, task?.weekdays]);

  function toggleWeekday(day: number) {
    setSelectedWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    if (selectedWeekdays.length === 0) {
      setError("Select at least one weekday.");
      setPending(false);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    for (const day of selectedWeekdays) {
      formData.append("weekdays", String(day));
    }

    try {
      const logoFile = formData.get("logo") as File | null;
      if (logoFile && logoFile.size > 0) {
        const uploadData = new FormData();
        uploadData.set("logo", logoFile);
        const logoUrl = await uploadLogo(uploadData);
        if (logoUrl) {
          formData.set("logoUrl", logoUrl);
        }
      } else if (task?.logoUrl) {
        formData.set("logoUrl", task.logoUrl);
      }

      const result = isEdit
        ? await updateDailyTask(formData)
        : await createDailyTask(formData);

      if (!result.success) {
        setError(result.error ?? "Failed to save daily task.");
        return;
      }

      form.reset();
      setOpen(false);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload logo."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Plus className="h-3.5 w-3.5" />
            Daily task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit daily task" : "Create daily task"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {task?.id && <input type="hidden" name="id" value={task.id} />}
          <div className="space-y-2">
            <Label htmlFor="daily-title">Title</Label>
            <Input
              id="daily-title"
              name="title"
              placeholder="Check inbox"
              defaultValue={task?.title}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily-logo">Logo (optional)</Label>
            <Input id="daily-logo" name="logo" type="file" accept="image/*" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily-icon">Icon</Label>
            <select
              id="daily-icon"
              name="iconKey"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={task?.iconKey ?? "check"}
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Schedule</Label>
            <div className="flex gap-1">
              {WEEKDAY_LABELS.map((label, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleWeekday(index)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                    selectedWeekdays.includes(index)
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  )}
                  aria-pressed={selectedWeekdays.includes(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily-business">Business (optional)</Label>
            <select
              id="daily-business"
              name="businessId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={task?.businessId ?? "none"}
            >
              <option value="none">None</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="daily-active"
              name="isActive"
              type="checkbox"
              value="true"
              defaultChecked={task?.isActive ?? true}
              className="h-4 w-4 rounded border border-input"
            />
            <Label htmlFor="daily-active">Active</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Create daily task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
