import * as THREE from "three";
import type {
  Crossing,
  LocalPoint,
  Road,
  TactileMapData,
} from "../../types/map-data";
import type {
  AssembledScene,
  GeometryLayer,
  LayerName,
} from "../../types/scene";
import { generateBasePlateGeometry } from "./base-plate";
import { generateBikeLaneGeometry } from "./bike-lane-geometry";
import { generateBuildingGeometry } from "./building-geometry";
import { clipPolygonToRect, clipPolylineToRect, isInRect } from "./clip-utils";
import { generateCrossingGeometry } from "./crossing-geometry";
import { generateCurbGeometry } from "./curb-geometry";
import { generateFeatureSlotGeometry } from "./feature-slot-geometry";
import { generateOrientationMarkerGeometry } from "./orientation-marker";
import {
  generateBusStopGeometry,
  generateTrafficSignalGeometry,
} from "./point-markers";
import type { ClipBounds } from "./road-geometry";
import { generateRoadGeometry } from "./road-geometry";
import { generateSidewalkGeometry } from "./sidewalk-geometry";

/** Default colors for each layer (designed for visual distinction in preview) */
const LAYER_COLORS: Record<LayerName, string> = {
  basePlate: "#e0e0e0",
  roads: "#404040",
  sidewalks: "#a0a0a0",
  crossings: "#ffffff",
  buildings: "#8b7355",
  curbs: "#606060",
  bikeLanes: "#4a9c2f",
  orientationMarker: "#ff6600",
  trafficSignals: "#cc0000",
  busStops: "#0066cc",
  featureSlots: "#ffcc00",
};

const LAYER_LABELS: Record<LayerName, string> = {
  basePlate: "Base Plate",
  roads: "Roads",
  sidewalks: "Sidewalks",
  crossings: "Crossings",
  buildings: "Buildings",
  curbs: "Curbs",
  bikeLanes: "Bike Lanes",
  orientationMarker: "Orientation Marker",
  trafficSignals: "Traffic Signals",
  busStops: "Bus Stops",
  featureSlots: "Feature Slots",
};

/**
 * Find the nearest road segment to a point and return the road's angle at that location.
 */
const findNearestRoadAngle = (pos: LocalPoint, roads: Road[]): number => {
  let bestAngle = 0;
  let bestDist = Infinity;

  for (const road of roads) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-10) continue;

      const t = Math.max(
        0,
        Math.min(1, ((pos.x - a.x) * dx + (pos.y - a.y) * dy) / len2),
      );
      const cx = a.x + t * dx;
      const cy = a.y + t * dy;
      const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);

      if (dist < bestDist) {
        bestDist = dist;
        bestAngle = Math.atan2(dy, dx);
      }
    }
  }

  return bestAngle;
};

/**
 * Convert single-point crossings to oriented 2-point polylines
 * perpendicular to the nearest road.
 */
const orientCrossings = (crossings: Crossing[], roads: Road[]): Crossing[] =>
  crossings.map((cr) => {
    if (cr.points.length !== 1) return cr;

    const pos = cr.points[0];
    const roadAngle = findNearestRoadAngle(pos, roads);
    // Crossing spans perpendicular to the road
    const perpAngle = roadAngle + Math.PI / 2;
    const halfLen = 4; // 8mm total crossing span

    return {
      ...cr,
      points: [
        {
          x: pos.x - halfLen * Math.cos(perpAngle),
          y: pos.y - halfLen * Math.sin(perpAngle),
        },
        {
          x: pos.x + halfLen * Math.cos(perpAngle),
          y: pos.y + halfLen * Math.sin(perpAngle),
        },
      ],
    };
  });

/**
 * Clip all features in TactileMapData to fit within the plate bounds.
 * Polylines are clipped to full plate bounds (polygon clipping after
 * buffering handles flush edges). Point features outside are removed.
 */
