"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { createBusiness } from "@/app/actions/businesses";
import { uploadLogo } from "@/app/actions/upload";
import { Button } from "@/components/ui/button";
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

export function CreateBusinessDialog() {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

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
        if (logoUrl) formData.set("logoUrl", logoUrl);
      }

      const result = await createBusiness(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to create business.");
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
        <Button variant="outline" size="sm" className="h-9 gap-1 px-4 text-[13.5px] font-semibold">
          <Plus className="h-3.5 w-3.5" />
          Business
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New business</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Business name</FieldLabel>
              <DialogInput
                name="name"
                placeholder="e.g. Raqam Studio"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Icon</FieldLabel>
              <DialogSelect name="iconKey" defaultValue="briefcase">
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </DialogSelect>
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Logo</FieldLabel>
              <DialogInput name="logo" type="file" accept="image/*" />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter className="justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
