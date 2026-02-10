import type { GeometryLayer, LayerName } from "../../types/scene";

type LayerTogglesProps = {
  layers: GeometryLayer[];
  visibility: Record<LayerName, boolean>;
  onToggle: (name: LayerName) => void;
};

/**
 * Toggle features like roads, bike lanes, etc on the 2D feature preview map
 */
export const LayerToggles = ({
  layers,
  visibility,
  onToggle,
}: LayerTogglesProps) => {
  return (
    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 text-sm max-h-[calc(100%-24px)] overflow-y-auto">
      <div className="font-medium text-gray-700 mb-2">Layers</div>
      {layers.map((layer) => (
        <label
          key={layer.name}
          className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-100 rounded px-1"
        >
          <input
            type="checkbox"
            checked={visibility[layer.name]}
            onChange={() => onToggle(layer.name)}
            className="rounded"
          />
          <span
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: layer.color }}
          />
          <span className="text-gray-600">{layer.label}</span>
        </label>
      ))}
    </div>
  );
};
