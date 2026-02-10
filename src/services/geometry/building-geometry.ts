import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { Building } from "../../types/map-data";
import { extrudePolygon } from "./road-geometry";

/**
 * Generate 3D geometry for a building.
 * Buildings sit on top of the base plate at BUILDING height.
 */
export const generateBuildingGeometry = (
  building: Building,
): THREE.BufferGeometry | null => {
  if (building.footprint.length < 3) return null;

  return extrudePolygon(
    building.footprint,
    building.heightMm,
    HEIGHTS.BASE_PLATE,
  );
};
