import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { BikeLane, LocalPoint } from "../../types/map-data";
import { bufferPolyline } from "./buffer-utils";
import { clipPolygonToRect } from "./clip-utils";
import type { ClipBounds } from "./road-geometry";
import { extrudePolygon } from "./road-geometry";

/**
 * Generate 3D geometry for a bike lane.
 * If clipBounds is provided, the buffered polygon is clipped to plate bounds.
 */
export const generateBikeLaneGeometry = (
  bikeLane: BikeLane,
  clipBounds?: ClipBounds,
): THREE.BufferGeometry | null => {
  if (bikeLane.points.length < 2) return null;

  let polygon: LocalPoint[] = bufferPolyline(bikeLane.points, bikeLane.widthMm);
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

  // Bike lanes sit on the road floor (inset channel).
  // Road floor top is at BASE_PLATE + ROAD_SURFACE.
  // Give them a thin raised profile like crossing lines.
  const roadFloorTop = HEIGHTS.BASE_PLATE + HEIGHTS.ROAD_SURFACE;
  return extrudePolygon(polygon, HEIGHTS.CROSSING, roadFloorTop);
};
