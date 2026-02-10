/** Default road widths in real-world meters, used when OSM doesn't have width tags */
export const DEFAULT_ROAD_WIDTHS_M: Record<string, number> = {
  motorway: 14.0,
  trunk: 12.0,
  primary: 10.0,
  secondary: 8.0,
  tertiary: 7.0,
  residential: 6.0,
  unclassified: 5.0,
  service: 4.0,
  living_street: 5.0,
  footway: 1.8,
  cycleway: 2.0,
  path: 1.5,
  pedestrian: 4.0,
};

/** Default crossing width in meters */
export const DEFAULT_CROSSING_WIDTH_M = 3.0;

/** Default sidewalk width in meters */
export const DEFAULT_SIDEWALK_WIDTH_M = 1.8;

/** Default bike lane width in meters */
export const DEFAULT_BIKE_LANE_WIDTH_M = 2.0;

/** Default building extrusion height in mm (local units, not real-world) */
export const DEFAULT_BUILDING_HEIGHT_MM = 3.0;
