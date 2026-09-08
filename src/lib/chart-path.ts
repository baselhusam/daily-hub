export type ChartPoint = { x: number; y: number };

/**
 * `tension` shortens the control arms. At 1 a lone spike in otherwise-empty
 * data inflates into a wide bell, which reads as four days of work that never
 * happened; sparse count series want something tighter. Defaults to 1 so
 * existing callers are unaffected.
 */
export function smoothPath(points: ChartPoint[], tension = 1) {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const slopes = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    return (next.y - point.y) / (next.x - point.x);
  });
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes.at(-1) ?? 0;
    return (slopes[index - 1] + slopes[index]) / 2;
  });

  // Limit tangent lengths so a high or low day never creates a visual overshoot.
  for (let index = 0; index < slopes.length; index += 1) {
    if (slopes[index] === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    const left = tangents[index] / slopes[index];
    const right = tangents[index + 1] / slopes[index];
    const length = Math.hypot(left, right);
    if (length > 3) {
      const scale = 3 / length;
      tangents[index] = scale * left * slopes[index];
      tangents[index + 1] = scale * right * slopes[index];
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const arm = ((next.x - current.x) * tension) / 3;
    const controlOne = {
      x: current.x + arm,
      y: current.y + tangents[index] * arm,
    };
    const controlTwo = {
      x: next.x - arm,
      y: next.y - tangents[index + 1] * arm,
    };
    path += ` C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function labelIndexesFor(length: number, targetCount: number) {
  if (length <= targetCount) return Array.from({ length }, (_, index) => index);
  return Array.from({ length: targetCount }, (_, index) =>
    Math.round((index / (targetCount - 1)) * (length - 1))
  );
}
