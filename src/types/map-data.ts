/** All coordinates in the intermediate format are LOCAL millimeters
 *  relative to the map center. */

export type LocalPoint = {
  x: number; // mm, rightward = East
  y: number; // mm, upward = North
};

export type MapMetadata = {
  center: { lat: number; lng: number };
  radiusMetres: number;
  fetchedAt: string;
  overpassQuery: string;
  scaleFactor: number;
  plateWidthMm: number;
  plateHeightMm: number;
};

export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
  localMinX: number;
  localMinY: number;
  localMaxX: number;
  localMaxY: number;
};

export type Road = {
  id: string;
  name: string | null;
  highwayType: string;
  points: LocalPoint[];
  widthMm: number;
  lanes: number | null;
  oneway: boolean;
  surface: string | null;
};

export type Sidewalk = {
  id: string;
  points: LocalPoint[];
  widthMm: number;
  side: "left" | "right" | "both" | null;
  surface: string | null;
};

export type Crossing = {
  id: string;
  type: "zebra" | "marked" | "unmarked" | "signals" | "uncontrolled";
  points: LocalPoint[];
  widthMm: number;
  hasSignal: boolean;
  hasTactilePaving: boolean;
};

export type Curb = {
  id: string;
  type: "flush" | "lowered" | "raised" | "rolled";
  heightMm: number;
  position: LocalPoint;
  associatedSidewalkId: string | null;
  associatedCrossingId: string | null;
};

export type TrafficSignal = {
  id: string;
  position: LocalPoint;
  signalType: "traffic_signals" | "pedestrian_signals" | "button";
};

export type BusStop = {
  id: string;
  position: LocalPoint;
  name: string | null;
  shelter: boolean;
};

export type BikeLane = {
  id: string;
  points: LocalPoint[];
  widthMm: number;
  type: "lane" | "track" | "shared";
};

export type Building = {
  id: string;
  footprint: LocalPoint[];
  heightMm: number;
};

export type FeatureSlot = {
  id: string;
  position: LocalPoint;
  slotType:
    | "stop_sign"
    | "yield_sign"
    | "bus_stop"
    | "mailbox"
    | "bike_lane"
    | "railroad"
    | "pedestrian_crossing";
  rotationDeg: number;
  widthMm: number;
  depthMm: number;
};

export type TactileMapData = {
  metadata: MapMetadata;
  bounds: MapBounds;
  roads: Road[];
  sidewalks: Sidewalk[];
  crossings: Crossing[];
  curbs: Curb[];
  trafficSignals: TrafficSignal[];
  busStops: BusStop[];
  bikeLanes: BikeLane[];
  buildings: Building[];
  featureSlots: FeatureSlot[];
};
