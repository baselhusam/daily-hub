export type ChartPoint = { x: number; y: number };

export function smoothPath(points: ChartPoint[]) {
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
    const width = next.x - current.x;
    const controlOne = {
      x: current.x + width / 3,
      y: current.y + (tangents[index] * width) / 3,
    };
    const controlTwo = {
      x: next.x - width / 3,
      y: next.y - (tangents[index + 1] * width) / 3,
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
