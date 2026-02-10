import type { TactileMapData } from "../../types/map-data";
import type { OverpassResponse } from "../../types/osm";
import { parseOverpassResponse } from "./parser";
import { buildOverpassQuery } from "./query-builder";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

/**
 * Overpass is a OpenStreetMaps provider
 */
export async function fetchOverpassData(
  query: string,
): Promise<OverpassResponse> {
  let res: Response;
  try {
    res = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        "Network error: Could not reach the Overpass API. Check your internet connection and try again.",
      );
    }
    throw err;
  }

  if (res.ok) {
    return res.json();
  }

  switch (res.status) {
    case 429:
      throw new Error(
        "Rate limited by Overpass API. Too many requests — please wait a minute before trying again.",
      );
    case 504:
    case 408:
      throw new Error(
        "The Overpass API query timed out. Try reducing the search radius or trying again later.",
      );
    case 400:
      throw new Error(
        "Bad request sent to Overpass API. This is likely a bug, please report it.",
      );
    default:
      throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
  }
}

export async function fetchAndParseOverpass(
  lat: number,
  lng: number,
  radiusMetres: number,
): Promise<TactileMapData> {
  const query = buildOverpassQuery(lat, lng, radiusMetres);
  const response = await fetchOverpassData(query);
  return parseOverpassResponse(response, lat, lng, radiusMetres, query);
}
