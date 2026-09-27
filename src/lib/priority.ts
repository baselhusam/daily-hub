/**
 * Task priority as stored in `Task.priority`: 0 is "none", then 1–3 climb
 * from low to high. Sorting by the raw number descending therefore puts high
 * first and unprioritised work last, below low.
 */
export const PRIORITY_NONE = 0;
export const PRIORITY_LOW = 1;
export const PRIORITY_MEDIUM = 2;
export const PRIORITY_HIGH = 3;

export type Priority = 0 | 1 | 2 | 3;

/** Composer chips, most urgent first — the order you scan them in. */
export const PRIORITY_CHIPS: Array<{ value: Priority; label: string }> = [
  { value: PRIORITY_HIGH, label: "High" },
  { value: PRIORITY_MEDIUM, label: "Medium" },
  { value: PRIORITY_LOW, label: "Low" },
];

export function priorityLabel(priority: number): string | null {
  switch (priority) {
    case PRIORITY_HIGH:
      return "High priority";
    case PRIORITY_MEDIUM:
      return "Medium priority";
    case PRIORITY_LOW:
      return "Low priority";
    default:
      return null;
  }
}
