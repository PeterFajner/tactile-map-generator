import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useAppStore } from "../../store/app-store";
import type { TactileMapData } from "../../types/map-data";

export type JsonEditorHandle = {
  validate: () => boolean;
  isDirty: boolean;
};

type JsonEditorProps = {
  onDirtyChange?: (dirty: boolean) => void;
};

/**
 * Edit the json pulled from OSM
 */
export const JsonEditor = forwardRef<JsonEditorHandle, JsonEditorProps>(
  ({ onDirtyChange }, ref) => {
    const mapData = useAppStore((s) => s.mapData);
    const setMapData = useAppStore((s) => s.setMapData);
    const resetMapData = useAppStore((s) => s.resetMapData);
    const [jsonText, setJsonText] = useState(() =>
      mapData ? JSON.stringify(mapData, null, 2) : "",
    );
    const [error, setError] = useState<string | null>(null);

    const isDirty = useMemo(
      () => mapData !== null && jsonText !== JSON.stringify(mapData, null, 2),
      [jsonText, mapData],
    );

    useEffect(() => {
      onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const validate = useCallback((): boolean => {
      if (!isDirty) return true;
      try {
        const parsed = JSON.parse(jsonText) as TactileMapData;
        if (!parsed.metadata || !parsed.roads || !parsed.bounds) {
          setError("Missing required fields: metadata, bounds, roads");
          return false;
        }
        setMapData(parsed);
        setError(null);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid JSON");
        return false;
      }
    }, [isDirty, jsonText, setMapData]);

    useImperativeHandle(ref, () => ({ validate, isDirty }), [
      validate,
      isDirty,
    ]);

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

        {/* Reset button */}
        <div className="flex gap-2">
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
  },
);
