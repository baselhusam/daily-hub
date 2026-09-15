"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTheme } from "next-themes";
import { updateSettings } from "@/app/actions/settings";
import { BrandMark } from "@/components/brand-mark";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import type { AppSettings, WeekStart } from "@/lib/settings";
import { cn } from "@/lib/utils";

type SettingsDialogProps = {
  settings: AppSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const THEMES = [
  { value: "light", label: "Light", chip: "#FFFFFF" },
  { value: "dark", label: "Dark", chip: "#2B2A28" },
] as const;

const WEEK_STARTS: Array<{ value: WeekStart; label: string }> = [
  { value: 1, label: "Monday" },
  { value: 0, label: "Sunday" },
];

const NUDGE_OPTIONS = [3, 5, 7, 14];

/**
 * Workspace settings: name, display name, theme, week start, the stalled
 * nudge threshold, and streaks. Theme applies as soon as it is picked (it is
 * a browser preference); everything else saves together.
 */
export function SettingsDialog({ settings, open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const [workspaceName, setWorkspaceName] = React.useState(settings.workspaceName);
  const [displayName, setDisplayName] = React.useState(settings.displayName);
  const [weekStartsOn, setWeekStartsOn] = React.useState<WeekStart>(settings.weekStartsOn);
  const [nudgeDays, setNudgeDays] = React.useState(settings.nudgeDays);
  const [showStreaks, setShowStreaks] = React.useState(settings.showStreaks);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Re-seed the draft each time the dialog opens so a cancelled edit never
  // leaks into the next one.
  React.useEffect(() => {
    if (!open) return;
    setWorkspaceName(settings.workspaceName);
    setDisplayName(settings.displayName);
    setWeekStartsOn(settings.weekStartsOn);
    setNudgeDays(settings.nudgeDays);
    setShowStreaks(settings.showStreaks);
    setError(null);
  }, [open, settings]);

  const ready = workspaceName.trim().length > 0 && displayName.trim().length > 0 && !pending;
  const activeTheme = mounted ? (theme === "dark" ? "dark" : "light") : "light";

  async function save() {
    if (!ready) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("workspaceName", workspaceName.trim());
    formData.set("displayName", displayName.trim());
    formData.set("weekStartsOn", String(weekStartsOn));
    formData.set("nudgeDays", String(nudgeDays));
    formData.set("showStreaks", showStreaks ? "true" : "false");
    try {
      const result = await updateSettings(formData);
      if (!result.success) {
        setError(result.error ?? "Could not save settings. Try again.");
        return;
      }
      onOpenChange(false);
    } catch {
      setError("Could not save settings. Try again.");
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex w-full flex-col overflow-hidden border border-border bg-card shadow-dialog outline-none",
            "data-[state=open]:animate-dh-pop data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "inset-x-0 bottom-0 top-auto max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.75rem))] rounded-t-2xl",
            "dh:inset-auto dh:top-[82px] dh:left-1/2 dh:bottom-auto dh:max-h-[calc(100dvh-100px)] dh:w-[min(calc(100%-2.5rem),436px)] dh:-translate-x-1/2 dh:rounded-[14px]"
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-rule-soft px-[18px] py-[15px]">
            <DialogPrimitive.Title className="text-[14.5px] font-semibold tracking-[-0.01em]">
              Workspace settings
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="grid h-[26px] w-[26px] place-items-center rounded-[6px] text-faint transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-[15px] overflow-y-auto p-[18px]">
            <div className="flex items-center gap-3 rounded-[11px] border border-track bg-canvas-sunk p-3">
              <BrandMark size={34} className="shrink-0 text-foreground" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
                  {workspaceName.trim() || "Untitled workspace"}
                </span>
                <span className="truncate text-[11.5px] text-faint">
                  {displayName.trim() || "—"} · local, single-user
                </span>
              </span>
            </div>

            <Field label="Workspace name">
              <TextInput
                value={workspaceName}
                onChange={setWorkspaceName}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="organization"
                maxLength={80}
              />
            </Field>

            <Field label="Display name" hint="Used in the greeting and on your avatar.">
              <TextInput
                value={displayName}
                onChange={setDisplayName}
                onKeyDown={handleKeyDown}
                autoComplete="nickname"
                maxLength={80}
              />
            </Field>

            <Field label="Theme">
              <div className="flex gap-1.5">
                {THEMES.map((option) => (
                  <ChoiceChip
                    key={option.value}
                    active={activeTheme === option.value}
                    onClick={() => setTheme(option.value)}
                  >
                    <span
                      aria-hidden
                      className="h-[11px] w-[11px] rounded-[4px] shadow-[inset_0_0_0_1px_rgba(15,15,15,0.12)]"
                      style={{ backgroundColor: option.chip }}
                    />
                    {option.label}
                  </ChoiceChip>
                ))}
              </div>
            </Field>

            <Field label="Week starts on">
              <div className="flex gap-1.5">
                {WEEK_STARTS.map((option) => (
                  <ChoiceChip
                    key={option.value}
                    active={weekStartsOn === option.value}
                    onClick={() => setWeekStartsOn(option.value)}
                  >
                    {option.label}
                  </ChoiceChip>
                ))}
              </div>
            </Field>

            <Field label="Nudge after" hint="A project with open work and no activity for this long is flagged as stalled.">
              <div className="flex flex-wrap gap-1.5">
                {NUDGE_OPTIONS.map((days) => (
                  <ChoiceChip
                    key={days}
                    active={nudgeDays === days}
                    onClick={() => setNudgeDays(days)}
                  >
                    {days} days
                  </ChoiceChip>
                ))}
                {!NUDGE_OPTIONS.includes(nudgeDays) ? (
                  <ChoiceChip active onClick={() => undefined}>
                    {nudgeDays} days
                  </ChoiceChip>
                ) : null}
              </div>
            </Field>

            <button
              type="button"
              role="switch"
              aria-checked={showStreaks}
              onClick={() => setShowStreaks((value) => !value)}
              className="flex items-center gap-3 rounded-[10px] border border-track bg-canvas-sunk px-[11px] py-[9px] text-left transition-colors hover:border-border-strong"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-foreground">Show streaks</span>
                <span className="mt-0.5 block text-[11px] text-faint">
                  Streak counters on habits and the sidebar chain.
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-[140ms]",
                  showStreaks ? "bg-signal" : "bg-border-strong"
                )}
              >
                <span
                  className={cn(
                    "h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,15,15,0.28)] transition-transform duration-[140ms] ease-[cubic-bezier(0.2,0.8,0.3,1)]",
                    showStreaks ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </span>
            </button>

            {error ? (
              <p role="alert" aria-live="polite" className="text-[12.5px] text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-rule-soft bg-canvas-sunk px-[18px] py-[13px]">
            <DialogPrimitive.Close className="inline-flex h-8 items-center rounded-[8px] border border-border bg-card px-[13px] text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-hairline hover:text-foreground">
              Cancel
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!ready}
              className={cn(
                "inline-flex h-8 items-center rounded-[8px] px-[15px] text-[12.5px] font-semibold transition-[background-color,filter] hover:brightness-[1.06]",
                ready ? "bg-foreground text-background" : "cursor-default bg-hairline text-background"
              )}
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-faint uppercase">{label}</span>
      {children}
      {hint ? <span className="text-[10.5px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-[8px] border border-border bg-card px-[11px] text-[13.5px] text-foreground outline-none transition-colors focus:border-signal"
      {...props}
    />
  );
}

function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[30px] items-center gap-[7px] rounded-[7px] border px-3 text-[12.5px] font-semibold transition-colors duration-[120ms]",
        active
          ? "border-signal bg-signal-soft text-signal"
          : "border-border bg-card text-muted-foreground hover:border-hairline"
      )}
    >
      {children}
    </button>
  );
}
