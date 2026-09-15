"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Pause, Play, Plus, X } from "lucide-react";
import { createDailyTask, updateDailyTask } from "@/app/actions/daily-tasks";
import { Dialog, DialogOverlay, DialogPortal, DialogTrigger } from "@/components/ui/dialog";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { LogoField } from "@/components/ui/logo-field";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/dates";
import { getIcon, getIconLabel, ICON_OPTIONS } from "@/lib/icons";
import { applyLogoToFormData } from "@/lib/logo";
import { cn } from "@/lib/utils";
import { useWeekStart, weekdayOrder } from "@/lib/week-start";
import type { DeleteDailyTaskTarget } from "./delete-daily-task-dialog";

export type DailyTaskFormValues = {
  id?: string;
  title: string;
  iconKey: string;
  logoUrl: string | null;
  weekdays: number[];
  isActive: boolean;
};

type DailyTaskFormDialogProps = {
  task?: DailyTaskFormValues;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hands the delete to the parent, which owns the confirm dialog. */
  onRequestDelete?: (target: DeleteDailyTaskTarget) => void;
};

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

function sameDays(a: number[], b: number[]) {
  return a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index]);
}

/**
 * The New / Edit habit sheet: name, the weekly schedule with one-tap presets,
 * an avatar (icon or image), and whether the habit is active. Enter saves.
 */
