import type { MVTLayerProps } from "deck.gl";
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

export const MVT_COLORS = new Map<string, [number, number, number]>([
  ["water_polygons", [132, 169, 201]],
  ["ocean", [119, 159, 193]],
  ["pier_polygons", [170, 178, 186]],
  ["dam_polygons", [145, 149, 154]],

  ["sites", [154, 196, 132]],
  ["land", [232, 229, 214]],

  ["buildings", [201, 194, 184]],
  ["bridges", [150, 146, 138]],
  ["street_polygons", [224, 219, 210]],

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
  motorway: [214, 157, 91],
  trunk: [206, 168, 104],
  primary: [198, 176, 118],
  secondary: [188, 178, 136],
  tertiary: [180, 176, 148],
  unclassified: [160, 156, 148],
  residential: [160, 156, 148],
  living_street: [154, 160, 150],
  service: [150, 146, 140],
  pedestrian: [168, 162, 156],
  track: [138, 130, 118],
  footway: [142, 136, 128],
  steps: [142, 136, 128],
  path: [142, 136, 128],
  cycleway: [118, 146, 132],
  runway: [150, 150, 142],
  taxiway: [162, 160, 152],
};

export const getFillColor: MVTLayerProps["getFillColor"] = (f) => {
  const { layerName, kind } = f.properties as MVTFeatureProps;

  if (!layerName) return [240, 240, 240];

  if (layerName === "land") {
    if (GREEN_LAND_KINDS.has(kind ?? "")) return [154, 196, 132];
    if (WET_LAND_KINDS.has(kind ?? "")) return [142, 173, 150];
    if (DRY_LAND_KINDS.has(kind ?? "")) return [222, 210, 170];
    if (URBAN_LAND_KINDS.has(kind ?? "")) return [223, 218, 206];
    return [232, 229, 214];
  }

  if (layerName === "sites") {
    if (kind === "parking" || kind === "bicycle_parking")
      return [211, 206, 196];
    if (kind === "construction") return [206, 188, 162];
    return [190, 210, 176];
  }

  if (layerName === "water_polygons") {
    if (kind === "glacier") return [220, 233, 242];
    if (kind === "reservoir" || kind === "basin") return [124, 162, 193];
    return [132, 169, 201];
  }

  if (layerName === "pier_polygons") return [170, 178, 186];
  if (layerName === "dam_polygons") return [145, 149, 154];

  return MVT_COLORS.get(layerName) ?? [240, 240, 240];
};

export const getLineColor: MVTLayerProps["getLineColor"] = (f) => {
  const { layerName, kind, bridge, tunnel, rail } =
    f.properties as MVTFeatureProps;

  if (!layerName) return [160, 156, 148];

  if (layerName === "streets") {
    let color: [number, number, number] =
      rail ?
        [132, 130, 126]
      : (ROAD_LINE_COLORS[kind ?? ""] ?? [160, 156, 148]);

    if (bridge) color = shade(color, -18);
    if (tunnel) color = shade(color, 14);

    return color;
  }

  if (layerName === "street_polygons") {
    if (kind === "runway") return [150, 150, 142];
    if (kind === "taxiway") return [162, 160, 152];
    if (kind === "pedestrian") return [168, 162, 156];
    return [176, 170, 160];
  }

  if (layerName === "bridges") return [130, 126, 120];

  if (
    layerName === "water_polygons" ||
    layerName === "water_lines" ||
    layerName === "ocean" ||
    layerName === "ferries"
  ) {
    return [110, 145, 175];
  }

  if (layerName === "pier_polygons" || layerName === "pier_lines") {
    return [145, 151, 158];
  }

  if (layerName === "dam_polygons" || layerName === "dam_lines") {
    return [121, 126, 132];
  }

  if (layerName === "boundaries") return [150, 146, 140];
  if (layerName === "aerialways") return [122, 118, 112];

  const base = MVT_COLORS.get(layerName);
  return base ? shade(base, -28) : [160, 156, 148];
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

  if (layerName === "streets_polygons_labels") {
    if ((kind === "runway" || kind === "taxiway") && name) return name;
    return "";
  }

  if (layerName === "addresses") {
    return "";
  }

  return "";
};

export const getText: MVTLayerProps["getText"] = (f) => {
  return getLabelText(f.properties as MVTFeatureProps);
};

export const getTextColor: MVTLayerProps["getTextColor"] = (f) => {
  const layerName = (f.properties as { layerName?: string }).layerName;
  if (!layerName) return [96, 92, 86];
  return MVT_COLORS.get(layerName) ?? [96, 92, 86];
};

export const getTextSize: MVTLayerProps["getTextSize"] = (f) => {
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
  if (layerName === "streets_polygons_labels") return 11;

  return 0;
};

export const getPointRadius: MVTLayerProps["getPointRadius"] = (f) => {
  const props = f.properties as MVTFeatureProps;
  return getLabelText(props) ? 0 : 2;
};
