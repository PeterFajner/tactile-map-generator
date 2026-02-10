import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import { extrudePolygon } from "./road-geometry";

/** Size of the orientation marker square in mm */
const MARKER_SIZE_MM = 8;
/** Inset from plate edge in mm */
const MARKER_INSET_MM = 2;

/**
 * Generate the orientation marker geometry.
 * A raised square in the NE corner of the plate (positive x, positive y).
 * Extruded from z=0 to full ORIENTATION_MARKER height — the tallest feature.
 */
export const generateOrientationMarkerGeometry = (
  plateWidthMm: number,
  plateHeightMm: number,
): THREE.BufferGeometry => {
  const hw = plateWidthMm / 2;
  const hh = plateHeightMm / 2;

  const x1 = hw - MARKER_INSET_MM - MARKER_SIZE_MM;
  const y1 = hh - MARKER_INSET_MM - MARKER_SIZE_MM;
  const x2 = hw - MARKER_INSET_MM;
  const y2 = hh - MARKER_INSET_MM;

  const polygon = [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ];

  return extrudePolygon(polygon, HEIGHTS.ORIENTATION_MARKER);
};
