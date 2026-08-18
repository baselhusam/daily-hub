"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { createProject, deleteProject, updateProject } from "@/app/actions/projects";
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
  DialogTextarea,
  FieldLabel,
} from "@/components/ui/input";
import { ICON_OPTIONS } from "@/lib/icons";
import { applyLogoToFormData } from "@/lib/logo";
import { parseDateInput, toDateOnlyString } from "@/lib/dates";

type BusinessOption = { id: string; name: string };

type MilestoneForm = {
  name: string;
  dueDate: string;
};

export type ProjectFormValues = {
  id?: string;
  name: string;
  description: string | null;
  iconKey: string;
  logoUrl: string | null;
  dueDate: Date | null;
  status: "ACTIVE" | "PAUSED" | "DONE";
  businessId: string | null;
  milestones?: Array<{
    id: string;
    name: string;
    dueDate: Date | null;
    done: boolean;
  }>;
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
  const [milestones, setMilestones] = React.useState<MilestoneForm[]>([]);
  const isEdit = Boolean(project?.id);

  React.useEffect(() => {
    if (open) {
      setMilestones(
        project?.milestones?.map((m) => ({
          name: m.name,
          dueDate: m.dueDate ? toDateOnlyString(m.dueDate) : "",
        })) ?? []
      );
    }
  }, [open, project?.milestones]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const dueDate = String(new FormData(form).get("dueDate") ?? "");
    if (dueDate && parseDateInput(dueDate) === null) {
      setError("Enter a valid date with a 4-digit year.");
      setPending(false);
      return;
    }

    for (const milestone of milestones) {
      if (!milestone.name.trim()) continue;
      if (milestone.dueDate && parseDateInput(milestone.dueDate) === null) {
        setError("Each milestone needs a valid date with a 4-digit year.");
        setPending(false);
        return;
      }
    }

    const formData = new FormData(form);

    for (const milestone of milestones) {
      if (!milestone.name.trim()) continue;
      formData.append("milestoneName", milestone.name.trim());
      formData.append("milestoneDue", milestone.dueDate);
    }

    try {
      await applyLogoToFormData(formData, project?.logoUrl);

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
            Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {project?.id && <input type="hidden" name="id" value={project.id} />}
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Project name</FieldLabel>
              <DialogInput
                name="name"
                placeholder="e.g. ClickML"
                defaultValue={project?.name}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Description</FieldLabel>
              <DialogTextarea
                name="description"
                placeholder="What is this, in one line?"
                defaultValue={project?.description ?? ""}
                rows={2}
              />
            </label>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Business</FieldLabel>
                <DialogSelect
                  name="businessId"
                  defaultValue={project?.businessId ?? "none"}
                >
                  <option value="none">Standalone</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </DialogSelect>
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Deadline</FieldLabel>
                <DialogInput
                  name="dueDate"
                  type="date"
                  defaultValue={
                    project?.dueDate ? toDateOnlyString(project.dueDate) : ""
                  }
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 border-t border-rule-soft pt-4">
              <FieldLabel>Milestones</FieldLabel>
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <DialogInput
                    value={milestone.name}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[index] = { ...next[index], name: e.target.value };
                      setMilestones(next);
                    }}
                    placeholder="Milestone name"
                    className="flex-1 rounded-md text-[13.5px]"
                  />
                  <DialogInput
                    type="date"
                    value={milestone.dueDate}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[index] = { ...next[index], dueDate: e.target.value };
                      setMilestones(next);
                    }}
                    className="w-[145px] shrink-0 rounded-md text-[13px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#C7C6C2] hover:text-destructive"
                    onClick={() =>
                      setMilestones(milestones.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="self-start border-dashed text-[12.5px] font-semibold text-muted-foreground"
                onClick={() =>
                  setMilestones([...milestones, { name: "", dueDate: "" }])
                }
              >
                + Add milestone
              </Button>
            </div>
            <LogoField
              key={String(open)}
              existingLogoUrl={project?.logoUrl}
            />
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Icon</FieldLabel>
              <DialogSelect
                name="iconKey"
                defaultValue={project?.iconKey ?? "folder"}
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </DialogSelect>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Status</FieldLabel>
              <DialogSelect name="status" defaultValue={project?.status ?? "ACTIVE"}>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="DONE">Done</option>
              </DialogSelect>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter>
            {isEdit && project?.id && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-faint hover:text-destructive"
                onClick={() => deleteProject(project.id!)}
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
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
