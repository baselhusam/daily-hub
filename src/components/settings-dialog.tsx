"use client";

import * as React from "react";
import { updateSettings } from "@/app/actions/settings";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogInput, FieldLabel } from "@/components/ui/input";
import type { AppSettings } from "@/lib/settings";

type SettingsDialogProps = {
  settings: AppSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsDialog({
  settings,
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await updateSettings(new FormData(event.currentTarget));
    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Failed to save settings.");
      return;
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Display name</FieldLabel>
              <DialogInput
                name="displayName"
                autoComplete="nickname"
                defaultValue={settings.displayName}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Role</FieldLabel>
              <DialogInput
                name="role"
                autoComplete="organization-title"
                defaultValue={settings.role}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Workspace name</FieldLabel>
              <DialogInput
                name="workspaceName"
                autoComplete="organization"
                defaultValue={settings.workspaceName}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Nudge after (days)</FieldLabel>
              <DialogInput
                name="nudgeDays"
                type="number"
                min={2}
                max={21}
                defaultValue={settings.nudgeDays}
                required
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Show streaks</span>
              <input
                type="checkbox"
                name="showStreaks"
                defaultChecked={settings.showStreaks}
                className="size-4 rounded border-border"
              />
            </label>
            <div className="flex items-center justify-between border-t border-rule-soft pt-3">
              <span className="text-sm">Theme</span>
              <ThemeToggle />
            </div>
            {error && <p role="alert" aria-live="polite" className="text-sm text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
