import { bboxFromCenter, bboxToOverpass } from "../../utils/geo";

export const buildOverpassQuery = (
  lat: number,
  lng: number,
  radiusMetres: number,
): string => {
  const bbox = bboxFromCenter(lat, lng, radiusMetres);
  const bb = bboxToOverpass(bbox);

  return `[out:json][timeout:30];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|living_street)$"](${bb});
  way["highway"="footway"](${bb});
  way["footway"="sidewalk"](${bb});
  node["highway"="crossing"](${bb});
  way["highway"="crossing"](${bb});
  node["crossing"](${bb});
  node["highway"="traffic_signals"](${bb});
  node["barrier"="kerb"](${bb});
  node["kerb"](${bb});
  node["highway"="bus_stop"](${bb});
  way["cycleway"](${bb});
  way["highway"="cycleway"](${bb});
  way["building"](${bb});
  relation["building"](${bb});
);
out body;
>;
out skel qt;`;
};
