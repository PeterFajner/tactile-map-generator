import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import {
  assembleScene,
  disposeScene,
} from "../../services/geometry/scene-assembler";
import { useAppStore } from "../../store/app-store";
import type { LayerName } from "../../types/scene";
import { LayerToggles } from "./LayerToggles";

const DEFAULT_VISIBILITY: Record<LayerName, boolean> = {
  basePlate: true,
  roads: true,
  sidewalks: true,
  crossings: true,
  buildings: true,
  curbs: true,
  bikeLanes: true,
  orientationMarker: true,
  trafficSignals: true,
  busStops: true,
  featureSlots: true,
};

/**
 * The 3D visualizer for what we're going to export and print
 */
export const ScenePreview = () => {
  const mapData = useAppStore((s) => s.mapData);
  const [visibility, setVisibility] =
    useState<Record<LayerName, boolean>>(DEFAULT_VISIBILITY);

  const scene = useMemo(() => {
    if (!mapData) return null;
    return assembleScene(mapData);
  }, [mapData]);

  useEffect(() => {
    return () => {
      if (scene) disposeScene(scene);
    };
  }, [scene]);

  const handleToggle = (name: LayerName) => {
    setVisibility((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  if (!scene) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No map data to preview.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{
          position: [0, -120, 150],
          fov: 45,
          near: 0.1,
          far: 1000,
          up: [0, 0, 1],
        }}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, 1);
          camera.lookAt(0, 0, 2);
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[50, -50, 100]} intensity={0.8} />
        <directionalLight position={[-30, 40, 60]} intensity={0.3} />
        <OrbitControls target={[0, 0, 2]} makeDefault />
        {scene.layers.map(
          (layer) =>
            visibility[layer.name] &&
            layer.geometries.map((geo, i) => (
              <mesh key={`${layer.name}-${i}`} geometry={geo}>
                {layer.name === "basePlate" ? (
                  <meshStandardMaterial
                    color={layer.color}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                  />
                ) : (
                  <meshStandardMaterial color={layer.color} />
                )}
              </mesh>
            )),
        )}
      </Canvas>
      <LayerToggles
        layers={scene.layers}
        visibility={visibility}
        onToggle={handleToggle}
      />
    </div>
  );
};
