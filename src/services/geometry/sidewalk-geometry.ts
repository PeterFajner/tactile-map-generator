import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { LocalPoint, Sidewalk } from "../../types/map-data";
import { bufferPolyline } from "./buffer-utils";
import { clipPolygonToRect } from "./clip-utils";
import type { ClipBounds } from "./road-geometry";
import { extrudePolygon } from "./road-geometry";

/**
 * Generate 3D geometry for a sidewalk.
 * If clipBounds is provided, the buffered polygon is clipped to plate bounds.
 */
export const generateSidewalkGeometry = (
  sidewalk: Sidewalk,
  clipBounds?: ClipBounds,
): THREE.BufferGeometry | null => {
  if (sidewalk.points.length < 2) return null;

  let polygon: LocalPoint[] = bufferPolyline(sidewalk.points, sidewalk.widthMm);
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

  return extrudePolygon(polygon, HEIGHTS.SIDEWALK, HEIGHTS.BASE_PLATE);
};
