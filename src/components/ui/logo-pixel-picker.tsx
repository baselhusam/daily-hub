"use client";

import * as React from "react";
import { pixelAt, readableInkOn } from "@/lib/logo-color";
import { cn } from "@/lib/utils";

/** CSS size of the picking board. The logo is contained inside it, centred. */
const BOARD_WIDTH = 244;
const BOARD_HEIGHT = 168;
/** Cap the sampled bitmap so a huge logo doesn't sit in memory at full size. */
const MAX_SAMPLE_EDGE = 512;
/** Small logos are blown up so single pixels stay clickable, but not endlessly. */
const MAX_UPSCALE = 8;
const CHECKER_CELL = 8;
/** Source pixels across the loupe, and how big each of them is drawn. */
const LOUPE_PIXELS = 9;
const LOUPE_ZOOM = 11;
/** Below this alpha a pixel is see-through, so there is no colour to take. */
const MIN_PICKABLE_ALPHA = 16;

type Sample = {
  /** The logo drawn at sampling resolution — the loupe magnifies from here. */
  canvas: HTMLCanvasElement;
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
};

type Cursor = { x: number; y: number };

type LogoPixelPickerProps = {
  /** Same-origin data URL of the logo, so the canvas stays readable. */
  dataUrl: string;
  onPick: (hex: string) => void;
};

/**
 * Lets the user take the project accent straight off the logo by clicking the
 * pixel they want. The board samples at the image's own resolution (not the
 * displayed size) so what the loupe shows is exactly what gets picked.
 */
