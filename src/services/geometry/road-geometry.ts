import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { LocalPoint, Road } from "../../types/map-data";
import { bufferPolyline, triangulatePolygon } from "./buffer-utils";
import { clipPolygonToRect, ensureCCW } from "./clip-utils";

export type ClipBounds = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
};

/**
 * Generate a 3D mesh geometry for a road.
 * If clipBounds is provided, the buffered polygon is clipped to plate bounds.
 */
export const generateRoadGeometry = (
  road: Road,
  clipBounds?: ClipBounds,
): THREE.BufferGeometry | null => {
  if (road.points.length < 2) return null;

  let polygon: LocalPoint[] = bufferPolyline(road.points, road.widthMm);
  if (polygon.length < 3) return null;

  if (clipBounds) {
    polygon = clipPolygonToRect(
      polygon,
      clipBounds.xMin,
      clipBounds.yMin,
      clipBounds.xMax,
      clipBounds.yMax,
    );
    if (polygon.length < 3) return null;
  }

  return extrudePolygon(polygon, HEIGHTS.ROAD_SURFACE, HEIGHTS.BASE_PLATE);
};

/**
 * Extrude a 2D polygon to a given height, creating a solid 3D shape.
 * Bottom face at Z=zBase, top face at Z=zBase+height.
 */
export const extrudePolygon = (
  inputPolygon: { x: number; y: number }[],
  height: number,
  zBase: number = 0,
): THREE.BufferGeometry => {
  // remove consecutive duplicate vertices (OSM closed ways repeat first/last)
  const deduped = ensureCCW(inputPolygon).filter(
    (p, i, arr) =>
      i === 0 ||
      Math.abs(p.x - arr[i - 1].x) > 1e-6 ||
      Math.abs(p.y - arr[i - 1].y) > 1e-6,
  );
  // also check if last point duplicates first
  const polygon =
    deduped.length > 1 &&
    Math.abs(deduped[0].x - deduped[deduped.length - 1].x) < 1e-6 &&
    Math.abs(deduped[0].y - deduped[deduped.length - 1].y) < 1e-6
      ? deduped.slice(0, -1)
      : deduped;

  const n = polygon.length;
  if (n < 3) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
    return geometry;
  }
  const indices = triangulatePolygon(polygon);

  const vertices: number[] = [];
  const normals: number[] = [];
  const triIndices: number[] = [];

  const zBottom = zBase;
  const zTop = zBase + height;

  // bottom face vertices
  for (const p of polygon) {
    vertices.push(p.x, p.y, zBottom);
    normals.push(0, 0, -1);
  }
  // top face vertices
  for (const p of polygon) {
    vertices.push(p.x, p.y, zTop);
    normals.push(0, 0, 1);
  }

  // bottom face triangles (reverse winding for downward normal)
  for (let i = 0; i < indices.length; i += 3) {
    triIndices.push(indices[i + 2], indices[i + 1], indices[i]);
  }

  // top face triangles
  for (let i = 0; i < indices.length; i += 3) {
    triIndices.push(indices[i] + n, indices[i + 1] + n, indices[i + 2] + n);
  }

  // side faces
  const baseIdx = vertices.length / 3;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p0 = polygon[i];
    const p1 = polygon[j];

    // side normal
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len > 0 ? -dy / len : 0;
    const ny = len > 0 ? dx / len : 0;

    const vi = baseIdx + i * 4;

    // 4 vertices for this side quad
    vertices.push(p0.x, p0.y, zBottom);
    normals.push(nx, ny, 0);
    vertices.push(p1.x, p1.y, zBottom);
    normals.push(nx, ny, 0);
    vertices.push(p1.x, p1.y, zTop);
    normals.push(nx, ny, 0);
    vertices.push(p0.x, p0.y, zTop);
    normals.push(nx, ny, 0);

    triIndices.push(vi, vi + 1, vi + 2);
    triIndices.push(vi, vi + 2, vi + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(triIndices);

  return geometry;
};