const clipMapDataToPlate = (mapData: TactileMapData): TactileMapData => {
  const hw = mapData.metadata.plateWidthMm / 2;
  const hh = mapData.metadata.plateHeightMm / 2;
  const xMin = -hw;
  const yMin = -hh;
  const xMax = hw;
  const yMax = hh;

  return {
    ...mapData,
    roads: mapData.roads.flatMap((road) => {
      const outset = road.widthMm / 2;
      const clipped = clipPolylineToRect(
        road.points,
        xMin - outset,
        yMin - outset,
        xMax + outset,
        yMax + outset,
      );
      return clipped.map((points, i) => ({
        ...road,
        id: clipped.length > 1 ? `${road.id}-${i}` : road.id,
        points,
      }));
    }),
    sidewalks: mapData.sidewalks.flatMap((sw) => {
      const outset = sw.widthMm / 2;
      const clipped = clipPolylineToRect(
        sw.points,
        xMin - outset,
        yMin - outset,
        xMax + outset,
        yMax + outset,
      );
      return clipped.map((points, i) => ({
        ...sw,
        id: clipped.length > 1 ? `${sw.id}-${i}` : sw.id,
        points,
      }));
    }),
    crossings: orientCrossings(mapData.crossings, mapData.roads).flatMap(
      (cr) => {
        if (cr.points.length >= 2) {
          const outset = cr.widthMm / 2;
          const clipped = clipPolylineToRect(
            cr.points,
            xMin - outset,
            yMin - outset,
            xMax + outset,
            yMax + outset,
          );
          return clipped.map((points, i) => ({
            ...cr,
            id: clipped.length > 1 ? `${cr.id}-${i}` : cr.id,
            points,
          }));
        }
        if (
          cr.points.length === 1 &&
          isInRect(cr.points[0], xMin, yMin, xMax, yMax)
        ) {
          return [cr];
        }
        return [];
      },
    ),
    bikeLanes: mapData.bikeLanes.flatMap((bl) => {
      const outset = bl.widthMm / 2;
      const clipped = clipPolylineToRect(
        bl.points,
        xMin - outset,
        yMin - outset,
        xMax + outset,
        yMax + outset,
      );
      return clipped.map((points, i) => ({
        ...bl,
        id: clipped.length > 1 ? `${bl.id}-${i}` : bl.id,
        points,
      }));
    }),
    buildings: mapData.buildings
      .map((b) => ({
        ...b,
        footprint: clipPolygonToRect(b.footprint, xMin, yMin, xMax, yMax),
      }))
      .filter((b) => b.footprint.length >= 3),
    curbs: mapData.curbs.filter((c) =>
      isInRect(c.position, xMin, yMin, xMax, yMax),
    ),
    trafficSignals: mapData.trafficSignals.filter((s) =>
      isInRect(s.position, xMin, yMin, xMax, yMax),
    ),
    busStops: mapData.busStops.filter((s) =>
      isInRect(s.position, xMin, yMin, xMax, yMax),
    ),
    featureSlots: mapData.featureSlots.filter((s) =>
      isInRect(s.position, xMin, yMin, xMax, yMax),
    ),
  };
};

/**
 * Collect non-null geometries from an array of items.
 */
const collectGeometries = <T>(
  items: T[],
  generator: (item: T) => THREE.BufferGeometry | null,
): THREE.BufferGeometry[] => {
  const results: THREE.BufferGeometry[] = [];
  for (const item of items) {
    const geo = generator(item);
    if (geo) results.push(geo);
  }
  return results;
};

const buildLayer = (
  name: LayerName,
  geometries: THREE.BufferGeometry[],
): GeometryLayer => ({
  name,
  label: LAYER_LABELS[name],
  color: LAYER_COLORS[name],
  geometries,
  visible: true,
});

/**
 * Assemble all geometry layers from TactileMapData.
 * Main entry point for geometry generation.
 */
export const assembleScene = (mapData: TactileMapData): AssembledScene => {
  const clipped = clipMapDataToPlate(mapData);
  const { metadata } = clipped;

  const bounds: ClipBounds = {
    xMin: -metadata.plateWidthMm / 2,
    yMin: -metadata.plateHeightMm / 2,
    xMax: metadata.plateWidthMm / 2,
    yMax: metadata.plateHeightMm / 2,
  };

  const layers: GeometryLayer[] = [
    buildLayer("basePlate", [
      generateBasePlateGeometry(metadata.plateWidthMm, metadata.plateHeightMm),
    ]),
    buildLayer(
      "roads",
      collectGeometries(clipped.roads, (r) => generateRoadGeometry(r, bounds)),
    ),
    buildLayer(
      "sidewalks",
      collectGeometries(clipped.sidewalks, (s) =>
        generateSidewalkGeometry(s, bounds),
      ),
    ),
    buildLayer(
      "crossings",
      collectGeometries(clipped.crossings, (c) =>
        generateCrossingGeometry(c, bounds),
      ),
    ),
    buildLayer(
      "buildings",
      collectGeometries(clipped.buildings, generateBuildingGeometry),
    ),
    buildLayer("curbs", collectGeometries(clipped.curbs, generateCurbGeometry)),
    buildLayer(
      "bikeLanes",
      collectGeometries(clipped.bikeLanes, (bl) =>
        generateBikeLaneGeometry(bl, bounds),
      ),
    ),
    buildLayer("orientationMarker", [
      generateOrientationMarkerGeometry(
        metadata.plateWidthMm,
        metadata.plateHeightMm,
      ),
    ]),
    buildLayer(
      "trafficSignals",
      collectGeometries(clipped.trafficSignals, generateTrafficSignalGeometry),
    ),
    buildLayer(
      "busStops",
      collectGeometries(clipped.busStops, generateBusStopGeometry),
    ),
    buildLayer(
      "featureSlots",
      collectGeometries(clipped.featureSlots, generateFeatureSlotGeometry),
    ),
  ];

  return {
    layers,
    plateWidthMm: metadata.plateWidthMm,
    plateHeightMm: metadata.plateHeightMm,
  };
};

/**
 * Dispose all geometries in a scene (call when unmounting preview).
 */
export const disposeScene = (scene: AssembledScene): void => {
  for (const layer of scene.layers) {
    for (const geo of layer.geometries) {
      geo.dispose();
    }
  }
};
