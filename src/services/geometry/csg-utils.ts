import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

/**
 * Subtract an array of cutter geometries from a base geometry using CSG.
 * Returns the carved result as a BufferGeometry.
 */
export const subtractGeometries = (
  baseGeometry: THREE.BufferGeometry,
  cutterGeometries: THREE.BufferGeometry[],
): THREE.BufferGeometry => {
  if (cutterGeometries.length === 0) return baseGeometry;

  const evaluator = new Evaluator();
  evaluator.attributes = ["position", "normal"];

  let baseBrush = new Brush(baseGeometry);
  baseBrush.updateMatrixWorld();

  for (const cutterGeo of cutterGeometries) {
    const cutBrush = new Brush(cutterGeo);
    cutBrush.updateMatrixWorld();

    const result = evaluator.evaluate(baseBrush, cutBrush, SUBTRACTION);
    baseBrush = result;
  }

  return baseBrush.geometry;
};
