import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { Road } from "../../types/map-data";
import { bufferPolyline, triangulatePolygon } from "./buffer-utils";

/**
 * Generate a 3D mesh geometry for a road.
 * Roads sit at the base level (lowest feature).
 */
export const generateRoadGeometry = (
  road: Road,
): THREE.BufferGeometry | null => {
  if (road.points.length < 2) return null;

  const polygon = bufferPolyline(road.points, road.widthMm);
  if (polygon.length < 3) return null;

  return extrudePolygon(polygon, HEIGHTS.BASE_PLATE);
};

/**
 * Extrude a 2D polygon to a given height, creating a solid 3D shape.
 * Bottom face at Z=0, top face at Z=height.
 */
export const extrudePolygon = (
  polygon: { x: number; y: number }[],
  height: number,
): THREE.BufferGeometry => {
  const n = polygon.length;
  const indices = triangulatePolygon(polygon);

  const vertices: number[] = [];
  const normals: number[] = [];
  const triIndices: number[] = [];

  // bottom face vertices (z=0)
  for (const p of polygon) {
    vertices.push(p.x, p.y, 0);
    normals.push(0, 0, -1);
  }
  // top face vertices (z=height)
  for (const p of polygon) {
    vertices.push(p.x, p.y, height);
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
    vertices.push(p0.x, p0.y, 0);
    normals.push(nx, ny, 0);
    vertices.push(p1.x, p1.y, 0);
    normals.push(nx, ny, 0);
    vertices.push(p1.x, p1.y, height);
    normals.push(nx, ny, 0);
    vertices.push(p0.x, p0.y, height);
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
