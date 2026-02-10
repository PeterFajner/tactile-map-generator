import type { LocalPoint } from "../../types/map-data";

/**
 * Compute the unit normal at a vertex along a polyline,
 * averaged between the normals of the two adjacent segments.
 */
const computeVertexNormal = (
  points: LocalPoint[],
  index: number,
): LocalPoint => {
  const prev = index > 0 ? points[index - 1] : null;
  const curr = points[index];
  const next = index < points.length - 1 ? points[index + 1] : null;

  let nx = 0;
  let ny = 0;
  let count = 0;

  if (prev) {
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      nx += -dy / len;
      ny += dx / len;
      count++;
    }
  }

  if (next) {
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      nx += -dy / len;
      ny += dx / len;
      count++;
    }
  }

  if (count === 0) return { x: 0, y: 1 };

  nx /= count;
  ny /= count;

  const len = Math.sqrt(nx * nx + ny * ny);
  if (len < 1e-10) return { x: 0, y: 1 };

  return { x: nx / len, y: ny / len };
};

/**
 * Convert a polyline (array of LocalPoint) into a closed polygon
 * by offsetting perpendicular to each segment.
 *
 * @param points - centerline points (at least 2)
 * @param width - total width (offset = width/2 each side)
 * @returns Array of LocalPoint forming a closed polygon (CCW winding)
 */
export const bufferPolyline = (
  points: LocalPoint[],
  width: number,
): LocalPoint[] => {
  if (points.length < 2) return [];

  const halfWidth = width / 2;
  const leftEdge: LocalPoint[] = [];
  const rightEdge: LocalPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const normal = computeVertexNormal(points, i);

    // clamp miter to avoid spikes at sharp angles (max 2x halfWidth)
    const miterScale = Math.min(halfWidth * 2, halfWidth);

    leftEdge.push({
      x: points[i].x + normal.x * miterScale,
      y: points[i].y + normal.y * miterScale,
    });
    rightEdge.push({
      x: points[i].x - normal.x * miterScale,
      y: points[i].y - normal.y * miterScale,
    });
  }

  // close: left edge forward, right edge backward
  return [...leftEdge, ...rightEdge.reverse()];
};

/**
 * Triangulate a simple polygon using the ear-clipping algorithm.
 * Returns an array of triangle index triples.
 */
export const triangulatePolygon = (vertices: LocalPoint[]): number[] => {
  // Use a simple earcut approach
  const n = vertices.length;
  if (n < 3) return [];

  const indices: number[] = [];
  const remaining = Array.from({ length: n }, (_, i) => i);

  let safety = n * n;
  while (remaining.length > 2 && safety-- > 0) {
    let earFound = false;
    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i - 1 + remaining.length) % remaining.length];
      const curr = remaining[i];
      const next = remaining[(i + 1) % remaining.length];

      const a = vertices[prev];
      const b = vertices[curr];
      const c = vertices[next];

      // check if this is a convex vertex (CCW winding)
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      if (cross <= 0) continue;

      // check no other vertex is inside this triangle
      let isEar = true;
      for (const idx of remaining) {
        if (idx === prev || idx === curr || idx === next) continue;
        if (pointInTriangle(vertices[idx], a, b, c)) {
          isEar = false;
          break;
        }
      }

      if (isEar) {
        indices.push(prev, curr, next);
        remaining.splice(i, 1);
        earFound = true;
        break;
      }
    }
    if (!earFound) break;
  }

  return indices;
};

const pointInTriangle = (
  p: LocalPoint,
  a: LocalPoint,
  b: LocalPoint,
  c: LocalPoint,
): boolean => {
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
};

const sign = (p1: LocalPoint, p2: LocalPoint, p3: LocalPoint): number => {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
};
