"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import {
  createDailyTask,
  deleteDailyTask,
  updateDailyTask,
} from "@/app/actions/daily-tasks";
import { Button } from "@/components/ui/button";
import { LogoField } from "@/components/ui/logo-field";
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
import { ICON_OPTIONS } from "@/lib/icons";
import { applyLogoToFormData } from "@/lib/logo";
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
      await applyLogoToFormData(formData, task?.logoUrl);

      const result = isEdit
        ? await updateDailyTask(formData)
        : await createDailyTask(formData);

      if (!result.success) {
        setError(result.error ?? "Failed to save habit.");
        return;
      }

      form.reset();
      setOpen(false);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to save logo."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="h-9 gap-1 px-4 text-[13.5px] font-semibold">
            <Plus className="h-3.5 w-3.5" />
            Habit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit habit" : "New habit"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {task?.id && <input type="hidden" name="id" value={task.id} />}
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Habit</FieldLabel>
              <DialogInput
                name="title"
                placeholder="e.g. Post on Medium"
                defaultValue={task?.title}
                required
              />
            </label>
            <div className="flex flex-col gap-2">
              <FieldLabel>Schedule</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleWeekday(index)}
                    className={cn(
                      "relative grid h-[42px] w-[42px] place-items-center rounded-lg border text-xs font-semibold transition-colors",
                      selectedWeekdays.includes(index)
                        ? "border-foreground text-white"
                        : "border-border bg-card text-foreground hover:border-foreground"
                    )}
                  >
                    {selectedWeekdays.includes(index) && (
                      <span className="absolute inset-[-1px] rounded-lg bg-foreground" />
                    )}
                    <span className="relative z-10">{label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedWeekdays([0, 1, 2, 3, 4, 5, 6])}
                  className="h-[42px] rounded-lg border border-dashed border-[#DEDDDA] px-4 text-[12.5px] font-semibold text-muted-foreground hover:border-signal hover:text-signal"
                >
                  Every day
                </button>
              </div>
            </div>
            <LogoField key={String(open)} existingLogoUrl={task?.logoUrl} />
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Icon</FieldLabel>
              <DialogSelect
                name="iconKey"
                defaultValue={task?.iconKey ?? "check"}
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </DialogSelect>
            </label>
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
            <label className="flex items-center gap-2">
              <input
                name="isActive"
                type="checkbox"
                value="true"
                defaultChecked={task?.isActive ?? true}
                className="size-4 rounded border-border"
              />
              <span className="text-sm">Active</span>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter>
            {isEdit && task?.id && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-faint hover:text-destructive"
                onClick={() => deleteDailyTask(task.id!)}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
