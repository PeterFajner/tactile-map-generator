export type BBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

/** Approximate metres per degree of latitude */
export const METRES_PER_DEGREE = 111320;

/**
 * Compute a bounding box from a center point and radius in meters
 */
export const bboxFromCenter = (
  lat: number,
  lng: number,
  radiusMetres: number,
): BBox => {
  const latDelta = radiusMetres / METRES_PER_DEGREE;
  // longitude degrees shrink as you get further from equator, so need cosine adjustment
  const lngDelta =
    radiusMetres / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));

  return {
    south: lat - latDelta,
    west: lng - lngDelta,
    north: lat + latDelta,
    east: lng + lngDelta,
  };
};

/**
 * Format a bounding box as the Overpass API expects: south,west,north,east
 */
export const bboxToOverpass = (bbox: BBox): string => {
  return `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
};
