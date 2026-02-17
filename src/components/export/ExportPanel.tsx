import { useEffect, useMemo, useState } from "react";
import {
  assembleScene,
  disposeScene,
} from "../../services/geometry/scene-assembler";
import { export3mf, type ExportStage } from "../../services/export";
import { useAppStore } from "../../store/app-store";
import type { LayerName } from "../../types/scene";

const STAGE_LABELS: Record<ExportStage, string> = {
  assembling: "Assembling geometry\u2026",
  extracting: "Extracting mesh data\u2026",
  "building-xml": "Building 3MF XML\u2026",
  zipping: "Compressing archive\u2026",
  done: "Download started!",
};

const defaultFilename = (): string => {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `tactile-map-${date}.3mf`;
};

export const ExportPanel = () => {
  const mapData = useAppStore((s) => s.mapData);
  const [filename, setFilename] = useState(defaultFilename);
  const [stage, setStage] = useState<ExportStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Record<LayerName, boolean>>(
    {} as Record<LayerName, boolean>,
  );

  // Get layer metadata (names, labels, colors, whether they have geometry)
  const layerMeta = useMemo(() => {
    if (!mapData) return [];
    const scene = assembleScene(mapData);
    const meta = scene.layers.map((l) => ({
      name: l.name,
      label: l.label,
      color: l.color,
      hasGeometry: l.geometries.length > 0,
    }));
    disposeScene(scene);
    return meta;
  }, [mapData]);

  // Initialize visibility when layer metadata is available
  useEffect(() => {
    if (layerMeta.length === 0) return;
    setVisibility((prev) => {
      const next = { ...prev };
      for (const l of layerMeta) {
        if (!(l.name in next)) {
          next[l.name] = l.hasGeometry;
        }
      }
      return next;
    });
  }, [layerMeta]);

  const handleToggle = (name: LayerName) => {
    setVisibility((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleExport = async () => {
    if (!mapData) return;
    setError(null);
    setStage("assembling");

    const visibleSet = new Set<LayerName>(
      layerMeta
        .filter((l) => visibility[l.name])
        .map((l) => l.name),
    );

    try {
      await export3mf(mapData, visibleSet, filename, setStage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      setStage(null);
    }
  };

  const isExporting = stage !== null && stage !== "done";

  if (!mapData) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No map data available.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Export as 3MF</h2>

      {/* Filename */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filename
        </label>
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Layer toggles */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">
          Layers to include
        </div>
        <div className="space-y-1">
          {layerMeta.map((l) => (
            <label
              key={l.name}
              className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
                !l.hasGeometry ? "opacity-40" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={visibility[l.name] ?? false}
                onChange={() => handleToggle(l.name)}
                disabled={!l.hasGeometry}
                className="rounded"
              />
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: l.color }}
              />
              <span className="text-sm text-gray-600">{l.label}</span>
              {!l.hasGeometry && (
                <span className="text-xs text-gray-400 ml-auto">empty</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={isExporting || !filename.trim()}
        className="w-full px-6 py-2.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? "Exporting\u2026" : "Download 3MF"}
      </button>

      {/* Status */}
      {stage && (
        <p className="text-sm text-gray-600">{STAGE_LABELS[stage]}</p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
