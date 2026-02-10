import { create } from "zustand";
import type { TactileMapData } from "../types/map-data";

export type AppStep = "select" | "edit" | "preview" | "export";

export type MapSelection = {
  lat: number;
  lng: number;
  radius: number; // meters
};

type AppState = {
  step: AppStep;
  selection: MapSelection | null;
  mapData: TactileMapData | null;
  originalMapData: TactileMapData | null;
  isLoading: boolean;
  error: string | null;

  setStep: (step: AppStep) => void;
  setSelection: (selection: MapSelection) => void;
  setRadius: (radius: number) => void;
  setMapData: (data: TactileMapData) => void;
  setOriginalMapData: (data: TactileMapData) => void;
  resetMapData: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  step: "select",
  selection: null,
  mapData: null,
  originalMapData: null,
  isLoading: false,
  error: null,

  setStep: (step) => set({ step }),
  setSelection: (selection) => set({ selection }),
  setRadius: (radius) =>
    set((state) => ({
      selection: state.selection ? { ...state.selection, radius } : null,
    })),
  setMapData: (data) => set({ mapData: data }),
  setOriginalMapData: (data) => set({ originalMapData: data }),
  resetMapData: () => set((state) => ({ mapData: state.originalMapData })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
