import type { LucideIcon } from "lucide-react";
import * as icons from "lucide-react";

function toPascalCase(iconKey: string): string {
  return iconKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function getIcon(iconKey: string): LucideIcon {
  const pascalKey = toPascalCase(iconKey);
  const icon = (icons as unknown as Record<string, LucideIcon | undefined>)[
    pascalKey
  ];
  return icon ?? icons.Circle;
}

export const ICON_OPTIONS = [
  "briefcase",
  "building2",
  "folder",
  "folder-open",
  "check",
  "check-circle",
  "circle",
  "pen-line",
  "mail",
  "message-square",
  "calendar",
  "clock",
  "star",
  "rocket",
  "code",
  "globe",
  "book-open",
  "newspaper",
  "file-text",
  "target",
] as const;
