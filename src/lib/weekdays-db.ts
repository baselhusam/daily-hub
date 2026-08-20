const DEFAULT_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function parseWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_WEEKDAYS];
  }

  const parsed = value.filter(
    (item): item is number =>
      typeof item === "number" &&
      Number.isInteger(item) &&
      item >= 0 &&
      item <= 6
  );

  return parsed.length > 0 ? parsed : [...DEFAULT_WEEKDAYS];
}

export function toWeekdaysJson(days: number[]): number[] {
  return [...new Set(days)].sort((a, b) => a - b);
}

export function withParsedWeekdays<T extends { weekdays: unknown }>(
  row: T
): Omit<T, "weekdays"> & { weekdays: number[] } {
  return {
    ...row,
    weekdays: parseWeekdays(row.weekdays),
  };
}
