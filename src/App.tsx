import { useCallback, useRef, useState } from "react";
import { ErrorModal } from "./components/ErrorModal";
import {
  JsonEditor,
  type JsonEditorHandle,
} from "./components/json-editor/JsonEditor";
import { Header } from "./components/layout/Header";
import { StepIndicator } from "./components/layout/StepIndicator";
import { MapPicker } from "./components/map-picker/MapPicker";
import { FeatureMap } from "./components/map-viewer/FeatureMap";
import { ScenePreview } from "./components/preview/ScenePreview";
import { fetchAndParseOverpass } from "./services/overpass/client";
import { useAppStore } from "./store/app-store";

const SelectStep = () => {
  const selection = useAppStore((s) => s.selection);
  const setStep = useAppStore((s) => s.setStep);
  const setMapData = useAppStore((s) => s.setMapData);
  const setOriginalMapData = useAppStore((s) => s.setOriginalMapData);
  const isLoading = useAppStore((s) => s.isLoading);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);

  const handleFetch = async () => {
    if (!selection) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAndParseOverpass(
        selection.lat,
        selection.lng,
        selection.radius,
      );
      setMapData(data);
      setOriginalMapData(data);
      setStep("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex-1">
        <MapPicker />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleFetch}
          disabled={!selection || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Fetching..." : "Fetch Data"}
        </button>
      </div>
    </div>
  );
};

const EditStep = () => {
  const setStep = useAppStore((s) => s.setStep);
  const editorRef = useRef<JsonEditorHandle>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [view, setView] = useState<"json" | "map">("map");

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  const handleValidate = () => {
    editorRef.current?.validate();
  };

  const handlePreview = () => {
    if (view === "json") {
      const valid = editorRef.current?.validate() ?? true;
      if (valid) setStep("preview");
    } else {
      setStep("preview");
    }
  };

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium ${
      active
        ? "border-b-2 border-blue-600 text-blue-600"
        : "text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setView("map")}
          className={tabClass(view === "map")}
        >
          Map View
        </button>
        <button
          onClick={() => setView("json")}
          className={tabClass(view === "json")}
        >
          JSON Editor
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "json" ? (
          <JsonEditor ref={editorRef} onDirtyChange={handleDirtyChange} />
        ) : (
          <FeatureMap />
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep("select")}
          className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
        >
          Back
        </button>
        {view === "json" && (
          <button
            onClick={handleValidate}
            disabled={!isDirty}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Validate Changes
          </button>
        )}
        <button
          onClick={handlePreview}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
        >
          Preview 3D
        </button>
      </div>
    </div>
  );
};

const PreviewStep = () => {
  const setStep = useAppStore((s) => s.setStep);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex-1 overflow-hidden rounded border border-gray-300">
        <ScenePreview />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep("edit")}
          className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setStep("export")}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
        >
          Export
        </button>
      </div>
    </div>
  );
};

const ExportStep = () => {
  const setStep = useAppStore((s) => s.setStep);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded border border-gray-300">
        <p className="text-gray-500">3MF Export coming soon...</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep("preview")}
          className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
        >
          Back
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const step = useAppStore((s) => s.step);

  return (
    <div className="h-full flex flex-col bg-white">
      <Header />
      <StepIndicator current={step} />
      <main className="flex-1 overflow-hidden">
        {step === "select" && <SelectStep />}
        {step === "edit" && <EditStep />}
        {step === "preview" && <PreviewStep />}
        {step === "export" && <ExportStep />}
      </main>
      <ErrorModal />
    </div>
  );
};

export default App;
