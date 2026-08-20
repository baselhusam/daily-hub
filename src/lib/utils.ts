import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCount(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** Keep open items first; completed items sink below, preserving relative order. */
export function sortCompletedLast<T>(
  items: readonly T[],
  isCompleted: (item: T) => boolean
): T[] {
  return [...items].sort(
    (a, b) => Number(isCompleted(a)) - Number(isCompleted(b))
  );
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;

  const type = (target as HTMLInputElement).type;
  return ![
    "button",
    "checkbox",
    "radio",
    "file",
    "reset",
    "submit",
    "range",
    "color",
  ].includes(type);
}
