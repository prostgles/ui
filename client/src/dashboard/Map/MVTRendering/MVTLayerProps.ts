import type { MVTLayerProps } from "deck.gl";
import type { Feature } from "geojson";
/**
 * https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt
 */
type MVTFeatureProps = {
  layerName?: string;
  kind?: string;
  bridge?: boolean;
  tunnel?: boolean;
  rail?: boolean;

  name?: string;
  housenumber?: string;
  ref?: string;
  population?: number;
  way_area?: number;
  admin_level?: number;
};

export const MVT_BACKGROUND_COLOR: [number, number, number] = [227, 225, 210];
export const MVT_LABEL_FONT = { family: "Arial, sans-serif", weight: 600 };

export const MVT_COLORS = new Map<string, [number, number, number]>([
  /* Organic Maps' default light palette. */
  ["water_polygons", [139, 211, 224]],
  ["ocean", [139, 211, 224]],
  ["pier_polygons", [170, 178, 186]],
  ["dam_polygons", [145, 149, 154]],

  ["sites", [240, 226, 206]],
  ["land", MVT_BACKGROUND_COLOR],

  ["buildings", [201, 200, 187]],
  ["bridges", [237, 235, 219]],
  ["street_polygons", [224, 216, 190]],

  ["water_polygons_labels", [70, 96, 122]],
  ["place_labels", [88, 84, 78]],
  ["addresses", [110, 106, 100]],
  ["public_transport", [124, 88, 72]],
  ["pois", [140, 96, 78]],
  ["street_labels_points", [96, 92, 86]],
  ["streets_polygons_labels", [96, 92, 86]],
]);

const clamp = (value: number) => Math.max(0, Math.min(255, value));

const shade = (
  [r, g, b]: [number, number, number],
  delta: number,
): [number, number, number] => [
  clamp(r + delta),
  clamp(g + delta),
  clamp(b + delta),
];

const GREEN_LAND_KINDS = new Set([
  "park",
  "garden",
  "grass",
  "meadow",
  "wood",
  "forest",
  "recreation_ground",
  "village_green",
  "allotments",
  "grassland",
  "orchard",
  "vineyard",
  "golf_course",
  "playground",
  "scrub",
  "heath",
  "miniature_golf",
]);

const WET_LAND_KINDS = new Set([
  "swamp",
  "bog",
  "string_bog",
  "wet_meadow",
  "marsh",
]);

const DRY_LAND_KINDS = new Set([
  "sand",
  "beach",
  "shingle",
  "bare_rock",
  "scree",
]);

const URBAN_LAND_KINDS = new Set([
  "residential",
  "industrial",
  "commercial",
  "retail",
  "railway",
  "garages",
  "landfill",
  "brownfield",
  "greenfield",
  "farmyard",
  "farmland",
]);

const ROAD_LINE_COLORS: Record<string, [number, number, number]> = {
  motorway: [255, 115, 38],
  trunk: [255, 122, 38],
  primary: [255, 135, 38],
  secondary: [255, 178, 38],
  tertiary: [247, 247, 247],
  unclassified: [242, 242, 242],
  residential: [242, 242, 242],
  living_street: [242, 242, 242],
  service: [242, 242, 242],
  pedestrian: [242, 242, 242],
  track: [99, 87, 48],
  footway: [242, 242, 242],
  steps: [242, 242, 242],
  path: [160, 80, 18],
  cycleway: [86, 84, 255],
  runway: [212, 191, 242],
  taxiway: [207, 193, 232],
};

export const getFillColor: MVTLayerProps["getFillColor"] = (f) => {
  const { layerName, kind } = f.properties as MVTFeatureProps;

  if (!layerName) return [240, 240, 240];

  if (layerName === "land") {
    if (kind === "forest" || kind === "wood") return [170, 191, 101];
    if (GREEN_LAND_KINDS.has(kind ?? "")) return [188, 200, 126];
    if (WET_LAND_KINDS.has(kind ?? "")) return [112, 147, 165];
    if (kind === "sand" || kind === "beach") return [252, 236, 126];
    if (DRY_LAND_KINDS.has(kind ?? "")) return [217, 210, 191];
    if (URBAN_LAND_KINDS.has(kind ?? "")) return [223, 218, 206];
    return MVT_BACKGROUND_COLOR;
  }

  if (layerName === "sites") {
    if (kind === "parking" || kind === "bicycle_parking")
      return [242, 242, 188];
    if (kind === "hospital") return [248, 217, 217];
    if (kind === "school" || kind === "college" || kind === "university")
      return [248, 228, 186];
    if (kind === "construction") return [206, 188, 162];
    return [240, 226, 206];
  }

  if (layerName === "water_polygons") {
    if (kind === "glacier") return [220, 233, 242];
    return [139, 211, 224];
  }

  if (layerName === "pier_polygons") return [170, 178, 186];
  if (layerName === "dam_polygons") return [145, 149, 154];

  return MVT_COLORS.get(layerName) ?? [240, 240, 240];
};

