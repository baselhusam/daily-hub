import { smoothPath, type ChartPoint } from "@/lib/chart-path";

export type ClosedPoint = {
  date: string;
  label: string;
  fullLabel: string;
  value: number;
  isToday: boolean;
};

export type ClosedWindow = {
  current: ClosedPoint[];
  previous: ClosedPoint[];
};

/** The trailing `days` points and the `days` before them, both oldest-first. */
export function closedWindow(points: ClosedPoint[], days: number): ClosedWindow {
  const current = points.slice(-days);
  const previous = points.slice(-days * 2, -days);
  return { current, previous };
}

export function isWeekend(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6;
}

export function weekdaysOnly(points: ClosedPoint[]): ClosedPoint[] {
  return points.filter((point) => !isWeekend(point.date));
}

export type ClosedStats = {
  total: number;
  average: number;
  best: ClosedPoint | null;
  previousTotal: number;
  /** Percent change against the previous window, null when it had nothing. */
  deltaPct: number | null;
  peak: number;
  quietDays: number;
};

export function closedStats(current: ClosedPoint[], previous: ClosedPoint[]): ClosedStats {
  const total = current.reduce((sum, point) => sum + point.value, 0);
  const previousTotal = previous.reduce((sum, point) => sum + point.value, 0);
  const best = current.reduce<ClosedPoint | null>(
    (top, point) => (top === null || point.value > top.value ? point : top),
    null
  );
  return {
    total,
    average: current.length === 0 ? 0 : total / current.length,
    best: best && best.value > 0 ? best : null,
    previousTotal,
    deltaPct:
      previousTotal === 0
        ? null
        : Math.round(((total - previousTotal) / previousTotal) * 100),
    peak: best?.value ?? 0,
    quietDays: current.filter((point) => point.value === 0).length,
  };
}

/** Average closed per weekday, Monday first. */
export function weekdayProfile(points: ClosedPoint[]): number[] {
  const sums = new Array(7).fill(0);
  const hits = new Array(7).fill(0);
  for (const point of points) {
    const [y, m, d] = point.date.split("-").map(Number);
    const index = (new Date(y, m - 1, d).getDay() + 6) % 7;
    sums[index] += point.value;
    hits[index] += 1;
  }
  return sums.map((sum, index) => (hits[index] ? sum / hits[index] : 0));
}

export type AreaGeometry = {
  points: ChartPoint[];
  linePath: string;
  areaPath: string;
};

/**
 * Lays a series out across a `width`×`height` box with `pad` of headroom so
 * the peak never kisses the top edge. `top` lets two series (this period and
 * the last) share one scale.
 */
export function areaGeometry(
  values: number[],
  width: number,
  height: number,
  pad: number,
  top = Math.max(1, ...values)
): AreaGeometry {
  if (values.length === 0) {
    return { points: [], linePath: "", areaPath: "" };
  }
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((value, index) => ({
    x: +(index * step).toFixed(2),
    y: +(height - pad - (value / top) * (height - pad * 2)).toFixed(2),
  }));
  const linePath =
    points.length === 1
      ? `M 0 ${points[0].y} L ${width} ${points[0].y}`
      : smoothPath(points, 0.9);
  const last = points[points.length - 1];
  const areaPath = linePath
    ? `${linePath} L ${points.length === 1 ? width : last.x} ${height} L 0 ${height} Z`
    : "";
  return { points, linePath, areaPath };
}

/** Horizontal guide values for a chart whose ceiling is `top`, at most five. */
export function gridValues(top: number): number[] {
  const stepsWanted = Math.min(4, Math.max(1, Math.round(top)));
  const raw = top / stepsWanted;
  const nice = raw <= 1 ? 1 : raw <= 2 ? 2 : raw <= 5 ? 5 : Math.ceil(raw / 5) * 5;
  const values: number[] = [];
  for (let value = 0; value <= top + 1e-9; value += nice) values.push(value);
  return values;
}
