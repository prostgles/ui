import type { AnyObject } from "prostgles-types";
import type { DecKGLMapProps } from "../Map/DeckGLMap";
import type W_Map from "./W_Map";
import { defaultWorldExtent } from "../WindowControls/AddChartLayer";

/**
 *
 * @returns data extent for all given filters except map current extent filter
 */
export const getMapDataExtent: DecKGLMapProps["onGetFullExtent"] =
  async function (this: W_Map, fromUserClick = false) {
    const {
      prgl: { db },
      layerQueries = [],
    } = this.props;

    let minLat,
      minLng,
      maxLat,
      maxLng,
      _xyExtent: { e: string } | AnyObject | undefined;
    for await (const layer of layerQueries) {
      if (layer.type === "osm") {
        return undefined;
      } else if ("tableName" in layer) {
        const { geomColumn, tableName } = layer;
        const { finalFilterWOextent } = this.getFilter(
          layer,
          defaultWorldExtent,
        );
        if (!db[tableName]?.findOne) throw `db.${tableName}.find not allowed`;
        _xyExtent =
          (await db[tableName]?.findOne?.(finalFilterWOextent, {
            select: { e: { $ST_Extent: [geomColumn] } },
          })) ?? [];
      } else {
        if (!db.sql) throw "SQL not allowed";
        const q = this.getSQL(
          layer,
          "ST_Extent(${geomColumn:name}::geometry) as e",
        );
        // console.log( await db.sql(q.sql, q.args, { returnType: "statement" }))
        try {
          _xyExtent =
            (await db.sql(q.sql, q.args, { returnType: "row" })) ?? undefined;
        } catch (error) {
          console.error(error);
        }
      }

      if (!_xyExtent?.e) {
        if (fromUserClick) {
          alert("No data to zoom to");
        }
        // console.error("No extent")
        return undefined;
      }

      const [[_minLat, _minLng], [_maxLat, _maxLng]] =
        _xyExtent.e
          ?.slice(4, -1)
          ?.split(",")
          .map((v) => v.split(" ").map((v) => +v)) ?? [];

      minLat = Math.min(minLat ?? _minLat, _minLat);
      maxLat = Math.max(maxLat ?? _maxLat, _maxLat);
      minLng = Math.min(minLng ?? _minLng, _minLng);
      maxLng = Math.max(maxLng ?? _maxLng, _maxLng);
    }

    if (minLat === undefined) return undefined;

    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
  };
