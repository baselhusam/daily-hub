import { fallbackColorFor } from "@/lib/logo-color";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function getEntityInitials(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function resolveEntityColor(color?: string | null): string {
  if (!color || !HEX_COLOR.test(color)) return "var(--foreground)";
  return color;
}

/**
 * The color to actually render for a project: its own hex if set, otherwise
 * a stable palette color derived from its id. Never null — every project
 * ends up distinguishable, whether or not it has a logo or a manual pick.
 *
 * `color` is only ever null in the DB when auto-derivation found nothing to
 * extract; resolving the palette fallback here (rather than storing it)
 * keeps "reset to default" meaningful if a logo is added later.
 */
export function projectAccent(project: { id: string; color: string | null }): string {
  if (project.color && HEX_COLOR.test(project.color)) return project.color;
  return fallbackColorFor(project.id);
}

export function entityTintStyles(color?: string | null): {
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  if (!color || !HEX_COLOR.test(color)) {
    return {
      backgroundColor: "var(--accent)",
      borderColor: "var(--border)",
      color: "var(--foreground)",
    };
  }
  return {
    backgroundColor: `${color}18`,
    borderColor: `${color}33`,
    color,
  };
}
