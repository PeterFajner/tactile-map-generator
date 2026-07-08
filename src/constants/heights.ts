/**
 * Height layer constants in millimeters (Z-axis of printed output).
 * Based on Makers Making Change Tactile Maps Design Rationale v1.0,
 * with roads inset below the plate surface so there is a tactile cliff
 * around every road edge (not just where sidewalks are present).
 */
export const HEIGHTS = {
  BASE_PLATE: 0.8, // thicker than MMC spec (0.4) to accommodate road inset

  ROAD_SURFACE: -0.4, // inset below plate top — creates a tactile channel
  CROSSING: 0.3, // lineHeight (above road, so -0.1 absolute)
  SIDEWALK: 3.2, // sidewalkHeight

  CURB_FLUSH: 0.0,
  CURB_LOWERED: 1.6, // gradual ramp, ~half sidewalk height
  CURB_RAISED: 3.2, // sudden step, full sidewalk height
  CURB_ROLLED: 2.4, // rounded transition

  FEATURE_SLOT_DEPTH: 0.8, // pegDepth (sidewalkHeight / 4)
  FEATURE_PIECE: 1.6, // featureHeight
  ORIENTATION_MARKER: 2.4, // orientorHeight, 6mm x 6mm square
  BUILDING: 3.2, // match sidewalk height
} as const;

/** Map dimensions from MMC spec */
export const MAP_DIMENSIONS = {
  SIDE_LENGTH: 170, // mm, square map
  ORIENTOR_SIZE: 6, // mm, side length of orientation square
  PEG_SIZE: 6, // mm, side length of peg/slot
  CROSSING_LINE_WIDTH: 3, // mm
  FIT_CLEARANCE: 0.2, // mm, tolerance for fitting parts
  SIDEWALK_WIDTH_RATIO: 1 / 3, // sidewalk width = length / 3
  PRINT_LAYER_HEIGHT: 0.2, // mm
} as const;
