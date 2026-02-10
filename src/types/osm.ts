export type OsmNode = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

export type OsmWay = {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};

export type OsmRelation = {
  type: "relation";
  id: number;
  members: {
    type: "node" | "way" | "relation";
    ref: number;
    role: string;
  }[];
  tags?: Record<string, string>;
};

export type OsmElement = OsmNode | OsmWay | OsmRelation;

export type OverpassResponse = {
  version: number;
  generator: string;
  osm3s: { timestamp_osm_base: string };
  elements: OsmElement[];
};
