/** Height layer constants in millimeters (Z-axis of printed output) */
export const HEIGHTS = {
  BASE_PLATE: 2.0,

  ROAD_SURFACE: 0.1,
  CROSSING: 0.8,
  SIDEWALK: 2.5,

  CURB_FLUSH: 0.0,
  CURB_LOWERED: 1.2,
  CURB_RAISED: 2.5,
  CURB_ROLLED: 1.8,

  FEATURE_SLOT_DEPTH: 2.0,
  FEATURE_PIECE: 4.0,
  ORIENTATION_MARKER: 5.5,
  BUILDING: 3.0,
} as const;
