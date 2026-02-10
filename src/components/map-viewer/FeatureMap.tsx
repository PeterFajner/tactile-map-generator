import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Rectangle,
  TileLayer,
} from "react-leaflet";
import { localToLatLng } from "../../services/geometry/coordinate-transform";
import { useAppStore } from "../../store/app-store";
import type { LocalPoint, TactileMapData } from "../../types/map-data";

type FeatureLayerName =
  | "roads"
  | "sidewalks"
  | "crossings"
  | "buildings"
  | "curbs"
  | "bikeLanes"
  | "trafficSignals"
  | "busStops"
  | "featureSlots";

const LAYER_META: { name: FeatureLayerName; label: string; color: string }[] = [
  { name: "roads", label: "Roads", color: "#404040" },
  { name: "sidewalks", label: "Sidewalks", color: "#ff8800" },
  { name: "crossings", label: "Crossings", color: "#e040e0" },
  { name: "buildings", label: "Buildings", color: "#8b7355" },
  { name: "curbs", label: "Curbs", color: "#888888" },
  { name: "bikeLanes", label: "Bike Lanes", color: "#4a9c2f" },
  { name: "trafficSignals", label: "Traffic Signals", color: "#cc0000" },
  { name: "busStops", label: "Bus Stops", color: "#0066cc" },
  { name: "featureSlots", label: "Feature Slots", color: "#ffcc00" },
];

const DEFAULT_VISIBILITY: Record<FeatureLayerName, boolean> = {
  roads: true,
  sidewalks: true,
  crossings: true,
  buildings: true,
  curbs: true,
  bikeLanes: true,
  trafficSignals: true,
  busStops: true,
  featureSlots: true,
};

const toLL = (
  point: LocalPoint,
  centerLat: number,
  centerLng: number,
  scaleFactor: number,
): [number, number] => localToLatLng(point, centerLat, centerLng, scaleFactor);

const toPath = (
  points: LocalPoint[],
  centerLat: number,
  centerLng: number,
  scaleFactor: number,
): [number, number][] =>
  points.map((p) => toLL(p, centerLat, centerLng, scaleFactor));

const featureCounts = (
  data: TactileMapData,
): Record<FeatureLayerName, number> => ({
  roads: data.roads.length,
  sidewalks: data.sidewalks.length,
  crossings: data.crossings.length,
  buildings: data.buildings.length,
  curbs: data.curbs.length,
  bikeLanes: data.bikeLanes.length,
  trafficSignals: data.trafficSignals.length,
  busStops: data.busStops.length,
  featureSlots: data.featureSlots.length,
});

/**
 * 2D map with the features that we'll be 3D-ifying overlaid for easy comparison/verification
 */
