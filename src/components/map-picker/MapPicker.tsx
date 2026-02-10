import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef } from "react";
import {
  Circle,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useAppStore } from "../../store/app-store";
import { LocationSearchBar } from "./LocationSearch";
import { RadiusControl } from "./RadiusControl";

/**
 * Handler to register clicks
 */
const ClickHandler = () => {
  const setSelection = useAppStore((s) => s.setSelection);
  const selection = useAppStore((s) => s.selection);

  useMapEvents({
    click(e) {
      setSelection({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        radius: selection?.radius ?? 150,
      });
    },
  });

  return null;
};

/**
 * Handler to centre click destination
 */
const FlyTo = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (
      prevRef.current &&
      prevRef.current.lat === lat &&
      prevRef.current.lng === lng
    ) {
      return;
    }
    prevRef.current = { lat, lng };
    map.flyTo([lat, lng], 17, { duration: 1 });
  }, [lat, lng, map]);

  return null;
};

export const MapPicker = () => {
  const selection = useAppStore((s) => s.selection);
  const setSelection = useAppStore((s) => s.setSelection);
  const setRadius = useAppStore((s) => s.setRadius);

  const handleSearchSelect = useCallback(
    (lat: number, lng: number) => {
      setSelection({ lat, lng, radius: selection?.radius ?? 150 });
    },
    [setSelection, selection?.radius],
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <LocationSearchBar onSelect={handleSearchSelect} />
      <RadiusControl radius={selection?.radius ?? 150} onChange={setRadius} />
      <div className="flex-1 rounded overflow-hidden border border-gray-300 min-h-[400px]">
        <MapContainer
          center={[44.648, -63.575]} // Halifax
          zoom={15}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler />
          {selection && (
            <>
              <FlyTo lat={selection.lat} lng={selection.lng} />
              <Circle
                center={[selection.lat, selection.lng]}
                radius={selection.radius}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>
      {selection && (
        <div className="text-sm text-gray-600">
          Selected: {selection.lat.toFixed(5)}, {selection.lng.toFixed(5)} |
          Radius: {selection.radius}m
        </div>
      )}
    </div>
  );
};
