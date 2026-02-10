import type { AppStep } from "../../store/app-store";

const STEPS: { key: AppStep; label: string }[] = [
  { key: "select", label: "1. Select Location" },
  { key: "edit", label: "2. Edit Data" },
  { key: "preview", label: "3. Preview" },
  { key: "export", label: "4. Export" },
];

const stepOrder: AppStep[] = ["select", "edit", "preview", "export"];

/**
 * Simple component to display the current generation step we're on in a nice way
 */
export const StepIndicator = ({ current }: { current: AppStep }) => {
  const currentStepIndex = stepOrder.indexOf(current);

  return (
    <nav className="flex gap-1 px-6 py-2 bg-gray-100 border-b border-gray-200">
      {STEPS.map((s, i) => {
        const isActive = s.key === current;
        const isPast = i < currentStepIndex;
        return (
          <div
            key={s.key}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isActive
                ? "bg-blue-600 text-white"
                : isPast
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-200 text-gray-500"
            }`}
          >
            {s.label}
          </div>
        );
      })}
    </nav>
  );
};
