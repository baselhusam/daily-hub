"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { createBusiness } from "@/app/actions/businesses";
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
        if (logoUrl) {
          formData.set("logoUrl", logoUrl);
        }
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
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" />
          Business
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create business</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Name</Label>
            <Input id="business-name" name="name" placeholder="Consulting" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-icon">Icon</Label>
            <select
              id="business-icon"
              name="iconKey"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue="briefcase"
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-logo">Logo (optional)</Label>
            <Input id="business-logo" name="logo" type="file" accept="image/*" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create business"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
