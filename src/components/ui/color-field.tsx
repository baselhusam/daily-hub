"use client";

import * as React from "react";
import { Check, Pipette, RotateCcw, Sparkles } from "lucide-react";
import { FieldLabel } from "@/components/ui/input";
import { FALLBACK_PALETTE } from "@/lib/logo-color";
import { cn } from "@/lib/utils";

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

type ColorFieldValue = {
  color: string | null;
  source: "auto" | "manual";
};

type ColorFieldProps = {
  /** Current hex color, or null (resolves to the palette fallback at read time). */
  value: string | null;
  /** Whether the current color was derived from the logo or picked by the user. */
  source: "auto" | "manual";
  /** Latest logo-derived color, kept even while `source === "manual"` so "Reset" can restore it. */
  autoColor: string | null;
  onChange: (next: ColorFieldValue) => void;
  /** Shows a subtle pulse while an extraction is in flight. */
  extracting?: boolean;
};

export function ColorField({
  value,
  source,
  autoColor,
  onChange,
  extracting,
}: ColorFieldProps) {
  const [hexDraft, setHexDraft] = React.useState(value ?? "");

  React.useEffect(() => {
    setHexDraft(value ?? "");
  }, [value]);

  const selected = value && HEX_PATTERN.test(value) ? value.toUpperCase() : null;
  const isPreset = selected !== null && (FALLBACK_PALETTE as readonly string[]).includes(selected);

  function pick(color: string) {
    onChange({ color: color.toUpperCase(), source: "manual" });
  }

  function handleHexInput(next: string) {
    setHexDraft(next);
    if (HEX_PATTERN.test(next)) {
      onChange({ color: next.toUpperCase(), source: "manual" });
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FieldLabel>Color</FieldLabel>
          {source === "auto" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded border border-border bg-paper px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[0.02em] text-faint transition-opacity duration-[120ms]",
                extracting && "animate-pulse"
              )}
            >
              <Sparkles className="size-2.5" />
              {autoColor ? "From logo" : "Default"}
            </span>
          )}
        </div>
        {source === "manual" && (
          <button
            type="button"
            className="inline-flex items-center gap-1 py-0.5 text-[11.5px] font-medium text-faint transition-colors duration-[120ms] hover:text-signal"
            onClick={() => onChange({ color: autoColor, source: "auto" })}
          >
            <RotateCcw className="size-2.5" />
            Reset to auto
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FALLBACK_PALETTE.map((swatch) => {
          const active = selected === swatch;
          return (
            <button
              key={swatch}
              type="button"
              aria-pressed={active}
              aria-label={`Use ${swatch}`}
              title={swatch}
              onClick={() => pick(swatch)}
              className="grid size-[22px] shrink-0 place-items-center rounded-full border border-black/10 outline-none transition-transform duration-[120ms] focus-visible:ring-[3px] focus-visible:ring-signal/14 hover:scale-[1.08]"
              style={{ backgroundColor: swatch }}
            >
              {active && <Check className="size-3 stroke-[3.2] text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.45)]" />}
            </button>
          );
        })}

        <label
          className={cn(
            "relative grid size-[22px] shrink-0 cursor-pointer place-items-center rounded-full border outline-none transition-transform duration-[120ms] focus-within:ring-[3px] focus-within:ring-signal/14 hover:scale-[1.08]",
            selected && !isPreset
              ? "border-black/10"
              : "border-dashed border-border-strong bg-paper text-faint"
          )}
          style={selected && !isPreset ? { backgroundColor: selected } : undefined}
          title="Custom color"
        >
          {selected && !isPreset ? (
            <Check className="size-3 stroke-[3.2] text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.45)]" />
          ) : (
            <Pipette className="size-3" />
          )}
          <input
            type="color"
            aria-label="Pick a custom color"
            className="sr-only"
            value={selected ?? "#8a8a8a"}
            onChange={(event) => pick(event.target.value)}
          />
        </label>

        <input
          type="text"
          inputMode="text"
          value={hexDraft}
          onChange={(event) => handleHexInput(event.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-label="Hex color"
          className="h-[26px] w-[86px] rounded-[7px] border border-input bg-background px-2 text-[12px] font-medium tabular-nums text-foreground placeholder:text-faint transition-colors duration-[120ms] focus-visible:border-signal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/16"
        />
      </div>

      <input type="hidden" name="color" value={value ?? ""} />
      <input type="hidden" name="colorSource" value={source} />
    </div>
  );
}
