"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { createProject, updateProject } from "@/app/actions/projects";
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
import { toDateOnlyString } from "@/lib/dates";

type BusinessOption = { id: string; name: string };

export type ProjectFormValues = {
  id?: string;
  name: string;
  description: string | null;
  iconKey: string;
  logoUrl: string | null;
  dueDate: Date | null;
  status: "ACTIVE" | "PAUSED" | "DONE";
  businessId: string | null;
};

type ProjectFormDialogProps = {
  businesses: BusinessOption[];
  project?: ProjectFormValues;
  trigger?: React.ReactNode;
};

export function ProjectFormDialog({
  businesses,
  project,
  trigger,
}: ProjectFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const isEdit = Boolean(project?.id);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const logoFile = formData.get("logo") as File | null;
      if (logoFile && logoFile.size > 0) {
        const uploadData = new FormData();
        uploadData.set("logo", logoFile);
        const logoUrl = await uploadLogo(uploadData);
        if (logoUrl) {
          formData.set("logoUrl", logoUrl);
        }
      } else if (project?.logoUrl) {
        formData.set("logoUrl", project.logoUrl);
      }

      const result = isEdit
        ? await updateProject(formData)
        : await createProject(formData);

      if (!result.success) {
        setError(result.error ?? "Failed to save project.");
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
            Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {project?.id && <input type="hidden" name="id" value={project.id} />}
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              name="name"
              placeholder="DailyHub"
              defaultValue={project?.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              name="description"
              placeholder="Optional short description"
              defaultValue={project?.description ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-due-date">Due date</Label>
            <Input
              id="project-due-date"
              name="dueDate"
              type="date"
              defaultValue={
                project?.dueDate ? toDateOnlyString(project.dueDate) : ""
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-logo">Logo (optional)</Label>
            <Input id="project-logo" name="logo" type="file" accept="image/*" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-icon">Icon</Label>
            <select
              id="project-icon"
              name="iconKey"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={project?.iconKey ?? "folder"}
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-business">Business (optional)</Label>
            <select
              id="project-business"
              name="businessId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={project?.businessId ?? "none"}
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
            <Label htmlFor="project-status">Status</Label>
            <select
              id="project-status"
              name="status"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={project?.status ?? "ACTIVE"}
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
