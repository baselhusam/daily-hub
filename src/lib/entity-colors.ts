const DEFAULT_COLOR = "#37352F";

export function getEntityInitials(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function resolveEntityColor(color?: string | null): string {
  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) return DEFAULT_COLOR;
  return color;
}

export function entityTintStyles(color?: string | null): {
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  const resolved = resolveEntityColor(color);
  return {
    backgroundColor: `${resolved}18`,
    borderColor: `${resolved}33`,
    color: resolved,
  };
}
