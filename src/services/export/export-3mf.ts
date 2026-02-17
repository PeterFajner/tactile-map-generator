import JSZip from "jszip";
import {
  assembleScene,
  disposeScene,
} from "../geometry/scene-assembler";
import type { TactileMapData } from "../../types/map-data";
import type { LayerName } from "../../types/scene";
import {
  buildContentTypesXml,
  buildModelXml,
  buildRelsXml,
} from "./build-3mf-xml";
import { extractLayerMeshes } from "./geometry-to-mesh";

export type ExportStage =
  | "assembling"
  | "extracting"
  | "building-xml"
  | "zipping"
  | "done";

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Full 3MF export pipeline:
 * assemble scene → extract per-layer meshes → build XML → zip → download
 */
export const export3mf = async (
  mapData: TactileMapData,
  visibleLayers: Set<LayerName>,
  filename: string,
  onProgress?: (stage: ExportStage) => void,
): Promise<void> => {
  onProgress?.("assembling");
  const scene = assembleScene(mapData);

  try {
    onProgress?.("extracting");
    const layerMeshes = extractLayerMeshes(scene, visibleLayers);

    onProgress?.("building-xml");
    const modelXml = buildModelXml(layerMeshes);
    const contentTypesXml = buildContentTypesXml();
    const relsXml = buildRelsXml();

    onProgress?.("zipping");
    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.file("_rels/.rels", relsXml);
    zip.file("3D/3dmodel.model", modelXml);

    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, filename);

    onProgress?.("done");
  } finally {
    disposeScene(scene);
  }
};