export const getLineColor: MVTLayerProps["getLineColor"] = (f) => {
  const { layerName, kind, bridge, tunnel, rail } =
    f.properties as MVTFeatureProps;

  if (layerName === "buildings") return [161, 160, 150];

  if (layerName === "streets") {
    if (rail && (tunnel || kind === "subway")) return [0, 0, 0, 0];
    let color: [number, number, number] =
      rail ?
        [150, 149, 134]
      : (ROAD_LINE_COLORS[kind ?? ""] ?? [242, 242, 242]);

    if (bridge) color = shade(color, -18);
    if (tunnel) color = shade(color, 14);

    return color;
  }

  if (layerName === "ferries") return [68, 153, 187, 120];

  if (layerName === "water_lines") {
    return [54, 176, 191];
  }

  if (layerName === "pier_lines") {
    return [145, 151, 158];
  }

  if (layerName === "dam_lines") {
    return [121, 126, 132];
  }

  if (layerName === "boundaries") return [150, 146, 140];
  if (layerName === "aerialways") return [122, 118, 112];

  /* Label-placement lines and other polygon borders must stay invisible. */
  return [0, 0, 0, 0];
};

export const getLineWidth: MVTLayerProps["getLineWidth"] = (feature) => {
  const { layerName, kind, rail } = feature.properties as MVTFeatureProps;

  if (layerName === "streets") {
    if (rail) return 2;
    switch (kind) {
      case "motorway":
      case "trunk":
        return 20;
      case "primary":
        return 14;
      case "secondary":
        return 12;
      case "tertiary":
        return 10;
      case "residential":
      case "unclassified":
        return 7;
      case "living_street":
      case "service":
      case "pedestrian":
        return 4;
      case "runway":
        return 40;
      case "taxiway":
        return 15;
      default:
        return 1.5;
    }
  }

  if (layerName === "water_lines") return kind === "river" ? 8 : 2;
  return 1;
};

const POINT_LABEL_LAYERS = new Set([
  "place_labels",
  "water_polygons_labels",
  "boundary_labels",
  "street_labels_points",
  "streets_polygons_labels",
  "addresses",
]);
const IMPORTANT_PLACE_KINDS = new Set([
  "capital",
  "state_capital",
  "city",
  "town",
]);

const getLabelText = (props: MVTFeatureProps) => {
  const {
    layerName,
    kind,
    name,
    housenumber,
    ref,
    population = 0,
    way_area = 0,
    admin_level,
  } = props;

  if (!layerName) return "";

  if (layerName === "addresses") return "";
  if (layerName === "public_transport") {
    if (kind === "station") return name ?? "";
    return "";
  }
  if (layerName === "place_labels") {
    if (kind === "capital" || kind === "state_capital") return name ?? "";
    if (kind === "city" && population >= 100_000) return name ?? "";
    if (kind === "town" && population >= 20_000) return name ?? "";
    return "";
  }

  if (layerName === "water_polygons_labels") {
    if (kind === "ocean") return name ?? "";
    if (kind === "river" && way_area >= 8_000_000) return name ?? "";
    if (kind === "water" && way_area >= 5_000_000) return name ?? "";
    if (kind === "reservoir" && way_area >= 3_000_000) return name ?? "";
    return "";
  }

  if (layerName === "boundary_labels") {
    if (admin_level === 2 && way_area >= 100_000) return name ?? "";
    if (admin_level === 4 && way_area >= 700_000) return name ?? "";
    return "";
  }

  if (layerName === "street_labels_points") {
    return ref?.trim() ? ref : "";
  }
  if (layerName === "street_labels") return name?.trim() ?? "";

  if (layerName === "streets_polygons_labels") {
    if ((kind === "runway" || kind === "taxiway") && name) return name;
    return "";
  }

  if (layerName === "addresses") {
    return "";
  }

  return "";
};

export const getText = (f: Feature) => {
  return getLabelText(f.properties as MVTFeatureProps);
};

export const getTextColor: MVTLayerProps["getTextColor"] = (f) => {
  const layerName = (f.properties as { layerName?: string }).layerName;
  if (!layerName) return [96, 92, 86];
  return MVT_COLORS.get(layerName) ?? [96, 92, 86];
};

export const getTextSize = (f: Feature) => {
  const props = f.properties as MVTFeatureProps;
  const { layerName, kind } = props;

  if (!getLabelText(props)) return 0;

  if (layerName === "place_labels") {
    if (kind === "capital" || kind === "state_capital") return 18;
    if (kind === "city") return 16;
    if (kind === "town") return 14;
  }
  if (layerName === "water_polygons_labels") return 13;
  if (layerName === "boundary_labels") return 12;
  if (layerName === "street_labels_points") return 11;
  if (layerName === "street_labels") return 11;
  if (layerName === "streets_polygons_labels") return 11;
  if (layerName === "public_transport") return 12;

  return 0;
};
