"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Pause, Play, Plus, X } from "lucide-react";
import { createProject, updateProject } from "@/app/actions/projects";
import { Dialog, DialogOverlay, DialogPortal, DialogTrigger } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { EntityAvatar, INITIALS_ICON_KEY } from "@/components/ui/entity-avatar";
import { LogoField } from "@/components/ui/logo-field";
import { LogoPixelPicker } from "@/components/ui/logo-pixel-picker";
import { parseDateInput, toDateInputValue } from "@/lib/dates";
import { getIcon, getIconLabel, ICON_OPTIONS } from "@/lib/icons";
import { applyLogoToFormData } from "@/lib/logo";
import { FALLBACK_PALETTE } from "@/lib/logo-color";
import { extractAccentFromDataUrl } from "@/lib/logo-color-client";
import { cn } from "@/lib/utils";
import {
  DeleteProjectDialog,
  type DeleteProjectTarget,
} from "./delete-project-dialog";

export type ProjectFormValues = {
  id?: string;
  name: string;
  description: string | null;
  iconKey: string;
  logoUrl: string | null;
  color: string | null;
  colorSource: "auto" | "manual";
  dueDate: Date | null;
  status: "ACTIVE" | "PAUSED" | "DONE";
  milestones?: Array<{ id: string; name: string; dueDate: Date | null; done: boolean }>;
};

type ProjectFormDialogProps = {
  project?: ProjectFormValues;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Fired after a successful delete from the edit sheet. */
  onDeleted?: () => void;
  /**
   * Hands the delete to the parent instead of confirming here. Needed when the
   * parent unmounts this sheet on close, which would take the confirm dialog
   * down with it.
   */
  onRequestDelete?: (target: DeleteProjectTarget) => void;
};

type AvatarTab = "initials" | "icon" | "image";
type ColorMode = "palette" | "spectrum" | "image";
type Status = "ACTIVE" | "PAUSED" | "DONE";

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const HUES = [0, 20, 40, 60, 90, 130, 170, 200, 220, 250, 280, 320];
const SHADE_LIGHTNESS = [30, 38, 46, 54, 62, 70];

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return Math.round(h);
}

/**
 * The New / Edit project sheet. One card: name, description, an avatar box
 * (initials, an icon, or an image), status, a colour box (palette, spectrum,
 * or sampled from the logo), and the ship date. Enter saves, Esc closes.
 */
