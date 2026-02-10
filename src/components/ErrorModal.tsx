import { useAppStore } from "../store/app-store";

export const ErrorModal = () => {
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);

  if (!error) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
      onClick={() => setError(null)}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-sm font-bold">!</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Error</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded font-medium hover:bg-blue-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
