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

/** Open inbox items stay in incoming order; logged items follow by most recently done. */
export function sortInboxLog<T extends {
  done: boolean;
  completedAt: Date | null;
  createdAt: Date;
}>(tasks: readonly T[]): T[] {
  const open: T[] = [];
  const logged: T[] = [];
  for (const task of tasks) {
    if (task.done) logged.push(task);
    else open.push(task);
  }
  logged.sort((a, b) => {
    const aTime = (a.completedAt ?? a.createdAt).getTime();
    const bTime = (b.completedAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });
  return [...open, ...logged];
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
