import type { LucideIcon } from "lucide-react";
import * as icons from "lucide-react";

export function getIcon(iconKey: string): LucideIcon {
  const icon = (icons as unknown as Record<string, LucideIcon | undefined>)[
    iconKey
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
