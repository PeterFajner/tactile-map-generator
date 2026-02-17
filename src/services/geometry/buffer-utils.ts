import earcut from "earcut";
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
 * Triangulate a simple polygon using the earcut library.
 * Handles concave polygons robustly (unlike a naive ear-clipping loop).
 * Returns an array of triangle index triples.
 */
export const triangulatePolygon = (vertices: LocalPoint[]): number[] => {
  if (vertices.length < 3) return [];

  const coords: number[] = [];
  for (const v of vertices) {
    coords.push(v.x, v.y);
  }

  return earcut(coords) as number[];
};
