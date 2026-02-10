import { HEIGHTS } from "../../constants/heights";
import {
  DEFAULT_BIKE_LANE_WIDTH_M,
  DEFAULT_BUILDING_HEIGHT_MM,
  DEFAULT_CROSSING_WIDTH_M,
  DEFAULT_ROAD_WIDTHS_M,
  DEFAULT_SIDEWALK_WIDTH_M,
} from "../../constants/road-defaults";
import type {
  BikeLane,
  Building,
  BusStop,
  Crossing,
  Curb,
  LocalPoint,
  MapBounds,
  MapMetadata,
  Road,
  Sidewalk,
  TactileMapData,
  TrafficSignal,
} from "../../types/map-data";
import type { OsmNode, OsmWay, OverpassResponse } from "../../types/osm";
import { METRES_PER_DEGREE } from "../../utils/geo";
import {
  computeScaleFactor,
  latLngToLocal,
} from "../geometry/coordinate-transform";

const PLATE_WIDTH_MM = 150;
const PLATE_HEIGHT_MM = 150;

/**
 * Offset a polyline to the left (positive) or right (negative) by a distance.
 * Used to synthesize sidewalk geometry from road centerlines.
 */
const offsetPolyline = (points: LocalPoint[], offset: number): LocalPoint[] => {
  if (points.length < 2) return [];
  const result: LocalPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    let nx = 0;
    let ny = 0;
    let count = 0;

    if (i > 0) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1e-10) {
        nx += -dy / len;
        ny += dx / len;
        count++;
      }
    }
    if (i < points.length - 1) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1e-10) {
        nx += -dy / len;
        ny += dx / len;
        count++;
      }
    }

    if (count > 0) {
      nx /= count;
      ny /= count;
      const nlen = Math.sqrt(nx * nx + ny * ny);
      if (nlen > 1e-10) {
        nx /= nlen;
        ny /= nlen;
      }
    }

    result.push({
      x: points[i].x + nx * offset,
      y: points[i].y + ny * offset,
    });
  }

  return result;
};

const ROAD_HIGHWAY_TYPES = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "residential",
  "unclassified",
  "service",
  "living_street",
]);

