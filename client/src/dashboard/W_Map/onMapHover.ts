import type { HoverCoords } from "../Map/DeckGLMap";
import type { LayerQuery, LayerSQL } from "./W_Map";
import type W_Map from "./W_Map";
import type { MapDataResult } from "./getMapData";
import { getMapFilter, getSQLHoverRow } from "./getMapData";
import type { AnyObject } from "prostgles-types";
import { isObject } from "prostgles-types";

export type HoveredObject = {
  properties: MapDataResult & {
    geomColumn: string;
    radius: number;
    tableName: string;
    /**
     * Aggregated count
     */
    c?: string;
    layer?: LayerQuery;
  };
};

export async function onMapHover(
  this: W_Map,
  hoverObj?: AnyObject & HoveredObject,
  hoverCoords?: HoverCoords,
) {
  const { prgl, tables } = this.props;
  if (!hoverObj && !this.hovering && !this.state.hoverObj) {
    //  || this.state.clickedItem
    return;
  }

  this.hoveredObj = hoverObj;
  const hoverObjStr = JSON.stringify(hoverObj);
  if (this.hovering) {
    if (this.hovering.hoverObjStr === hoverObjStr) {
      return;
    } else {
      clearTimeout(this.hovering.timeout!);
    }
  }

  /** If no hover then imediatelly remove existing existing hover data */
  if (!hoverObj) {
    this.hovering = undefined;
    this.setState({ hoverObj, hoverCoords, hovData: undefined });

    /** If hovering then wait for the cursor to settle on an object before firing data request */
  } else {
    if ((hoverObj.properties as any)?._is_from_osm === true) {
      this.setState({ hoverObj, hoverCoords, hovData: hoverObj.properties });
      return;
    }

    /** Throttle  */
    this.hovering = {
      hoverObj: { ...hoverObj },
      hoverObjStr,
      timeout: setTimeout(async () => {
        /**
         * Check if not stale hover and set data
         */
        if (
          this.hovering?.hoverObjStr === hoverObjStr &&
          isObject(hoverObj.properties) &&
          hoverObj.properties.layer
        ) {
          const { tableName, i, layer, c } = hoverObj.properties;
          let hovData;
          if (layer.type === "table") {
            if (c) {
              hovData = { Count: c };
            } else if (tableName) {
              const table = tables.find((t) => t.name === tableName);
              if (table) {
                const selectCols = table.columns.filter((c) =>
                  ["geography", "geometry"].includes(c.udt_name),
                );
                if (!selectCols.length) {
                  return;
                }
                const select = selectCols.reduce(
                  (a, v) => ({ ...a, [v.name]: 0 }),
                  {},
                );
                const filter = getMapFilter(
                  layer,
                  table.columns,
                  hoverObj.properties as any,
                  this.props.myLinks,
                )?.filterValue;
                // const filter = selectData.i.$jsonb_build_object? (i as AnyObject) : {
                //   $filter: [
                //     selectData.i,
                //     "=",
                //     i
                //   ]
                // };
                hovData = await prgl.db[tableName]?.findOne?.(filter, {
                  select,
                });
              }
            }
          } else if (i && typeof i === "string") {
            hovData = (await getSQLHoverRow(layer as LayerSQL, prgl.db, i))?.d;
          }
          this.hovering = undefined;

          this.setState({ hoverObj, hoverCoords, hovData });
        }
      }, 300),
    };
  }
}
