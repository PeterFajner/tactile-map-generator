import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { FeatureSlot, LocalPoint } from "../../types/map-data";
import { clipPolygonToRect } from "./clip-utils";
import type { ClipBounds } from "./road-geometry";
import { extrudePolygon } from "./road-geometry";

/**
 * Generate slot rectangle vertices, accounting for rotation.
 */
const slotToPolygon = (slot: FeatureSlot): LocalPoint[] => {
  const hw = slot.widthMm / 2;
  const hd = slot.depthMm / 2;
  const rad = (slot.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners: LocalPoint[] = [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ];

  return corners.map((c) => ({
    x: slot.position.x + c.x * cos - c.y * sin,
    y: slot.position.y + c.x * sin + c.y * cos,
  }));
};

/**
 * Generate 3D geometry for a feature slot.
 * Rendered as a thin indicator slab at the base plate surface.
 * Clipped to plate bounds.
 */
export const generateFeatureSlotGeometry = (
  slot: FeatureSlot,
  bounds: ClipBounds,
): THREE.BufferGeometry | null => {
  const clipped = clipPolygonToRect(
    slotToPolygon(slot),
    bounds.xMin,
    bounds.yMin,
    bounds.xMax,
    bounds.yMax,
  );
  if (clipped.length < 3) return null;

  const slotIndicatorHeight = 0.2;
  return extrudePolygon(
    clipped,
    slotIndicatorHeight,
    HEIGHTS.BASE_PLATE - slotIndicatorHeight,
  );
};