export const parseOverpassResponse = (
  response: OverpassResponse,
  centerLat: number,
  centerLng: number,
  radiusMetres: number,
  overpassQuery: string,
): TactileMapData => {
  const scaleFactor = computeScaleFactor(radiusMetres, PLATE_WIDTH_MM);

  // build node lookup
  const nodeLookup = new Map<number, { lat: number; lng: number }>();
  for (const el of response.elements) {
    if (el.type === "node") {
      const node = el as OsmNode;
      nodeLookup.set(node.id, { lat: node.lat, lng: node.lon });
    }
  }

  const toLocal = (lat: number, lng: number): LocalPoint => {
    return latLngToLocal(lat, lng, centerLat, centerLng, scaleFactor);
  };

  const wayToPoints = (way: OsmWay): LocalPoint[] => {
    const points: LocalPoint[] = [];
    for (const nodeId of way.nodes) {
      const node = nodeLookup.get(nodeId);
      if (node) {
        points.push(toLocal(node.lat, node.lng));
      }
    }
    return points;
  };

  const roads: Road[] = [];
  const sidewalks: Sidewalk[] = [];
  const crossings: Crossing[] = [];
  const curbs: Curb[] = [];
  const trafficSignals: TrafficSignal[] = [];
  const busStops: BusStop[] = [];
  const bikeLanes: BikeLane[] = [];
  const buildings: Building[] = [];

  for (const el of response.elements) {
    if (el.type === "way") {
      const way = el as OsmWay;
      const tags = way.tags ?? {};

      // roads
      if (tags.highway && ROAD_HIGHWAY_TYPES.has(tags.highway)) {
        const points = wayToPoints(way);
        if (points.length >= 2) {
          const widthM =
            parseFloat(tags.width ?? "") ||
            DEFAULT_ROAD_WIDTHS_M[tags.highway] ||
            6.0;
          const widthMm = widthM * scaleFactor;
          roads.push({
            id: `way/${way.id}`,
            name: tags.name ?? null,
            highwayType: tags.highway,
            points,
            widthMm,
            lanes: tags.lanes ? parseInt(tags.lanes) : null,
            oneway: tags.oneway === "yes",
            surface: tags.surface ?? null,
          });

          // synthesize sidewalks from road-level sidewalk tags
          const swTag = tags.sidewalk;
          if (
            swTag &&
            swTag !== "no" &&
            swTag !== "none" &&
            swTag !== "separate"
          ) {
            const swWidthMm = DEFAULT_SIDEWALK_WIDTH_M * scaleFactor;
            const offsetDist = widthMm / 2 + swWidthMm / 2;

            const addSynthSidewalk = (side: "left" | "right", dist: number) => {
              const offsetPts = offsetPolyline(points, dist);
              if (offsetPts.length >= 2) {
                sidewalks.push({
                  id: `way/${way.id}/sidewalk-${side}`,
                  points: offsetPts,
                  widthMm: swWidthMm,
                  side,
                  surface: null,
                });
              }
            };

            if (swTag === "left" || swTag === "both" || swTag === "yes") {
              addSynthSidewalk("left", offsetDist);
            }
            if (swTag === "right" || swTag === "both" || swTag === "yes") {
              addSynthSidewalk("right", -offsetDist);
            }
          }
        }
      }

      // sidewalks / footways
      if (tags.highway === "footway" || tags.footway === "sidewalk") {
        const points = wayToPoints(way);
        if (points.length >= 2) {
          sidewalks.push({
            id: `way/${way.id}`,
            points,
            widthMm: DEFAULT_SIDEWALK_WIDTH_M * scaleFactor,
            side: (tags.side as Sidewalk["side"]) ?? null,
            surface: tags.surface ?? null,
          });
        }
      }

      // crossing ways
      if (tags.highway === "crossing" || tags.footway === "crossing") {
        const points = wayToPoints(way);
        if (points.length >= 2) {
          crossings.push({
            id: `way/${way.id}`,
            type: classifyCrossing(tags),
            points,
            widthMm: DEFAULT_CROSSING_WIDTH_M * scaleFactor,
            hasSignal:
              tags.crossing === "traffic_signals" ||
              tags["crossing:signals"] === "yes",
            hasTactilePaving: tags.tactile_paving === "yes",
          });
        }
      }

      // bike lanes
      if (tags.highway === "cycleway" || tags.cycleway) {
        const points = wayToPoints(way);
        if (points.length >= 2) {
          bikeLanes.push({
            id: `way/${way.id}`,
            points,
            widthMm: DEFAULT_BIKE_LANE_WIDTH_M * scaleFactor,
            type:
              tags.cycleway === "track"
                ? "track"
                : tags.cycleway === "shared_lane"
                  ? "shared"
                  : "lane",
          });
        }
      }

      // buildings
      if (tags.building) {
        const points = wayToPoints(way);
        if (points.length >= 3) {
          buildings.push({
            id: `way/${way.id}`,
            footprint: points,
            heightMm: DEFAULT_BUILDING_HEIGHT_MM,
          });
        }
      }
    }

    if (el.type === "node") {
      const node = el as OsmNode;
      const tags = node.tags ?? {};

      // crossing nodes
      if (tags.highway === "crossing" || tags.crossing) {
        const pos = toLocal(node.lat, node.lon);
        crossings.push({
          id: `node/${node.id}`,
          type: classifyCrossing(tags),
          points: [pos],
          widthMm: DEFAULT_CROSSING_WIDTH_M * scaleFactor,
          hasSignal:
            tags.crossing === "traffic_signals" ||
            tags["crossing:signals"] === "yes",
          hasTactilePaving: tags.tactile_paving === "yes",
        });
      }

      // traffic signals
      if (tags.highway === "traffic_signals") {
        trafficSignals.push({
          id: `node/${node.id}`,
          position: toLocal(node.lat, node.lon),
          signalType:
            tags["crossing"] === "traffic_signals"
              ? "pedestrian_signals"
              : "traffic_signals",
        });
      }

      // curbs (OSM uses British "kerb")
      if (tags.barrier === "kerb" || tags.kerb) {
        curbs.push({
          id: `node/${node.id}`,
          type: classifyCurb(tags),
          heightMm: parseCurbHeight(tags, scaleFactor),
          position: toLocal(node.lat, node.lon),
          associatedSidewalkId: null,
          associatedCrossingId: null,
        });
      }

      // bus stops
      if (tags.highway === "bus_stop") {
        busStops.push({
          id: `node/${node.id}`,
          position: toLocal(node.lat, node.lon),
          name: tags.name ?? null,
          shelter: tags.shelter === "yes",
        });
      }
    }
  }

  // compute bounds
  const allPoints = [
    ...roads.flatMap((r) => r.points),
    ...sidewalks.flatMap((s) => s.points),
    ...buildings.flatMap((b) => b.footprint),
  ];

  const bounds: MapBounds = {
    south: centerLat - radiusMetres / METRES_PER_DEGREE,
    west:
      centerLng -
      radiusMetres /
        (METRES_PER_DEGREE * Math.cos((centerLat * Math.PI) / 180)),
    north: centerLat + radiusMetres / METRES_PER_DEGREE,
    east:
      centerLng +
      radiusMetres /
        (METRES_PER_DEGREE * Math.cos((centerLat * Math.PI) / 180)),
    localMinX: allPoints.length
      ? Math.min(...allPoints.map((p) => p.x))
      : -PLATE_WIDTH_MM / 2,
    localMinY: allPoints.length
      ? Math.min(...allPoints.map((p) => p.y))
      : -PLATE_HEIGHT_MM / 2,
    localMaxX: allPoints.length
      ? Math.max(...allPoints.map((p) => p.x))
      : PLATE_WIDTH_MM / 2,
    localMaxY: allPoints.length
      ? Math.max(...allPoints.map((p) => p.y))
      : PLATE_HEIGHT_MM / 2,
  };

  const metadata: MapMetadata = {
    center: { lat: centerLat, lng: centerLng },
    radiusMetres: radiusMetres,
    fetchedAt: new Date().toISOString(),
    overpassQuery,
    scaleFactor,
    plateWidthMm: PLATE_WIDTH_MM,
    plateHeightMm: PLATE_HEIGHT_MM,
  };

  return {
    metadata,
    bounds,
    roads,
    sidewalks,
    crossings,
    curbs,
    trafficSignals,
    busStops,
    bikeLanes,
    buildings,
    featureSlots: [],
  };
};

