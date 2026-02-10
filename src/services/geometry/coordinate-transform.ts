import type { LocalPoint } from "../../types/map-data";
import { METRES_PER_DEGREE } from "../../utils/geo";

/**
 * Convert lat/lng to local mm coordinates relative to a center point.
 */
export const latLngToLocal = (
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  scaleFactor: number,
): LocalPoint => {
  const metersPerDegreeLng =
    METRES_PER_DEGREE * Math.cos((centerLat * Math.PI) / 180);

  const xMeters = (lng - centerLng) * metersPerDegreeLng;
  const yMeters = (lat - centerLat) * METRES_PER_DEGREE;

  return {
    x: xMeters * scaleFactor,
    y: yMeters * scaleFactor,
  };
};

/**
 * Convert local mm coordinates back to lat/lng.
 */
export const localToLatLng = (
  point: LocalPoint,
  centerLat: number,
  centerLng: number,
  scaleFactor: number,
): [number, number] => {
  const metersPerDegreeLng =
    METRES_PER_DEGREE * Math.cos((centerLat * Math.PI) / 180);
  const xMeters = point.x / scaleFactor;
  const yMeters = point.y / scaleFactor;
  return [
    centerLat + yMeters / METRES_PER_DEGREE,
    centerLng + xMeters / metersPerDegreeLng,
  ];
};

/**
 * Compute a scale factor to fit the given radius (in meters) onto a plate of given size.
 * The diameter (2 * radius) maps to the plate width.
 */
export const computeScaleFactor = (
  radiusMetres: number,
  plateWidthMm: number,
): number => {
  const diameterMeters = 2 * radiusMetres;
  return plateWidthMm / diameterMeters;
};
