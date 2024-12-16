import { cachedSvgs } from "../../components/SvgIcon";
import type { LinkSyncItem } from "../Dashboard/dashboardUtils";
import type {
  DeckGlColor,
  GeoJSONFeature,
  GeoJsonLayerProps,
} from "../Map/DeckGLMap";
import { blend } from "../W_Table/colorBlend";
import { asRGB } from "../W_Table/ColumnMenu/ColorPicker";
import { MAP_SELECT_COLUMNS } from "./getMapData";
import type { ClickedItem, LayerQuery } from "./W_Map";

export const rgbaToString = (rgba: DeckGlColor) => {
  const [r, g, b, a = 1] = rgba.map((v) => (Number.isInteger(v) ? v : 1));
  const alpha = a > 1 ? a / 255 : a;
  return `rgba(${[r, g, b, alpha]})`;
};

const parseFeatureColor = (
  f: GeoJSONFeature,
  link: LinkSyncItem | undefined,
  { geomColumn }: LayerQuery,
): DeckGlColor | undefined => {
  if (!link) return;
  const opts = link.options;
  if (opts.type !== "map") return;
  const { mapColorMode, columns } = opts;
  const colorArr = columns.find((c) => c.name === geomColumn)?.colorArr;
  if (!mapColorMode) return colorArr as DeckGlColor;
  if (mapColorMode.type === "fixed")
    return mapColorMode.colorArr as DeckGlColor;
  if (mapColorMode.type === "conditional") {
    const { columnName, conditions } = mapColorMode;
    const val = f.properties[columnName];
    const condition = conditions.find((c) => c.value === val);
    return condition?.colorArr as DeckGlColor;
  }

  const { minColorArr, maxColorArr, max, min, columnName } = mapColorMode;
  const val = f.properties[columnName];
  if ([val, max, min].every((v) => Number.isFinite(v))) {
    const perc = (val - min) / (max - min);
    const minColor = rgbaToString(minColorArr as DeckGlColor);
    const maxColor = rgbaToString(maxColorArr as DeckGlColor);
    const color = blend(minColor, maxColor, perc);
    return asRGB(color);
  }
};

export const getMapFeatureStyle = (
  layerQuery: LayerQuery,
  clickedItem: ClickedItem | undefined,
  links: LinkSyncItem[],
): Pick<
  GeoJsonLayerProps,
  "getFillColor" | "getLineColor" | "getText" | "getTextSize" | "getIcon"
> => {
  const getIsClickedFeature = (f: GeoJSONFeature) => {
    return (
      clickedItem &&
      "type" in f.properties &&
      ((f.properties.type === "sql" &&
        clickedItem.properties.$rowhash &&
        f.properties.$rowhash === clickedItem.properties.$rowhash) ||
        (f.properties.type === "table" &&
          clickedItem.properties.i &&
          f.properties.i === clickedItem.properties.i))
    );
  };
  const { linkId } = layerQuery;
  const link = links.find((l) => l.id === linkId);
  const opts = link?.options;
  if (!opts || opts.type !== "map") {
    throw new Error("Invalid map link type");
  }

  const { mapIcons, mapShowText } = opts;

  return {
    getFillColor: (f) => {
      /** TODO maybe color items based on any table styled columns  
          let fill = fillColor;
          if(!willAggregate && sourceW.table_name && sourceW.columns){
            const styledCols = sourceW.columns.filter(c => c.style?.type && c.style?.type !== "None");

          }
        */
      if (getIsClickedFeature(f)) {
        return [0, 0, 0, 255] as DeckGlColor;
      }
      const fillColor =
        parseFeatureColor(f, link, layerQuery) || layerQuery.fillColor;
      if (f.geometry.type.includes("Polygon")) {
        return fillColor.slice(0, 3).concat([200]) as DeckGlColor;
      }
      return fillColor;
    },
    getLineColor: (f) => {
      const lineColor =
        parseFeatureColor(f, link, layerQuery) || layerQuery.lineColor;
      if (getIsClickedFeature(f)) {
        return [0, 0, 0, 255] as DeckGlColor;
      }
      return lineColor;
    },
    getText:
      mapShowText ?
        (f) => {
          const { columnName } = mapShowText;
          return (
            f.properties[MAP_SELECT_COLUMNS.props]?.[columnName]?.toString() ??
            ""
          );
        }
      : undefined,
    getTextSize:
      mapShowText ?
        (f) => {
          const { columnName } = mapShowText;
          const txt = `${f.properties[MAP_SELECT_COLUMNS.props]?.[columnName]?.toString() ?? ""}`;
          return 12; // txt.length * 4;
        }
      : undefined,
    getIcon:
      !mapIcons ? undefined : (
        (f) => {
          const icon =
            mapIcons.type === "fixed" ?
              mapIcons.iconPath
            : (mapIcons.conditions.find(
                (c) => c.value === f.properties[mapIcons.columnName],
              )?.iconPath ?? "");
          const iconPath = `/icons/${icon}.svg`;
          const rawSvg = cachedSvgs.get(iconPath) ?? "";
          const lineColor =
            parseFeatureColor(f, link, layerQuery) || layerQuery.lineColor;
          const svg = rawSvg.replace(
            "<svg ",
            `<svg width="24" height="24" style="color:${rgbaToString(lineColor)};" `,
          );
          return {
            url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
            width: 24,
            height: 24,
          };
        }
      ),
  };
};
