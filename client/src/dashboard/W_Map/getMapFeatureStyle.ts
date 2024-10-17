import type { LinkSyncItem } from "../Dashboard/dashboardUtils";
import type { DeckGlColor, GeoJSONFeature, GeoJsonLayerProps } from "../Map/DeckGLMap";
import { blend } from "../W_Table/colorBlend";
import { asRGB } from "../W_Table/ColumnMenu/ColorPicker";
import { MAP_SELECT_COLUMNS } from "./getMapData";
import type { ClickedItem, LayerQuery } from "./W_Map";

const parseFeatureColor = (f: GeoJSONFeature, link: LinkSyncItem | undefined): DeckGlColor | undefined => {
  if(!link) return;
  const opts = link.options;
  if(opts.type !== "map") return;
  const { mapColorMode, colorArr } = opts;
  if(!mapColorMode) return colorArr as DeckGlColor;
  if(mapColorMode?.type === "fixed") return mapColorMode.colorArr as DeckGlColor;
  if(mapColorMode?.type === "conditional") {
    const { columnName, conditions } = mapColorMode;
    const val = f.properties[columnName];
    const condition = conditions.find(c => c.value === val);
    return condition?.colorArr as DeckGlColor;
  }
  if(mapColorMode?.type === "scale") {
    const { minColorArr, maxColorArr, max, min, columnName } = mapColorMode;
    const val = f.properties[columnName];
    if([val, max, min].every(v => Number.isFinite(v))) {
      const perc = (val - min)/(max - min);
      const minColor = `rgba(${minColorArr.join(",")})`;
      const maxColor = `rgba(${maxColorArr.join(",")})`;
      const color = blend(minColor, maxColor, perc);
      return asRGB(color)
    }
  }
}

export const getMapFeatureStyle = (
  layerQuery: LayerQuery, 
  clickedItem: ClickedItem | undefined, 
  links: LinkSyncItem[]
): Pick<GeoJsonLayerProps, "getFillColor" | "getLineColor" | "getText" | "getTextSize"> => {
  const getIsClickedFeature = (f: GeoJSONFeature) => {
    return clickedItem && 
      "type" in f.properties && (
        f.properties.type === "sql" && clickedItem.properties.$rowhash && f.properties.$rowhash === clickedItem.properties.$rowhash ||
        f.properties.type === "table" && clickedItem.properties.i && f.properties.i === clickedItem.properties.i
      )
  }
  const { linkId } = layerQuery;
  const link = links.find(l => l.id === linkId);
  const opts = link?.options;
  if(!opts || opts.type !== "map") {
    throw new Error("Invalid map link type");
  }
  
  return {
    getFillColor: f => {
        /** TODO maybe color items based on any table styled columns  
          let fill = fillColor;
          if(!willAggregate && sourceW.table_name && sourceW.columns){
            const styledCols = sourceW.columns.filter(c => c.style?.type && c.style?.type !== "None");

          }
        */
      if(getIsClickedFeature(f)){
        return [0,0,0, 255] as DeckGlColor;
      }
      const fillColor = parseFeatureColor(f, link) || layerQuery.fillColor;
      if(f.geometry.type.includes("Polygon")){
        return fillColor.slice(0,3).concat([200]) as DeckGlColor
      }
      return fillColor;
    },
    getLineColor: f => {
      const lineColor = parseFeatureColor(f, link) || layerQuery.lineColor;
      if(getIsClickedFeature(f)){
        return [0,0,0, 255] as DeckGlColor;
      }
      return lineColor;
    },
    getText: opts.mapShowText?  (f => {
      if(!opts.mapShowText) return "";
      const { columnName } = opts.mapShowText;
      return f.properties[MAP_SELECT_COLUMNS.props]?.[columnName]?.toString() ?? "";
    }) : undefined,
    getTextSize: 12,
  };
}