export function LogoPixelPicker({ dataUrl, onPick }: LogoPixelPickerProps) {
  const boardRef = React.useRef<HTMLCanvasElement>(null);
  const loupeRef = React.useRef<HTMLCanvasElement>(null);
  const [sample, setSample] = React.useState<Sample | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [cursor, setCursor] = React.useState<Cursor | null>(null);

  // Where the logo actually sits inside the board, in CSS pixels.
  const fit = React.useMemo(() => {
    if (!sample) return null;
    const scale = Math.min(
      BOARD_WIDTH / sample.width,
      BOARD_HEIGHT / sample.height,
      MAX_UPSCALE
    );
    const width = sample.width * scale;
    const height = sample.height * scale;
    return {
      x: (BOARD_WIDTH - width) / 2,
      y: (BOARD_HEIGHT - height) / 2,
      width,
      height,
      scale,
    };
  }, [sample]);

  React.useEffect(() => {
    let cancelled = false;
    setSample(null);
    setCursor(null);
    setFailed(false);

    (async () => {
      try {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        if (cancelled) return;
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          setFailed(true);
          return;
        }

        const scale = Math.min(
          1,
          MAX_SAMPLE_EDGE / Math.max(img.naturalWidth, img.naturalHeight)
        );
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setFailed(true);
          return;
        }
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        setSample({
          canvas,
          pixels: ctx.getImageData(0, 0, width, height).data,
          width,
          height,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  // A pixel you can see through has no colour worth taking.
  const pickable = React.useMemo(() => {
    if (!sample || !cursor) return null;
    const found = pixelAt(sample.pixels, sample.width, cursor.x, cursor.y);
    return found && found.alpha >= MIN_PICKABLE_ALPHA ? found.hex : null;
  }, [sample, cursor]);

  // Board: checkerboard, logo, then the cursor ring on top.
  React.useEffect(() => {
    const canvas = boardRef.current;
    if (!canvas || !sample || !fit) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(BOARD_WIDTH * dpr);
    canvas.height = Math.round(BOARD_HEIGHT * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    for (let y = 0; y < BOARD_HEIGHT; y += CHECKER_CELL) {
      for (let x = 0; x < BOARD_WIDTH; x += CHECKER_CELL) {
        const odd = ((x / CHECKER_CELL) + (y / CHECKER_CELL)) % 2 === 1;
        ctx.fillStyle = odd ? "#E8E8E8" : "#FAFAFA";
        ctx.fillRect(x, y, CHECKER_CELL, CHECKER_CELL);
      }
    }

    // Upscaled logos keep hard pixel edges, so the pixel under the cursor is
    // the one the user is actually aiming at.
    ctx.imageSmoothingEnabled = fit.scale < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sample.canvas, fit.x, fit.y, fit.width, fit.height);

    if (!cursor) return;
    const cx = fit.x + (cursor.x + 0.5) * fit.scale;
    const cy = fit.y + (cursor.y + 0.5) * fit.scale;

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();
  }, [sample, fit, cursor]);

  // Loupe: nearest-neighbour magnification around the cursor.
  React.useEffect(() => {
    const canvas = loupeRef.current;
    if (!canvas) return;

    const size = LOUPE_PIXELS * LOUPE_ZOOM;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (!sample || !cursor) {
      ctx.fillStyle = "#F2F2F2";
      ctx.fillRect(0, 0, size, size);
      return;
    }

    const half = Math.floor(LOUPE_PIXELS / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#F2F2F2";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(
      sample.canvas,
      cursor.x - half,
      cursor.y - half,
      LOUPE_PIXELS,
      LOUPE_PIXELS,
      0,
      0,
      size,
      size
    );

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.strokeRect(half * LOUPE_ZOOM + 0.5, half * LOUPE_ZOOM + 0.5, LOUPE_ZOOM - 1, LOUPE_ZOOM - 1);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeRect(half * LOUPE_ZOOM - 0.5, half * LOUPE_ZOOM - 0.5, LOUPE_ZOOM + 1, LOUPE_ZOOM + 1);
  }, [sample, cursor]);

  function cursorFromEvent(
    event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ): Cursor | null {
    if (!sample || !fit) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) * (BOARD_WIDTH / rect.width) - fit.x) / fit.scale;
    const y = ((event.clientY - rect.top) * (BOARD_HEIGHT / rect.height) - fit.y) / fit.scale;
    if (x < 0 || y < 0 || x >= sample.width || y >= sample.height) return null;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  /** The colour under a cursor, or null where the logo is see-through. */
  function opaqueHexAt(at: Cursor | null): string | null {
    if (!sample || !at) return null;
    const found = pixelAt(sample.pixels, sample.width, at.x, at.y);
    return found && found.alpha >= MIN_PICKABLE_ALPHA ? found.hex : null;
  }

  function moveCursor(dx: number, dy: number) {
    if (!sample) return;
    setCursor((current) => {
      const base = current ?? {
        x: Math.floor(sample.width / 2),
        y: Math.floor(sample.height / 2),
      };
      return {
        x: Math.min(sample.width - 1, Math.max(0, base.x + dx)),
        y: Math.min(sample.height - 1, Math.max(0, base.y + dy)),
      };
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const step = event.shiftKey ? 10 : 1;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        moveCursor(-step, 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveCursor(step, 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveCursor(0, -step);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveCursor(0, step);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (pickable) onPick(pickable);
        break;
      default:
        break;
    }
  }

  if (failed) {
    return (
      <p className="px-1 py-2 text-[12px] text-faint">
        Couldn’t read that logo. Try another image.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={boardRef}
        role="application"
        tabIndex={0}
        aria-label="Pick a colour from the logo. Arrow keys move the sampler, Enter selects."
        style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
        className="cursor-crosshair rounded-[8px] border border-border outline-none focus-visible:ring-[3px] focus-visible:ring-signal/16 touch-none"
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => setCursor(cursorFromEvent(event))}
        onPointerMove={(event) => {
          if (event.pointerType === "touch" && event.buttons === 0) return;
          const next = cursorFromEvent(event);
          if (next) setCursor(next);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "touch") return;
          setCursor(null);
        }}
        onClick={(event) => {
          const hex = opaqueHexAt(cursorFromEvent(event));
          if (hex) onPick(hex);
        }}
      />

      <div className="flex items-center gap-2">
        <canvas
          ref={loupeRef}
          aria-hidden="true"
          style={{ width: LOUPE_PIXELS * LOUPE_ZOOM, height: LOUPE_PIXELS * LOUPE_ZOOM }}
          className="shrink-0 rounded-[6px] border border-border"
        />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex h-8 items-center justify-center rounded-[6px] border text-[12px] font-semibold tabular-nums",
              pickable ? "border-black/10" : "border-border bg-paper text-faint"
            )}
            style={
              pickable
                ? { backgroundColor: pickable, color: readableInkOn(pickable) }
                : undefined
            }
          >
            {pickable ?? (sample ? "—" : "Loading…")}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-faint">
            {pickable ? "Click to use this colour" : "Hover the logo to sample a pixel"}
          </p>
        </div>
      </div>
    </div>
  );
}
