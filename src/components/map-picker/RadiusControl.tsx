type Props = {
  radius: number;
  onChange: (radius: number) => void;
};

/**
 * Set the radius of the selection circle
 */
export const RadiusControl = ({ radius, onChange }: Props) => {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Radius: {radius}m
      </label>
      <input
        type="range"
        min={50}
        max={500}
        step={10}
        value={radius}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
    </div>
  );
};
