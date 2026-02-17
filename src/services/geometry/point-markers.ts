import * as THREE from "three";
import { HEIGHTS } from "../../constants/heights";
import type { BusStop, LocalPoint, TrafficSignal } from "../../types/map-data";
import { clipPolygonToRect } from "./clip-utils";
import type { ClipBounds } from "./road-geometry";
import { extrudePolygon } from "./road-geometry";

/** Marker size for traffic signals (mm) */
const SIGNAL_SIZE_MM = 3;
/** Marker size for bus stops (mm) */
const BUS_STOP_SIZE_MM = 4;
/** Height for point markers above base plate (mm) */
const POINT_MARKER_HEIGHT_MM = 3;

/**
 * Create an octagonal polygon centered at a position for a rounded marker.
 */
const pointToOctagon = (position: LocalPoint, size: number): LocalPoint[] => {
  const r = size / 2;
  const pts: LocalPoint[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    pts.push({
      x: position.x + r * Math.cos(angle),
      y: position.y + r * Math.sin(angle),
    });
  }
  return pts;
};

/** Clip a polygon to plate bounds, returning null if nothing remains. */
const clipToPlate = (
  polygon: LocalPoint[],
  bounds: ClipBounds,
): LocalPoint[] | null => {
  const clipped = clipPolygonToRect(
    polygon,
    bounds.xMin,
    bounds.yMin,
    bounds.xMax,
    bounds.yMax,
  );
  return clipped.length >= 3 ? clipped : null;
};

/**
 * Generate 3D geometry for a traffic signal marker.
 * A small raised octagonal column on top of the base plate.
 */
export const generateTrafficSignalGeometry = (
  signal: TrafficSignal,
  bounds: ClipBounds,
): THREE.BufferGeometry | null => {
  const polygon = clipToPlate(
    pointToOctagon(signal.position, SIGNAL_SIZE_MM),
    bounds,
  );
  if (!polygon) return null;
  return extrudePolygon(polygon, POINT_MARKER_HEIGHT_MM, HEIGHTS.BASE_PLATE);
};

/**
 * Generate 3D geometry for a bus stop marker.
 * A slightly larger raised octagonal column on top of the base plate.
 */
export const generateBusStopGeometry = (
  busStop: BusStop,
  bounds: ClipBounds,
): THREE.BufferGeometry | null => {
  const polygon = clipToPlate(
    pointToOctagon(busStop.position, BUS_STOP_SIZE_MM),
    bounds,
  );
  if (!polygon) return null;
  return extrudePolygon(polygon, POINT_MARKER_HEIGHT_MM, HEIGHTS.BASE_PLATE);
};
