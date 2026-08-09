"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { createDailyTask } from "@/app/actions/daily-tasks";
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
import type { DashboardBusiness } from "@/lib/dashboard";

type CreateDailyTaskDialogProps = {
  businesses: DashboardBusiness[];
};

export function CreateDailyTaskDialog({ businesses }: CreateDailyTaskDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createDailyTask(new FormData(event.currentTarget));
    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create daily task.");
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
          Daily
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create daily task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="daily-title">Title</Label>
            <Input
              id="daily-title"
              name="title"
              placeholder="Publish Medium post"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily-icon">Icon</Label>
            <select
              id="daily-icon"
              name="iconKey"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue="newspaper"
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily-business">Business (optional)</Label>
            <select
              id="daily-business"
              name="businessId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue="none"
            >
              <option value="none">None</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create daily task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
