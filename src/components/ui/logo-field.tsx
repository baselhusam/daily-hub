"use client";

import * as React from "react";
import { Link2, Upload } from "lucide-react";
import { DialogInput, FieldLabel } from "@/components/ui/input";
import { isRemoteLogoUrl } from "@/lib/logo";
import { cn } from "@/lib/utils";

type LogoSource = "upload" | "url";

type LogoFieldProps = {
  existingLogoUrl?: string | null;
};

export function LogoField({ existingLogoUrl }: LogoFieldProps) {
  const [source, setSource] = React.useState<LogoSource>(
    isRemoteLogoUrl(existingLogoUrl) ? "url" : "upload"
  );
  const [remoteUrl, setRemoteUrl] = React.useState(
    isRemoteLogoUrl(existingLogoUrl) ? existingLogoUrl ?? "" : ""
  );
  const [previewFailed, setPreviewFailed] = React.useState(false);

  const previewSrc = remoteUrl.trim();
  const showLivePreview = source === "url" && /^https?:\/\//i.test(previewSrc);

  React.useEffect(() => {
    setPreviewFailed(false);
  }, [previewSrc]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
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
        <div className="flex flex-col gap-2">
          {existingLogoUrl ? (
            <CurrentLogoPreview src={existingLogoUrl} />
          ) : null}
          <DialogInput name="logo" type="file" accept="image/*" />
          {existingLogoUrl ? (
            <p className="text-[12px] text-faint">
              Leave empty to keep the current logo.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start gap-2.5">
          <span className="relative mt-0.5 inline-grid size-[42px] shrink-0 place-items-center overflow-hidden rounded-[10px] border border-border bg-paper">
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
            />
            <p className="mt-1.5 text-[12px] leading-snug text-faint">
              {previewFailed
                ? "Couldn’t load that image. Check the URL."
                : showLivePreview
                  ? "Loaded live from this URL — not uploaded."
                  : "Paste an image URL. It stays remote and updates live."}
            </p>
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

function CurrentLogoPreview({ src }: { src: string }) {
  const [failed, setFailed] = React.useState(false);

  if (failed) return null;

  return (
    <span className="inline-grid size-8 overflow-hidden rounded-md border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
