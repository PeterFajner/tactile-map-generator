type Props = {
  radius: number;
  onChange: (radius: number) => void;
};

/**
 * Set the area of the selection square (slider controls half-width,
 * displayed as full side length × side length)
 */
export const RadiusControl = ({ radius, onChange }: Props) => {
  const side = radius * 2;
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Area: {side} × {side} m
      </label>
      <input
        type="range"
        min={20}
        max={150}
        step={5}
        value={radius}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
    </div>
  );
};
