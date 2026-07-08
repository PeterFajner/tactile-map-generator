import type { TactileMapData } from "../../types/map-data";
import type { OverpassResponse } from "../../types/osm";
import { parseOverpassResponse } from "./parser";
import { buildOverpassQuery } from "./query-builder";

/**
 * Public Overpass instances, tried in order. Some instances intermittently
 * queue requests and hold the connection open indefinitely, or rate-limit;
 * if one fails we fall through to the next.
 */
const DEFAULT_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.jp/api/interpreter",
];

// A single VITE_OVERPASS_URL override wins; otherwise use the fallback list.
const ENDPOINTS = import.meta.env.VITE_OVERPASS_URL
  ? [import.meta.env.VITE_OVERPASS_URL]
  : DEFAULT_ENDPOINTS;

// The query carries [timeout:30] server-side; allow that plus network overhead
// before we give up on an endpoint and move on. This is the key guard against
// instances that accept a request and then never respond.
const REQUEST_TIMEOUT_MS = 40_000;

/** Thrown when an individual endpoint fails; carries whether it's worth retrying elsewhere. */
class OverpassEndpointError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const fetchFromEndpoint = async (
  endpoint: string,
  query: string,
): Promise<OverpassResponse> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new OverpassEndpointError(
        `${endpoint} did not respond within ${REQUEST_TIMEOUT_MS / 1000}s`,
        true,
      );
    }
    // TypeError = network/CORS failure; retryable on another endpoint.
    throw new OverpassEndpointError(
      `Could not reach ${endpoint}`,
      err instanceof TypeError,
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.ok) {
    return res.json();
  }

  // 429 (rate limit) and 5xx/504/408 (overload/timeout) are worth retrying
  // on a different instance; 400 is a real query bug and is not.
  const retryable = res.status !== 400;
  throw new OverpassEndpointError(
    `${endpoint} returned ${res.status} ${res.statusText}`,
    retryable,
  );
};

/**
 * Fetch OSM data from Overpass, trying each configured instance in turn.
 * Never hangs: every request is bounded by REQUEST_TIMEOUT_MS.
 */
export async function fetchOverpassData(
  query: string,
): Promise<OverpassResponse> {
  let lastError: OverpassEndpointError | undefined;

  for (const endpoint of ENDPOINTS) {
    try {
      return await fetchFromEndpoint(endpoint, query);
    } catch (err) {
      if (err instanceof OverpassEndpointError) {
        lastError = err;
        if (err.retryable) continue; // try the next instance
      }
      throw err;
    }
  }

  throw new Error(
    `All Overpass instances failed or timed out. Last error: ${
      lastError?.message ?? "unknown"
    }. Try again in a minute, or reduce the search radius.`,
  );
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
