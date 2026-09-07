import { describe, expect, it } from "vitest";
import { labelIndexesFor, smoothPath, type ChartPoint } from "@/lib/chart-path";

function parseCubicSegments(d: string) {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const start: ChartPoint = { x: numbers[0], y: numbers[1] };
  const segments: Array<{ p0: ChartPoint; p1: ChartPoint; p2: ChartPoint; p3: ChartPoint }> = [];

  let previous = start;
  for (let index = 2; index < numbers.length; index += 6) {
    const p1 = { x: numbers[index], y: numbers[index + 1] };
    const p2 = { x: numbers[index + 2], y: numbers[index + 3] };
    const p3 = { x: numbers[index + 4], y: numbers[index + 5] };
    segments.push({ p0: previous, p1, p2, p3 });
    previous = p3;
  }

  return segments;
}

function bezierY(segment: { p0: ChartPoint; p1: ChartPoint; p2: ChartPoint; p3: ChartPoint }, t: number) {
  const mt = 1 - t;
  return (
    mt ** 3 * segment.p0.y +
    3 * mt ** 2 * t * segment.p1.y +
    3 * mt * t ** 2 * segment.p2.y +
    t ** 3 * segment.p3.y
  );
}

describe("smoothPath", () => {
  it("returns an empty string for fewer than two points", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 0, y: 0 }])).toBe("");
  });

  it("draws a straight line for exactly two points", () => {
    const path = smoothPath([{ x: 0, y: 0 }, { x: 100, y: 40 }]);
    expect(path).toBe("M 0 0 L 100 40");
  });

  it("never overshoots the input range for a spike series", () => {
    const values = [0, 0, 9, 0, 0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const points: ChartPoint[] = values.map((value, index) => ({ x: index * 100, y: value }));

    const path = smoothPath(points);
    const segments = parseCubicSegments(path);

    expect(segments.length).toBe(points.length - 1);

    const epsilon = 1e-6;
    for (const segment of segments) {
      for (let step = 0; step <= 100; step += 1) {
        const t = step / 100;
        const y = bezierY(segment, t);
        expect(y).toBeGreaterThanOrEqual(min - epsilon);
        expect(y).toBeLessThanOrEqual(max + epsilon);
      }
    }
  });
});

describe("labelIndexesFor", () => {
  it("returns every index when length is at or under the target count", () => {
    expect(labelIndexesFor(3, 5)).toEqual([0, 1, 2]);
    expect(labelIndexesFor(5, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("spreads indexes evenly, always including the first and last", () => {
    const indexes = labelIndexesFor(30, 5);
    expect(indexes[0]).toBe(0);
    expect(indexes.at(-1)).toBe(29);
    expect(indexes).toHaveLength(5);
  });
});
