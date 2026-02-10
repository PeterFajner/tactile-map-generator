import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { Curb, LocalPoint } from "../../types/map-data";
import { extrudePolygon } from "./road-geometry";

/** Curb marker size in mm */
const CURB_SIZE_MM = 3;

const curbTypeToHeight = (type: Curb["type"]): number => {
  switch (type) {
    case "flush":
      return HEIGHTS.CURB_FLUSH;
    case "lowered":
      return HEIGHTS.CURB_LOWERED;
    case "raised":
      return HEIGHTS.CURB_RAISED;
    case "rolled":
      return HEIGHTS.CURB_ROLLED;
  }
};

const pointToSquare = (position: LocalPoint, size: number): LocalPoint[] => {
  const hs = size / 2;
  return [
    { x: position.x - hs, y: position.y - hs },
    { x: position.x + hs, y: position.y - hs },
    { x: position.x + hs, y: position.y + hs },
    { x: position.x - hs, y: position.y + hs },
  ];
};

/**
 * Generate 3D geometry for a curb marker.
 * Height depends on curb type. Flush curbs (0mm) return null.
 */
export const generateCurbGeometry = (
  curb: Curb,
): THREE.BufferGeometry | null => {
  const height = curbTypeToHeight(curb.type);
  if (height <= 0) return null;

  const polygon = pointToSquare(curb.position, CURB_SIZE_MM);
  return extrudePolygon(polygon, height, HEIGHTS.BASE_PLATE);
};
