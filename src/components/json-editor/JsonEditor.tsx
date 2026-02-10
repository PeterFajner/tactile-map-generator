import { useCallback, useState } from "react";
import { useAppStore } from "../../store/app-store";
import type { TactileMapData } from "../../types/map-data";

/**
 * Edit the json pulled from OSM
 */
export const JsonEditor = () => {
  const mapData = useAppStore((s) => s.mapData);
  const setMapData = useAppStore((s) => s.setMapData);
  const resetMapData = useAppStore((s) => s.resetMapData);
  const [jsonText, setJsonText] = useState(() =>
    mapData ? JSON.stringify(mapData, null, 2) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleApply = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText) as TactileMapData;
      // basic validation: check that required top-level keys exist
      if (!parsed.metadata || !parsed.roads || !parsed.bounds) {
        setError("Missing required fields: metadata, bounds, roads");
        return;
      }
      setMapData(parsed);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, [jsonText, setMapData]);

  const handleReset = useCallback(() => {
    resetMapData();
    const original = useAppStore.getState().mapData;
    if (original) {
      setJsonText(JSON.stringify(original, null, 2));
    }
    setError(null);
  }, [resetMapData]);

  if (!mapData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data loaded. Go back and fetch data first.
      </div>
    );
  }

  // Summary stats
  const stats = [
    { label: "Roads", count: mapData.roads.length },
    { label: "Sidewalks", count: mapData.sidewalks.length },
    { label: "Crossings", count: mapData.crossings.length },
    { label: "Curbs", count: mapData.curbs.length },
    { label: "Traffic Signals", count: mapData.trafficSignals.length },
    { label: "Bus Stops", count: mapData.busStops.length },
    { label: "Bike Lanes", count: mapData.bikeLanes.length },
    { label: "Buildings", count: mapData.buildings.length },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 text-sm">
        {stats.map((s) => (
          <span key={s.label} className="bg-gray-100 px-2 py-1 rounded">
            {s.label}: <strong>{s.count}</strong>
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          Apply Changes
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
        >
          Reset to Fetched
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* JSON textarea */}
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        className="flex-1 font-mono text-xs p-3 border border-gray-300 rounded resize-none bg-gray-50"
        spellCheck={false}
      />
    </div>
  );
};
