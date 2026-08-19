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