export function ProjectFormDialog({
  project,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onDeleted,
  onRequestDelete,
}: ProjectFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const isEdit = Boolean(project?.id);

  const [name, setName] = React.useState(project?.name ?? "");
  const [description, setDescription] = React.useState(project?.description ?? "");
  const [avatarTab, setAvatarTab] = React.useState<AvatarTab>("initials");
  const [iconKey, setIconKey] = React.useState(project?.iconKey ?? INITIALS_ICON_KEY);
  const [status, setStatus] = React.useState<Status>(project?.status ?? "ACTIVE");
  const [dueDate, setDueDate] = React.useState(
    project?.dueDate ? toDateInputValue(project.dueDate) : ""
  );
  const [color, setColor] = React.useState<string | null>(project?.color ?? null);
  const [colorSource, setColorSource] = React.useState<"auto" | "manual">(
    project?.colorSource ?? "auto"
  );
  const [colorMode, setColorMode] = React.useState<ColorMode>("palette");
  const [autoColor, setAutoColor] = React.useState<string | null>(
    project?.colorSource === "auto" ? (project?.color ?? null) : null
  );
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(null);
  const [extracting, setExtracting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<DeleteProjectTarget | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const extractionToken = React.useRef(0);
  const colorSourceRef = React.useRef(colorSource);
  colorSourceRef.current = colorSource;

  React.useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    const initialIcon = project?.iconKey ?? INITIALS_ICON_KEY;
    setIconKey(initialIcon);
    setAvatarTab(
      project?.logoUrl ? "image" : initialIcon === INITIALS_ICON_KEY ? "initials" : "icon"
    );
    setStatus(project?.status ?? "ACTIVE");
    setDueDate(project?.dueDate ? toDateInputValue(project.dueDate) : "");
    setColor(project?.color ?? null);
    setColorSource(project?.colorSource ?? "auto");
    setColorMode("palette");
    setAutoColor(project?.colorSource === "auto" ? (project?.color ?? null) : null);
    setLogoDataUrl(null);
    setExtracting(false);
    setError(null);
    extractionToken.current += 1;
  }, [open, project]);

  // Token-guarded so a slow remote-logo fetch never clobbers a newer pick.
  const handleLogoResolved = React.useCallback(async (dataUrl: string | null) => {
    const token = ++extractionToken.current;
    if (!dataUrl) {
      setLogoDataUrl(null);
      setAutoColor(null);
      if (colorSourceRef.current === "auto") setColor(null);
      return;
    }
    setExtracting(true);
    const hex = await extractAccentFromDataUrl(dataUrl);
    if (token !== extractionToken.current) return;
    setLogoDataUrl(dataUrl);
    setAutoColor(hex);
    if (colorSourceRef.current === "auto") setColor(hex);
    setExtracting(false);
  }, []);

  const ready = name.trim().length > 0 && !pending;
  const previewColor = color && HEX_PATTERN.test(color) ? color.toUpperCase() : null;
  const previewIcon = avatarTab === "icon" ? iconKey : INITIALS_ICON_KEY;
  const previewLogo = avatarTab === "image" ? (logoDataUrl ?? project?.logoUrl ?? null) : null;

  function pickColor(hex: string) {
    setColor(hex.toUpperCase());
    setColorSource("manual");
  }

  async function submit() {
    if (!ready || !formRef.current) return;
    if (dueDate && parseDateInput(dueDate) === null) {
      setError("Enter a valid ship date.");
      return;
    }
    setPending(true);
    setError(null);
    const formData = new FormData(formRef.current);
    formData.set("name", name.trim());
    formData.set("description", description.trim());
    formData.set("iconKey", avatarTab === "icon" ? iconKey : INITIALS_ICON_KEY);
    formData.set("status", status);
    formData.set("dueDate", dueDate);
    formData.set("color", previewColor ?? "");
    formData.set("colorSource", colorSource);
    if (project?.id) formData.set("id", project.id);
    try {
      if (avatarTab === "image") {
        await applyLogoToFormData(formData, project?.logoUrl);
      } else {
        // Leaving the image tab drops the logo; the avatar is initials or an icon.
        formData.delete("logo");
        formData.set("logoUrl", "");
      }
      const result = isEdit ? await updateProject(formData) : await createProject(formData);
      if (!result.success) {
        setError(result.error ?? "Could not save the project. Try again.");
        return;
      }
      setOpen(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not save the logo.");
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      void submit();
    }
  }

  // Each status wears its own colour when selected — the same signal / warn /
  // done tones the pills use across the app.
  const statuses: Array<{ value: Status; label: string; icon: React.ReactNode; tone: string }> = [
    {
      value: "ACTIVE",
      label: "Active",
      icon: <Play className="h-3 w-3" strokeWidth={2.2} />,
      tone: "border-signal bg-signal-soft text-signal",
    },
    {
      value: "PAUSED",
      label: "Paused",
      icon: <Pause className="h-3 w-3" strokeWidth={2.2} />,
      tone: "border-warn bg-warn-wash text-warn",
    },
    ...(isEdit
      ? [
          {
            value: "DONE" as Status,
            label: "Done",
            icon: <Check className="h-3 w-3" strokeWidth={2.4} />,
            tone: "border-done bg-done-wash text-done",
          },
        ]
      : []),
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {(trigger || controlledOpen === undefined) && (
          <DialogTrigger asChild>
            {trigger ?? (
              <button
                type="button"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[8px] bg-signal px-3.5 text-[13px] font-semibold text-primary-foreground shadow-[0_1px_1px_color-mix(in_srgb,var(--signal)_22%,transparent)] transition-colors duration-[120ms] hover:bg-signal-hover"
              >
                <Plus className="h-[15px] w-[15px]" strokeWidth={2.4} />
                New project
              </button>
            )}
          </DialogTrigger>
        )}
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            data-slot="dialog-content"
            aria-describedby={undefined}
            onKeyDown={handleKeyDown}
            className={cn(
              "fixed z-50 flex w-full flex-col overflow-hidden border border-border bg-card shadow-dialog outline-none",
              "data-[state=open]:animate-dh-pop data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
              "inset-x-0 bottom-0 top-auto max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.75rem))] rounded-t-2xl",
              "dh:inset-auto dh:top-[72px] dh:left-1/2 dh:bottom-auto dh:max-h-[calc(100dvh-90px)] dh:w-[min(calc(100%-2.5rem),460px)] dh:-translate-x-1/2 dh:rounded-[14px]"
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-rule-soft px-[18px] py-[15px]">
              <DialogPrimitive.Title className="truncate text-[14.5px] font-semibold tracking-[-0.01em]">
                {isEdit ? `Edit ${project?.name}` : "New project"}
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
              <Field label="Name">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Pricing Page Refresh"
                  autoFocus
                  maxLength={80}
                  className="h-9 rounded-[8px] border border-border bg-card px-[11px] text-[13.5px] text-foreground outline-none transition-colors placeholder:text-faint focus:border-signal"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={isEdit ? 3 : 2}
                  maxLength={200}
                  placeholder="One line on what this project is for"
                  className="resize-none rounded-[8px] border border-border bg-card px-[11px] py-[9px] text-[13px] leading-[1.5] text-ink-soft outline-none transition-colors placeholder:text-faint focus:border-signal"
                />
              </Field>

              <div className="flex gap-3.5 rounded-[10px] border border-track bg-canvas-sunk p-[13px]">
                <EntityAvatar
                  name={name.trim() || "?"}
                  color={previewColor}
                  logoUrl={previewLogo}
                  iconKey={previewIcon}
                  size={46}
                  rounded="lg"
                  className="shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
                  <Segmented
                    ariaLabel="Avatar"
                    value={avatarTab}
                    onChange={(tab) => {
                      setAvatarTab(tab);
                      // The icon tab should never open with nothing selected.
                      if (tab === "icon" && iconKey === INITIALS_ICON_KEY) setIconKey("folder");
                    }}
                    options={[
                      { value: "initials", label: "Initials" },
                      { value: "icon", label: "Icon" },
                      { value: "image", label: "Image" },
                    ]}
                  />
                  {avatarTab === "initials" ? (
                    <span className="text-[11.5px] text-faint">Initials come from the project name.</span>
                  ) : null}
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
                  ) : null}
                  {avatarTab === "image" ? (
                    <LogoField
                      key={String(open)}
                      existingLogoUrl={project?.logoUrl}
                      onLogoResolved={handleLogoResolved}
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-[18px] gap-y-3.5">
                <Field label="Status">
                  <div className="flex gap-1.5">
                    {statuses.map((option) => (
                      <ChoiceChip
                        key={option.value}
                        active={status === option.value}
                        activeClassName={option.tone}
                        onClick={() => setStatus(option.value)}
                      >
                        {option.icon}
                        {option.label}
                      </ChoiceChip>
                    ))}
                  </div>
                </Field>
                <Field label="Ship date" className="min-w-[180px] flex-1">
                  <DatePicker
                    value={dueDate}
                    onValueChange={setDueDate}
                    placeholder="No ship date"
                    variant="compact"
                    className="h-[30px] rounded-[7px] border-border bg-card text-[12.5px]"
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-[7px]">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-[11px] font-semibold tracking-[0.04em] text-faint uppercase">
                    Colour
                  </span>
                  <Segmented
                    ariaLabel="Colour mode"
                    value={colorMode}
                    onChange={setColorMode}
                    small
                    options={[
                      { value: "palette", label: "Palette" },
                      { value: "spectrum", label: "Spectrum" },
                      { value: "image", label: "From image" },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-[9px] rounded-[10px] border border-track bg-canvas-sunk px-[11px] py-2.5">
                  <div className="flex items-center gap-[9px]">
                    <span
                      className="h-[26px] w-[26px] shrink-0 rounded-[8px] shadow-[inset_0_0_0_1px_rgba(15,15,15,0.08)]"
                      style={{ backgroundColor: previewColor ?? "var(--track)" }}
                    />
                    <span className="text-[12px] font-semibold text-foreground tabular-nums">
                      {previewColor ?? "Auto"}
                    </span>
                    {colorSource === "auto" ? (
                      <span
                        className={cn(
                          "rounded-[4px] bg-hover px-1.5 py-px text-[10px] font-semibold text-faint",
                          extracting && "animate-pulse"
                        )}
                      >
                        {autoColor ? "from logo" : "default"}
                      </span>
                    ) : null}
                    <span className="flex-1" />
                    {colorSource === "manual" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setColor(autoColor);
                          setColorSource("auto");
                        }}
                        className="text-[11px] font-semibold text-faint transition-colors hover:text-foreground"
                      >
                        Reset to auto
                      </button>
                    ) : null}
                    {colorMode === "image" && autoColor && previewColor !== autoColor ? (
                      <button
                        type="button"
                        onClick={() => pickColor(autoColor)}
                        className="inline-flex h-[26px] items-center gap-1.5 rounded-[7px] border border-border bg-card px-2 text-[11px] font-semibold text-foreground transition-colors hover:border-hairline"
                      >
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: autoColor }} />
                        Use suggestion
                      </button>
                    ) : null}
                  </div>

                  {colorMode === "palette" ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {FALLBACK_PALETTE.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            title={swatch}
                            aria-pressed={previewColor === swatch}
                            onClick={() => pickColor(swatch)}
                            className={cn(
                              "h-[22px] w-[22px] rounded-[7px] transition-transform duration-[120ms] hover:scale-110",
                              previewColor === swatch &&
                                "shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--foreground)]"
                            )}
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                      </div>
                      <span className="text-[10.5px] text-muted-foreground">
                        The project colours used across the app.
                      </span>
                    </div>
                  ) : null}

                  {colorMode === "spectrum" ? (
                    <SpectrumPicker value={previewColor} onPick={pickColor} />
                  ) : null}

                  {colorMode === "image" ? (
                    logoDataUrl ? (
                      <div className="flex flex-col gap-2">
                        <LogoPixelPicker dataUrl={logoDataUrl} onPick={pickColor} />
                        <span className="text-[10.5px] text-muted-foreground">
                          Sampled from your logo — click a pixel to take that colour.
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11.5px] text-muted-foreground">
                        {avatarTab === "image"
                          ? "Add a logo above to sample colours from it."
                          : "Switch the avatar to Image and add a logo to sample from it."}
                      </span>
                    )
                  ) : null}
                </div>
              </div>

              {error ? (
                <p role="alert" aria-live="polite" className="text-[12.5px] text-destructive">
                  {error}
                </p>
              ) : null}
            </form>

            <div className="flex shrink-0 items-center gap-2.5 border-t border-rule-soft bg-canvas-sunk px-[18px] py-[13px]">
              {isEdit && project?.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const target: DeleteProjectTarget = {
                      id: project.id!,
                      name: project.name,
                      logoUrl: project.logoUrl,
                      iconKey: project.iconKey,
                      color: project.color,
                      milestoneCount: project.milestones?.length ?? 0,
                    };
                    setOpen(false);
                    if (onRequestDelete) {
                      onRequestDelete(target);
                      return;
                    }
                    window.setTimeout(() => setPendingDelete(target), 160);
                  }}
                  className="text-[11.5px] font-semibold text-faint transition-colors hover:text-destructive"
                >
                  Delete project
                </button>
              ) : (
                <span className={cn("text-[11.5px]", ready ? "text-faint" : "text-hairline")}>
                  {ready ? "Enter to save · Esc to discard" : "Give the project a name"}
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
                  ready
                    ? "bg-foreground text-background hover:bg-ink-soft"
                    : "cursor-default bg-track text-faint"
                )}
              >
                {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
      <DeleteProjectDialog
        project={pendingDelete}
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        onDeleted={onDeleted}
      />
    </>
  );
}