export function DailyTaskFormDialog({
  task,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onRequestDelete,
}: DailyTaskFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const isEdit = Boolean(task?.id);
  const weekStartsOn = useWeekStart();

  const [title, setTitle] = React.useState(task?.title ?? "");
  const [weekdays, setWeekdays] = React.useState<number[]>(task?.weekdays ?? EVERY_DAY);
  const [avatarTab, setAvatarTab] = React.useState<"icon" | "image">(task?.logoUrl ? "image" : "icon");
  const [iconKey, setIconKey] = React.useState(task?.iconKey ?? "check");
  const [isActive, setIsActive] = React.useState(task?.isActive ?? true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setWeekdays(task?.weekdays ?? EVERY_DAY);
    setAvatarTab(task?.logoUrl ? "image" : "icon");
    setIconKey(task?.iconKey ?? "check");
    setIsActive(task?.isActive ?? true);
    setError(null);
  }, [open, task]);

  const ready = title.trim().length > 0 && weekdays.length > 0 && !pending;

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b)
    );
  }

  async function submit() {
    if (!ready || !formRef.current) return;
    setPending(true);
    setError(null);
    const formData = new FormData(formRef.current);
    formData.set("title", title.trim());
    formData.set("iconKey", iconKey);
    formData.set("isActive", isActive ? "true" : "false");
    formData.delete("weekdays");
    for (const day of weekdays) formData.append("weekdays", String(day));
    if (task?.id) formData.set("id", task.id);
    try {
      if (avatarTab === "image") {
        await applyLogoToFormData(formData, task?.logoUrl);
      } else {
        formData.delete("logo");
        formData.set("logoUrl", "");
      }
      const result = isEdit ? await updateDailyTask(formData) : await createDailyTask(formData);
      if (!result.success) {
        setError(result.error ?? "Could not save the habit. Try again.");
        return;
      }
      setOpen(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not save the logo.");
    } finally {
      setPending(false);
    }
  }

  const presets = [
    { label: "Every day", days: EVERY_DAY },
    { label: "Weekdays", days: WEEKDAYS },
    { label: "Weekends", days: WEEKENDS },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(trigger || controlledOpen === undefined) && (
        <DialogTrigger asChild>
          {trigger ?? (
            <button
              type="button"
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[8px] bg-signal px-3.5 text-[13px] font-semibold text-primary-foreground shadow-[0_1px_1px_color-mix(in_srgb,var(--signal)_22%,transparent)] transition-colors duration-[120ms] hover:bg-signal-hover"
            >
              <Plus className="h-[15px] w-[15px]" strokeWidth={2.4} />
              New habit
            </button>
          )}
        </DialogTrigger>
      )}
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          aria-describedby={undefined}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
              event.preventDefault();
              void submit();
            }
          }}
          className={cn(
            "fixed z-50 flex w-full flex-col overflow-hidden border border-border bg-card shadow-dialog outline-none",
            "data-[state=open]:animate-dh-pop data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "inset-x-0 bottom-0 top-auto max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.75rem))] rounded-t-2xl",
            "dh:inset-auto dh:top-[82px] dh:left-1/2 dh:bottom-auto dh:max-h-[calc(100dvh-100px)] dh:w-[min(calc(100%-2.5rem),440px)] dh:-translate-x-1/2 dh:rounded-[14px]"
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-rule-soft px-[18px] py-[15px]">
            <DialogPrimitive.Title className="truncate text-[14.5px] font-semibold tracking-[-0.01em]">
              {isEdit ? `Edit ${task?.title}` : "New habit"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[6px] text-faint transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </DialogPrimitive.Close>
          </div>

          <form
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-[18px]"
          >
            <Field label="Habit">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Read 20 minutes"
                autoFocus
                maxLength={120}
                className="h-9 rounded-[8px] border border-border bg-card px-[11px] text-[13.5px] text-foreground outline-none transition-colors placeholder:text-faint focus:border-signal"
              />
            </Field>

            <div className="flex flex-col gap-[7px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-[0.04em] text-faint uppercase">Schedule</span>
                <span className="flex gap-1">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={sameDays(weekdays, preset.days)}
                      onClick={() => setWeekdays(preset.days)}
                      className={cn(
                        "h-6 rounded-[6px] px-2 text-[11px] font-semibold transition-colors",
                        sameDays(weekdays, preset.days)
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-hover hover:text-foreground"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {weekdayOrder(weekStartsOn).map((index) => {
                  const on = weekdays.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleWeekday(index)}
                      aria-pressed={on}
                      aria-label={WEEKDAY_SHORT[index]}
                      title={WEEKDAY_SHORT[index]}
                      className={cn(
                        "grid h-10 place-items-center rounded-[8px] border text-[12px] font-semibold transition-colors duration-[110ms]",
                        on
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-paper text-faint hover:border-hairline hover:text-foreground"
                      )}
                    >
                      {WEEKDAY_LABELS[index]}
                    </button>
                  );
                })}
              </div>
              {weekdays.length === 0 ? (
                <span className="text-[11px] text-destructive">Pick at least one day.</span>
              ) : null}
            </div>

            <div className="flex gap-3.5 rounded-[10px] border border-track bg-canvas-sunk p-[13px]">
              <EntityAvatar
                name={title.trim() || "?"}
                logoUrl={avatarTab === "image" ? (task?.logoUrl ?? null) : null}
                iconKey={avatarTab === "icon" ? iconKey : "initials"}
                size={46}
                rounded="lg"
                className="shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
                <span role="group" aria-label="Avatar" className="inline-flex w-fit gap-0.5 rounded-[8px] border border-border bg-card p-[3px]">
                  {(["icon", "image"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      aria-pressed={avatarTab === tab}
                      onClick={() => setAvatarTab(tab)}
                      className={cn(
                        "inline-flex h-[26px] items-center rounded-[6px] px-3 text-[12px] font-semibold transition-colors",
                        avatarTab === tab ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab === "icon" ? "Icon" : "Image"}
                    </button>
                  ))}
                </span>
                {avatarTab === "icon" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_OPTIONS.map((key) => {
                      const Icon = getIcon(key);
                      const on = iconKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          title={getIconLabel(key)}
                          aria-pressed={on}
                          onClick={() => setIconKey(key)}
                          className={cn(
                            "grid h-8 w-8 place-items-center rounded-[8px] border transition-colors duration-[110ms]",
                            on
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card text-muted-foreground hover:border-hairline hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <LogoField key={String(open)} existingLogoUrl={task?.logoUrl} />
                )}
              </div>
            </div>

            <Field label="Status">
              <div className="flex gap-1.5">
                <ChoiceChip active={isActive} activeClassName="border-done bg-done-wash text-done" onClick={() => setIsActive(true)}>
                  <Play className="h-3 w-3" strokeWidth={2.2} />
                  Active
                </ChoiceChip>
                <ChoiceChip active={!isActive} activeClassName="border-warn bg-warn-wash text-warn" onClick={() => setIsActive(false)}>
                  <Pause className="h-3 w-3" strokeWidth={2.2} />
                  Paused
                </ChoiceChip>
              </div>
              <span className="text-[10.5px] text-muted-foreground">
                A paused habit keeps its history but stays off Today.
              </span>
            </Field>

            {error ? (
              <p role="alert" aria-live="polite" className="text-[12.5px] text-destructive">
                {error}
              </p>
            ) : null}
          </form>

          <div className="flex shrink-0 items-center gap-2.5 border-t border-rule-soft bg-canvas-sunk px-[18px] py-[13px]">
            {isEdit && task?.id && onRequestDelete ? (
              <button
                type="button"
                onClick={() => {
                  const target: DeleteDailyTaskTarget = {
                    id: task.id!,
                    title: task.title,
                    iconKey: task.iconKey,
                    logoUrl: task.logoUrl,
                  };
                  setOpen(false);
                  onRequestDelete(target);
                }}
                className="text-[11.5px] font-semibold text-faint transition-colors hover:text-destructive"
              >
                Delete habit
              </button>
            ) : (
              <span className={cn("text-[11.5px]", ready ? "text-faint" : "text-hairline")}>
                {ready ? "Enter to save · Esc to discard" : "Name the habit"}
              </span>
            )}
            <span className="flex-1" />
            <DialogPrimitive.Close className="inline-flex h-8 items-center rounded-[8px] px-3 text-[12.5px] text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
              Cancel
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!ready}
              className={cn(
                "inline-flex h-8 items-center rounded-[8px] px-[15px] text-[12.5px] font-semibold transition-colors",
                ready ? "bg-foreground text-background hover:bg-ink-soft" : "cursor-default bg-track text-faint"
              )}
            >
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create habit"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-faint uppercase">{label}</span>
      {children}
    </label>
  );
}

function ChoiceChip({
  active,
  activeClassName,
  onClick,
  children,
}: {
  active: boolean;
  activeClassName: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[30px] items-center gap-1.5 rounded-[7px] border px-3 text-[12.5px] font-semibold transition-colors duration-[120ms]",
        active ? activeClassName : "border-border bg-card text-muted-foreground hover:border-hairline"
      )}
    >
      {children}
    </button>
  );
}
