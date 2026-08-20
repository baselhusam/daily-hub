"use client";

import * as React from "react";
import { ImageIcon, Link2, Upload } from "lucide-react";
import { DialogInput, FieldLabel } from "@/components/ui/input";
import { isRemoteLogoUrl } from "@/lib/logo";
import { cn } from "@/lib/utils";

type LogoSource = "upload" | "url";

type LogoFieldProps = {
  existingLogoUrl?: string | null;
};

export function LogoField({ existingLogoUrl }: LogoFieldProps) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [source, setSource] = React.useState<LogoSource>(
    isRemoteLogoUrl(existingLogoUrl) ? "url" : "upload"
  );
  const [remoteUrl, setRemoteUrl] = React.useState(
    isRemoteLogoUrl(existingLogoUrl) ? existingLogoUrl ?? "" : ""
  );
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const previewSrc = remoteUrl.trim();
  const showLivePreview = source === "url" && /^https?:\/\//i.test(previewSrc);
  const uploadPreview = objectUrl ?? (!isRemoteLogoUrl(existingLogoUrl) ? existingLogoUrl : null);

  React.useEffect(() => {
    setPreviewFailed(false);
  }, [previewSrc]);

  React.useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  function assignFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (fileRef.current) fileRef.current.files = transfer.files;
    setFileName(file.name);
    setObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <FieldLabel>Logo</FieldLabel>
        <div
          role="tablist"
          aria-label="Logo source"
          className="inline-flex rounded-md border border-border bg-paper p-[3px]"
        >
          <SourceTab
            active={source === "upload"}
            onClick={() => setSource("upload")}
          >
            <Upload className="size-3" />
            Upload
          </SourceTab>
          <SourceTab
            active={source === "url"}
            onClick={() => setSource("url")}
          >
            <Link2 className="size-3" />
            URL
          </SourceTab>
        </div>
      </div>

      {source === "upload" ? (
        <label
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDragOver(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            assignFile(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-[10px] border border-dashed px-3 py-2.5 transition-colors duration-[120ms]",
            dragOver
              ? "border-signal bg-signal-soft"
              : "border-input bg-background hover:border-border-strong hover:bg-canvas-sunk"
          )}
        >
            <span className="relative inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-paper">
              {uploadPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uploadPreview}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ImageIcon className="size-3.5 text-faint" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] leading-snug">
                {fileName
                  ? fileName
                  : existingLogoUrl
                    ? "Replace current logo"
                    : "Drop an image, or click to choose"}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-faint">
                PNG, JPG, or SVG
              </span>
            </span>
            <input
              ref={fileRef}
              name="logo"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => assignFile(event.target.files?.[0])}
            />
          </label>
      ) : (
        <div className="flex items-center gap-2.5">
          <span className="relative inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-paper">
            {showLivePreview && !previewFailed ? (
              // Native img so any remote URL can preview without Next image config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={previewSrc}
                src={previewSrc}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <Link2 className="size-3.5 text-faint" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <DialogInput
              name="logoRemoteUrl"
              type="url"
              inputMode="url"
              placeholder="https://example.com/logo.png"
              value={remoteUrl}
              onChange={(event) => setRemoteUrl(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="rounded-[10px] py-[9px]"
            />
            {previewFailed ? (
              <p className="mt-1 text-[11.5px] text-destructive">
                Couldn’t load that image. Check the URL.
              </p>
            ) : null}
          </div>
        </div>
      )}

      <input type="hidden" name="logoSource" value={source} />
    </div>
  );
}

function SourceTab({
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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-[5px] px-2 text-[11px] font-semibold tracking-[0.01em] transition-colors duration-[120ms]",
        active
          ? "bg-background text-foreground shadow-raised"
          : "text-faint hover:text-ink-soft"
      )}
    >
      {children}
    </button>
  );
}