function SpectrumPicker({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (hex: string) => void;
}) {
  const [hue, setHue] = React.useState(value ? hexToHue(value) : 220);
  const [draft, setDraft] = React.useState(value ?? "");
  React.useEffect(() => setDraft(value ?? ""), [value]);
  const nearestHue = HUES.reduce((best, candidate) =>
    Math.abs(candidate - hue) < Math.abs(best - hue) ? candidate : best
  );

  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex gap-[3px]">
        {HUES.map((candidate) => {
          const hex = hslToHex(candidate, 62, 50);
          return (
            <button
              key={candidate}
              type="button"
              title={hex}
              onClick={() => {
                setHue(candidate);
                onPick(hex);
              }}
              className={cn(
                "h-[22px] flex-1 rounded-[5px]",
                nearestHue === candidate &&
                  "shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--foreground)]"
              )}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>
      <div className="flex gap-[3px]">
        {SHADE_LIGHTNESS.map((lightness) => {
          const hex = hslToHex(hue, 62, lightness);
          return (
            <button
              key={lightness}
              type="button"
              title={hex}
              onClick={() => onPick(hex)}
              className={cn(
                "h-[18px] flex-1 rounded-[5px]",
                value === hex && "shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--foreground)]"
              )}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-border bg-card px-[9px]">
          <span className="text-[10px] font-bold text-hairline">HEX</span>
          <input
            value={draft}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              if (HEX_PATTERN.test(next)) {
                setHue(hexToHue(next));
                onPick(next);
              }
            }}
            placeholder="#2383E2"
            maxLength={7}
            spellCheck={false}
            className="w-[82px] bg-transparent text-[12px] font-semibold text-foreground uppercase outline-none placeholder:text-faint"
          />
        </span>
        <span className="text-[10.5px] text-muted-foreground">
          Pick a hue, then a shade — or type any value.
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-semibold tracking-[0.04em] text-faint uppercase">{label}</span>
      {children}
    </label>
  );
}

function ChoiceChip({
  active,
  activeClassName = "border-signal bg-signal-soft text-signal",
  onClick,
  children,
}: {
  active: boolean;
  activeClassName?: string;
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

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  small = false,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  small?: boolean;
}) {
  return (
    <span
      role="group"
      aria-label={ariaLabel}
      className="inline-flex w-fit gap-0.5 rounded-[8px] border border-border bg-card p-[3px]"
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center rounded-[6px] font-semibold transition-colors duration-[120ms]",
              small ? "h-6 px-2.5 text-[11px]" : "h-[26px] px-3 text-[12px]",
              on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}
