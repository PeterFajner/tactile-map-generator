import type { AssembledScene, LayerName } from "../../types/scene";

/** Flat arrays representing a triangle mesh */
export type RawMesh = {
  /** Flat vertex positions [x0,y0,z0, x1,y1,z1, ...] in mm */
  vertices: number[];
  /** Triangle indices [v0,v1,v2, ...] three per triangle */
  triangles: number[];
};

/** Material definition for 3MF export */
export type MaterialDef = {
  name: string;
  color: string; // hex e.g. "#404040"
};

/** One layer's mesh data + material for multi-part 3MF */
export type LayerMesh = {
  mesh: RawMesh;
  material: MaterialDef;
};

/**
 * Quantise a float to a grid key for vertex deduplication.
 * Uses 4 decimal places (~0.1 micron) — more than enough for 3D printing.
 */
const vertexKey = (x: number, y: number, z: number): string =>
  `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;

/**
 * Extract one RawMesh per visible layer from an AssembledScene.
 * Within each layer, duplicate vertices are merged so that adjacent
 * faces share edge indices — producing a manifold mesh that slicers
 * accept without "open edges" warnings.
 *
 * Coordinates are shifted so the SW corner is at the origin
 * (non-negative coords for 3MF compatibility).
 */
export const extractLayerMeshes = (
  scene: AssembledScene,
  visibleLayers: Set<LayerName>,
): LayerMesh[] => {
  const shiftX = scene.plateWidthMm / 2;
  const shiftY = scene.plateHeightMm / 2;
  const result: LayerMesh[] = [];

  for (const layer of scene.layers) {
    if (!visibleLayers.has(layer.name)) continue;

    const nonEmptyGeos = layer.geometries.filter(
      (g) => g.getAttribute("position") !== null,
    );
    if (nonEmptyGeos.length === 0) continue;

    const vertices: number[] = [];
    const triangles: number[] = [];
    const vertexMap = new Map<string, number>();

    const addVertex = (x: number, y: number, z: number): number => {
      const key = vertexKey(x, y, z);
      const existing = vertexMap.get(key);
      if (existing !== undefined) return existing;

      const idx = vertices.length / 3;
      vertices.push(x, y, z);
      vertexMap.set(key, idx);
      return idx;
    };

    for (const geo of nonEmptyGeos) {
      const posAttr = geo.getAttribute("position");
      const posArray = posAttr.array as Float32Array;
      const vertexCount = posAttr.count;

      // Build a local-to-deduped index map for this geometry
      const remap = new Uint32Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) {
        remap[i] = addVertex(
          posArray[i * 3] + shiftX,
          posArray[i * 3 + 1] + shiftY,
          posArray[i * 3 + 2],
        );
      }

      const index = geo.getIndex();
      if (index) {
        const indexArray = index.array;
        for (let i = 0; i < index.count; i += 3) {
          triangles.push(
            remap[indexArray[i]],
            remap[indexArray[i + 1]],
            remap[indexArray[i + 2]],
          );
        }
      } else {
        for (let i = 0; i < vertexCount; i += 3) {
          triangles.push(remap[i], remap[i + 1], remap[i + 2]);
        }
      }
    }

    result.push({
      mesh: { vertices, triangles },
      material: { name: layer.label, color: layer.color },
    });
  }

  return result;
};
