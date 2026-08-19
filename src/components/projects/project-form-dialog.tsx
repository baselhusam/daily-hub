"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { createProject, updateProject } from "@/app/actions/projects";
import {
  DeleteProjectDialog,
  type DeleteProjectTarget,
} from "./delete-project-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { DialogInput, DialogTextarea, FieldLabel } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { getIcon, getIconLabel, ICON_OPTIONS } from "@/lib/icons";
import { applyLogoToFormData } from "@/lib/logo";
import { parseDateInput, toDateOnlyString } from "@/lib/dates";

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
  milestones?: Array<{
    id: string;
    name: string;
    dueDate: Date | null;
    done: boolean;
  }>;
};

type ProjectFormDialogProps = {
  project?: ProjectFormValues;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ProjectFormDialog({
  project,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ProjectFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [milestones, setMilestones] = React.useState<MilestoneForm[]>([]);
  const [iconKey, setIconKey] = React.useState(project?.iconKey ?? "folder");
  const [status, setStatus] = React.useState<"ACTIVE" | "PAUSED" | "DONE">(
    project?.status ?? "ACTIVE"
  );
  const [dueDate, setDueDate] = React.useState(
    project?.dueDate ? toDateOnlyString(project.dueDate) : ""
  );
  const [pendingDelete, setPendingDelete] =
    React.useState<DeleteProjectTarget | null>(null);
  const isEdit = Boolean(project?.id);

  React.useEffect(() => {
    if (open) {
      setMilestones(
        project?.milestones?.map((m) => ({
          name: m.name,
          dueDate: m.dueDate ? toDateOnlyString(m.dueDate) : "",
        })) ?? []
      );
      setIconKey(project?.iconKey ?? "folder");
      setStatus(project?.status ?? "ACTIVE");
      setDueDate(project?.dueDate ? toDateOnlyString(project.dueDate) : "");
    }
  }, [open, project]);

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
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {(trigger || controlledOpen === undefined) && (
          <DialogTrigger asChild>
            {trigger ?? (
              <Button size="sm" className="h-9 gap-1 px-4 text-[13.5px] font-semibold">
                <Plus className="h-3.5 w-3.5" />
                Project
              </Button>
            )}
          </DialogTrigger>
        )}
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
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Deadline</FieldLabel>
              <DatePicker
                name="dueDate"
                value={dueDate}
                onValueChange={setDueDate}
                placeholder="No deadline"
              />
            </label>
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
                  <DatePicker
                    value={milestone.dueDate}
                    onValueChange={(nextDate) => {
                      const next = [...milestones];
                      next[index] = { ...next[index], dueDate: nextDate };
                      setMilestones(next);
                    }}
                    placeholder="Due"
                    className="w-[158px] shrink-0 rounded-md py-2 text-[13px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-hairline hover:text-destructive"
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
              <SelectMenu
                name="iconKey"
                value={iconKey}
                onValueChange={setIconKey}
                options={ICON_OPTIONS.map((icon) => {
                  const Icon = getIcon(icon);
                  return {
                    value: icon,
                    label: getIconLabel(icon),
                    leading: <Icon className="h-4 w-4 text-muted-foreground" />,
                  };
                })}
                ariaLabel="Project icon"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Status</FieldLabel>
              <SelectMenu
                name="status"
                value={status}
                onValueChange={(next) =>
                  setStatus(next as "ACTIVE" | "PAUSED" | "DONE")
                }
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "PAUSED", label: "Paused" },
                  { value: "DONE", label: "Done" },
                ]}
                ariaLabel="Project status"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter>
            {isEdit && project?.id && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-faint hover:text-destructive"
                onClick={() => {
                  const target: DeleteProjectTarget = {
                    id: project.id!,
                    name: project.name,
                    logoUrl: project.logoUrl,
                    iconKey: project.iconKey,
                    milestoneCount: milestones.filter((m) => m.name.trim())
                      .length,
                  };
                  setOpen(false);
                  window.setTimeout(() => setPendingDelete(target), 160);
                }}
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
      <DeleteProjectDialog
        project={pendingDelete}
        open={pendingDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDelete(null);
        }}
      />
    </>
  );
}
