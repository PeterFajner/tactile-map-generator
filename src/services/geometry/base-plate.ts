import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import { extrudePolygon } from "./road-geometry";

/**
 * Generate the base plate geometry.
 * A flat rectangle centered at origin, extruded to BASE_PLATE height.
 */
export const generateBasePlateGeometry = (
  plateWidthMm: number,
  plateHeightMm: number,
): THREE.BufferGeometry => {
  const hw = plateWidthMm / 2;
  const hh = plateHeightMm / 2;

  const polygon = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  return extrudePolygon(polygon, HEIGHTS.BASE_PLATE);
};
