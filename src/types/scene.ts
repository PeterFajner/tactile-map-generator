import type * as THREE from "three";

/** Semantic layer names for geometry groups */
export type LayerName =
  | "basePlate"
  | "roads"
  | "sidewalks"
  | "crossings"
  | "buildings"
  | "curbs"
  | "bikeLanes"
  | "orientationMarker"
  | "trafficSignals"
  | "busStops"
  | "featureSlots";

/** A single geometry layer with its display properties */
export type GeometryLayer = {
  name: LayerName;
  label: string;
  color: string;
  geometries: THREE.BufferGeometry[];
  visible: boolean;
};

/** Complete assembled scene ready for preview/export */
export type AssembledScene = {
  layers: GeometryLayer[];
  plateWidthMm: number;
  plateHeightMm: number;
};
