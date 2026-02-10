import type { LocalPoint } from "../../types/map-data";

/**
 * Compute the signed area of a polygon. Positive = CCW, negative = CW.
 */
export const signedArea = (polygon: LocalPoint[]): number => {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return area / 2;
};

/**
 * Ensure a polygon has counter-clockwise winding order.
 * Reverse the vertex array if it's clockwise.
 */
export const ensureCCW = (polygon: LocalPoint[]): LocalPoint[] => {
  if (signedArea(polygon) < 0) {
    return [...polygon].reverse();
  }
  return polygon;
};

/**
 * Check if a point is inside a rectangle.
 */
export const isInRect = (
  p: LocalPoint,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
): boolean => p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax;

// --- Cohen-Sutherland line clipping ---

const INSIDE = 0;
const LEFT = 1;
const RIGHT = 2;
const BOTTOM = 4;
const TOP = 8;

const outcode = (
  x: number,
  y: number,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
): number => {
  let code = INSIDE;
  if (x < xMin) code |= LEFT;
  else if (x > xMax) code |= RIGHT;
  if (y < yMin) code |= BOTTOM;
  else if (y > yMax) code |= TOP;
  return code;
};

/**
 * Clip a line segment to a rectangle using Cohen-Sutherland.
 * Returns the clipped segment [x0, y0, x1, y1] or null if fully outside.
 */
const clipSegmentToRect = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
): [number, number, number, number] | null => {
  let code0 = outcode(x0, y0, xMin, yMin, xMax, yMax);
  let code1 = outcode(x1, y1, xMin, yMin, xMax, yMax);

  let iterations = 0;
  while (iterations++ < 20) {
    if ((code0 | code1) === 0) {
      return [x0, y0, x1, y1];
    }
    if ((code0 & code1) !== 0) {
      return null;
    }

    const codeOut = code0 !== 0 ? code0 : code1;
    let x = 0;
    let y = 0;

    if (codeOut & TOP) {
      x = x0 + ((x1 - x0) * (yMax - y0)) / (y1 - y0);
      y = yMax;
    } else if (codeOut & BOTTOM) {
      x = x0 + ((x1 - x0) * (yMin - y0)) / (y1 - y0);
      y = yMin;
    } else if (codeOut & RIGHT) {
      y = y0 + ((y1 - y0) * (xMax - x0)) / (x1 - x0);
      x = xMax;
    } else if (codeOut & LEFT) {
      y = y0 + ((y1 - y0) * (xMin - x0)) / (x1 - x0);
      x = xMin;
    }

    if (codeOut === code0) {
      x0 = x;
      y0 = y;
      code0 = outcode(x0, y0, xMin, yMin, xMax, yMax);
    } else {
      x1 = x;
      y1 = y;
      code1 = outcode(x1, y1, xMin, yMin, xMax, yMax);
    }
  }

  return null;
};

/**
 * Clip a polyline to a rectangle. Returns an array of sub-polylines,
 * each fully within the rectangle. A single input polyline may produce
 * multiple output sub-polylines if it exits and re-enters the rect.
 */
export const clipPolylineToRect = (
  points: LocalPoint[],
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
): LocalPoint[][] => {
  if (points.length < 2) return [];

  const result: LocalPoint[][] = [];
  let current: LocalPoint[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const clipped = clipSegmentToRect(
      points[i].x,
      points[i].y,
      points[i + 1].x,
      points[i + 1].y,
      xMin,
      yMin,
      xMax,
      yMax,
    );

    if (clipped) {
      const [cx0, cy0, cx1, cy1] = clipped;

      if (current.length === 0) {
        current.push({ x: cx0, y: cy0 });
      } else {
        const last = current[current.length - 1];
        if (Math.abs(last.x - cx0) > 1e-6 || Math.abs(last.y - cy0) > 1e-6) {
          if (current.length >= 2) result.push(current);
          current = [{ x: cx0, y: cy0 }];
        }
      }
      current.push({ x: cx1, y: cy1 });
    } else {
      if (current.length >= 2) result.push(current);
      current = [];
    }
  }

  if (current.length >= 2) result.push(current);
  return result;
};

// --- Sutherland-Hodgman polygon clipping ---

type Edge = {
  inside: (p: LocalPoint) => boolean;
  intersect: (a: LocalPoint, b: LocalPoint) => LocalPoint;
};

/**
 * Clip a polygon to a rectangle using Sutherland-Hodgman algorithm.
 * Returns the clipped polygon (may be empty if fully outside).
 */
export const clipPolygonToRect = (
  polygon: LocalPoint[],
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
): LocalPoint[] => {
  if (polygon.length < 3) return [];

  const edges: Edge[] = [
    {
      inside: (p) => p.x >= xMin,
      intersect: (a, b) => {
        const t = (xMin - a.x) / (b.x - a.x);
        return { x: xMin, y: a.y + t * (b.y - a.y) };
      },
    },
    {
      inside: (p) => p.x <= xMax,
      intersect: (a, b) => {
        const t = (xMax - a.x) / (b.x - a.x);
        return { x: xMax, y: a.y + t * (b.y - a.y) };
      },
    },
    {
      inside: (p) => p.y >= yMin,
      intersect: (a, b) => {
        const t = (yMin - a.y) / (b.y - a.y);
        return { x: a.x + t * (b.x - a.x), y: yMin };
      },
    },
    {
      inside: (p) => p.y <= yMax,
      intersect: (a, b) => {
        const t = (yMax - a.y) / (b.y - a.y);
        return { x: a.x + t * (b.x - a.x), y: yMax };
      },
    },
  ];

  let output = [...polygon];

  for (const edge of edges) {
    if (output.length === 0) break;
    const input = output;
    output = [];

    for (let i = 0; i < input.length; i++) {
      const curr = input[i];
      const next = input[(i + 1) % input.length];
      const currInside = edge.inside(curr);
      const nextInside = edge.inside(next);

      if (currInside && nextInside) {
        output.push(next);
      } else if (currInside && !nextInside) {
        output.push(edge.intersect(curr, next));
      } else if (!currInside && nextInside) {
        output.push(edge.intersect(curr, next));
        output.push(next);
      }
    }
  }

  return output;
};
