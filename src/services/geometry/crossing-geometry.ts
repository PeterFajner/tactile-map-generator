import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { Crossing, LocalPoint } from "../../types/map-data";
import { bufferPolyline } from "./buffer-utils";
import { clipPolygonToRect } from "./clip-utils";
import type { ClipBounds } from "./road-geometry";
import { extrudePolygon } from "./road-geometry";

/**
 * Generate 3D geometry for a crossing.
 * Crossings sit on top of the base plate at CROSSING height.
 * If clipBounds is provided, the buffered polygon is clipped to plate bounds.
 */
export const generateCrossingGeometry = (
  crossing: Crossing,
  clipBounds?: ClipBounds,
): THREE.BufferGeometry | null => {
  if (crossing.points.length < 2) return null;

  let polygon: LocalPoint[] = bufferPolyline(crossing.points, crossing.widthMm);
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

  return extrudePolygon(polygon, HEIGHTS.CROSSING, HEIGHTS.BASE_PLATE);
};