export const FeatureMap = () => {
  const mapData = useAppStore((s) => s.mapData);
  const [visibility, setVisibility] =
    useState<Record<FeatureLayerName, boolean>>(DEFAULT_VISIBILITY);

  const derived = useMemo(() => {
    if (!mapData) return null;
    const { center, scaleFactor } = mapData.metadata;
    const { south, west, north, east } = mapData.bounds;
    const bounds: LatLngBoundsExpression = [
      [south, west],
      [north, east],
    ];
    const ll = (p: LocalPoint): [number, number] =>
      toLL(p, center.lat, center.lng, scaleFactor);
    const path = (pts: LocalPoint[]): [number, number][] =>
      toPath(pts, center.lat, center.lng, scaleFactor);
    return { center, bounds, ll, path, counts: featureCounts(mapData) };
  }, [mapData]);

  if (!mapData || !derived) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No map data to display.
      </div>
    );
  }

  const handleToggle = (name: FeatureLayerName) => {
    setVisibility((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const { center, bounds, ll, path, counts } = derived;

  return (
    <div className="relative h-full w-full">
      {/* Map fills the container */}
      <div className="absolute inset-0 rounded border border-gray-300 overflow-hidden">
        <MapContainer
          center={[center.lat, center.lng]}
          bounds={bounds}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Plate bounds rectangle */}
          <Rectangle
            bounds={bounds}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#3b82f6",
              fillOpacity: 0.05,
              weight: 2,
              dashArray: "6 4",
            }}
          />

          {/* Buildings */}
          {visibility.buildings &&
            mapData.buildings.map((b) => (
              <Polygon
                key={b.id}
                positions={path(b.footprint)}
                pathOptions={{
                  color: "#8b7355",
                  fillColor: "#8b7355",
                  fillOpacity: 0.4,
                  weight: 1,
                }}
              />
            ))}

          {/* Roads */}
          {visibility.roads &&
            mapData.roads.map((r) => (
              <Polyline
                key={r.id}
                positions={path(r.points)}
                pathOptions={{ color: "#404040", weight: 4, opacity: 0.8 }}
              />
            ))}

          {/* Sidewalks */}
          {visibility.sidewalks &&
            mapData.sidewalks.map((s) => (
              <Polyline
                key={s.id}
                positions={path(s.points)}
                pathOptions={{ color: "#ff8800", weight: 3, opacity: 0.8 }}
              />
            ))}

          {/* Crossings */}
          {visibility.crossings &&
            mapData.crossings.map((c) =>
              c.points.length >= 2 ? (
                <Polyline
                  key={c.id}
                  positions={path(c.points)}
                  pathOptions={{ color: "#e040e0", weight: 4, opacity: 0.9 }}
                />
              ) : (
                <CircleMarker
                  key={c.id}
                  center={ll(c.points[0])}
                  radius={5}
                  pathOptions={{
                    color: "#e040e0",
                    fillColor: "#e040e0",
                    fillOpacity: 0.8,
                  }}
                />
              ),
            )}

          {/* Bike Lanes */}
          {visibility.bikeLanes &&
            mapData.bikeLanes.map((bl) => (
              <Polyline
                key={bl.id}
                positions={path(bl.points)}
                pathOptions={{ color: "#4a9c2f", weight: 3, opacity: 0.8 }}
              />
            ))}

          {/* Curbs */}
          {visibility.curbs &&
            mapData.curbs.map((c) => (
              <CircleMarker
                key={c.id}
                center={ll(c.position)}
                radius={4}
                pathOptions={{
                  color: "#888888",
                  fillColor: "#888888",
                  fillOpacity: 0.8,
                }}
              />
            ))}

          {/* Traffic Signals */}
          {visibility.trafficSignals &&
            mapData.trafficSignals.map((s) => (
              <CircleMarker
                key={s.id}
                center={ll(s.position)}
                radius={6}
                pathOptions={{
                  color: "#cc0000",
                  fillColor: "#cc0000",
                  fillOpacity: 0.9,
                }}
              />
            ))}

          {/* Bus Stops */}
          {visibility.busStops &&
            mapData.busStops.map((s) => (
              <CircleMarker
                key={s.id}
                center={ll(s.position)}
                radius={6}
                pathOptions={{
                  color: "#0066cc",
                  fillColor: "#0066cc",
                  fillOpacity: 0.9,
                }}
              />
            ))}

          {/* Feature Slots */}
          {visibility.featureSlots &&
            mapData.featureSlots.map((s) => (
              <CircleMarker
                key={s.id}
                center={ll(s.position)}
                radius={5}
                pathOptions={{
                  color: "#ffcc00",
                  fillColor: "#ffcc00",
                  fillOpacity: 0.9,
                }}
              />
            ))}
        </MapContainer>
      </div>

      {/* Layer toggle panel — separate from map's stacking context */}
      <div className="absolute top-3 left-12 z-[10000] bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 text-sm max-h-[calc(100%-24px)] overflow-y-auto pointer-events-auto">
        <div className="font-medium text-gray-700 mb-2">Layers</div>
        {LAYER_META.map(({ name, label, color }) => (
          <label
            key={name}
            className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-100 rounded px-1"
          >
            <input
              type="checkbox"
              checked={visibility[name]}
              onChange={() => handleToggle(name)}
              className="rounded"
            />
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-600">
              {label}
              <span className="text-gray-400 ml-1">({counts[name]})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};