const classifyCrossing = (tags: Record<string, string>): Crossing["type"] => {
  if (tags.crossing === "traffic_signals") return "signals";
  if (tags.crossing === "zebra" || tags["crossing:markings"] === "zebra")
    return "zebra";
  if (tags.crossing === "marked") return "marked";
  if (tags.crossing === "unmarked") return "unmarked";
  if (tags.crossing === "uncontrolled") return "uncontrolled";
  return "marked";
};

const classifyCurb = (tags: Record<string, string>): Curb["type"] => {
  const curb = tags.kerb;
  if (curb === "flush") return "flush";
  if (curb === "lowered") return "lowered";
  if (curb === "rolled") return "rolled";
  return "raised";
};

const parseCurbHeight = (
  tags: Record<string, string>,
  scaleFactor: number,
): number => {
  // try exact height first (in meters)
  const heightStr = tags["kerb:height"] || tags.height;
  if (heightStr) {
    const meters = parseFloat(heightStr);
    if (!isNaN(meters)) return meters * 1000 * scaleFactor; // m -> mm, then scale
  }

  // fall back to type-based defaults
  const curbType = classifyCurb(tags);
  switch (curbType) {
    case "flush":
      return HEIGHTS.CURB_FLUSH;
    case "lowered":
      return HEIGHTS.CURB_LOWERED;
    case "rolled":
      return HEIGHTS.CURB_ROLLED;
    case "raised":
      return HEIGHTS.CURB_RAISED;
  }
};
