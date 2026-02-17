import type { LayerMesh, RawMesh } from "./geometry-to-mesh";

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Serialize a RawMesh into <mesh> XML (vertices + triangles) */
const buildMeshXml = (mesh: RawMesh, parts: string[]): void => {
  parts.push("<mesh>");

  parts.push("<vertices>");
  const verts = mesh.vertices;
  for (let i = 0; i < verts.length; i += 3) {
    parts.push(
      `<vertex x="${verts[i].toFixed(4)}" y="${verts[i + 1].toFixed(4)}" z="${verts[i + 2].toFixed(4)}" />`,
    );
  }
  parts.push("</vertices>");

  parts.push("<triangles>");
  const tris = mesh.triangles;
  for (let i = 0; i < tris.length; i += 3) {
    parts.push(
      `<triangle v1="${tris[i]}" v2="${tris[i + 1]}" v3="${tris[i + 2]}" />`,
    );
  }
  parts.push("</triangles>");

  parts.push("</mesh>");
};

const SLIC3RPE_NS = "http://schemas.slic3r.org/3mf/2017/06";

/**
 * Build the main 3MF model XML as a single composite object with
 * per-layer component parts. Includes slic3rpe namespace metadata
 * so PrusaSlicer/BambuStudio recognise it as a native multi-volume
 * object and skip the "multiple objects at different heights" dialog.
 */
export const buildModelXml = (layerMeshes: LayerMesh[]): string => {
  const parts: string[] = [];

  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(
    `<model unit="millimeter" xml:lang="en-US"` +
      ` xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"` +
      ` xmlns:slic3rpe="${SLIC3RPE_NS}">`,
  );

  // PrusaSlicer version marker — tells the slicer this is a known format
  parts.push(
    '<metadata name="slic3rpe:Version3mf" preserve="1">1</metadata>',
  );

  parts.push("<resources>");

  // Base materials (one color per layer)
  parts.push('<basematerials id="1">');
  for (const lm of layerMeshes) {
    parts.push(
      `<base name="${escapeXml(lm.material.name)}" displaycolor="${escapeXml(lm.material.color)}" />`,
    );
  }
  parts.push("</basematerials>");

  // Each layer as a component object with slic3rpe metadata
  for (let i = 0; i < layerMeshes.length; i++) {
    const objectId = i + 2; // id 1 = basematerials
    parts.push(
      `<object id="${objectId}" type="model" pid="1" pindex="${i}">`,
    );
    parts.push("<metadatagroup>");
    parts.push(
      `<metadata name="slic3rpe:name" type="xs:string">${escapeXml(layerMeshes[i].material.name)}</metadata>`,
    );
    parts.push(
      `<metadata name="slic3rpe:extruder" type="xs:string">${Math.min(i + 1, 16)}</metadata>`,
    );
    parts.push("</metadatagroup>");
    buildMeshXml(layerMeshes[i].mesh, parts);
    parts.push("</object>");
  }

  // Top-level composite object that groups all layers
  const compositeId = layerMeshes.length + 2;
  parts.push(`<object id="${compositeId}" type="model">`);
  parts.push("<metadatagroup>");
  parts.push(
    '<metadata name="slic3rpe:name" type="xs:string">Tactile Map</metadata>',
  );
  parts.push("</metadatagroup>");
  parts.push("<components>");
  for (let i = 0; i < layerMeshes.length; i++) {
    parts.push(`<component objectid="${i + 2}" />`);
  }
  parts.push("</components>");
  parts.push("</object>");

  parts.push("</resources>");

  // Build section — single item referencing the composite
  parts.push("<build>");
  parts.push(`<item objectid="${compositeId}" />`);
  parts.push("</build>");
  parts.push("</model>");

  return parts.join("\n");
};

/** Static [Content_Types].xml for the 3MF archive */
export const buildContentTypesXml = (): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />',
    '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />',
    "</Types>",
  ].join("\n");

/** Static _rels/.rels for the 3MF archive */
export const buildRelsXml = (): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />',
    "</Relationships>",
  ].join("\n");
