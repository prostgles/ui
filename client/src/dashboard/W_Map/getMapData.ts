import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject, ValidatedColumnInfo, SelectParams } from "prostgles-types";
import type { LayerSQL, LayerTable } from "./W_Map";
import type { GeoJSONFeature } from "../Map/DeckGLMap";
import type { DetailedFilterBase } from "../../../../commonTypes/filterUtils";

const rowHashQuery = `md5(((t.*))::text) as "$rowhash"` as const;
const getSQLQuery = ({ sql }: LayerSQL, selectList: string, limit?: number) => {

  let _sql = sql.trim()  + "";
  if(_sql.endsWith(";")) _sql = _sql.slice(0, _sql.length - 1);
  const limitQuery = Number.isInteger(limit)? ` LIMIT ${limit} ` : ""; 
  return `
    SELECT ${selectList}, ST_AsGeoJSON(ST_SetSRID(\${geomColumn:name}, 4326))::json as l 
    FROM ( \n ${_sql} \n ) t 
    ${limitQuery}
  `;
}

export const MAP_SELECT_COLUMNS = { 
  geoJson: "l", 
  idObj: "i", 
} as const;
export type MapDataResult = {
  l: AnyObject;
  i: AnyObject | string;
};

export const getSQLData = async (q: LayerSQL, db: DBHandlerClient, AGG_LIMIT: number): Promise<{ $rowhash: string; l: AnyObject }[]> => {

  const { parameters, geomColumn } = q;
  
  const nq = getSQLQuery(q, [rowHashQuery, "ST_AsGeoJSON(ST_SetSRID(${geomColumn:name}, 4326))::json as l"].join(", "), AGG_LIMIT) //"SELECT md5(((t.*))::text) as \"$rowhash\", ST_AsGeoJSON(ST_SetSRID(${geomColumn:name}, 4326))::json as l FROM ( \n" + _sql + "\n ) t LIMIT " + AGG_LIMIT
  return await db.sql!(nq, { ...parameters, geomColumn }, { returnType: "rows" }) as any;
}

export const getMapSelect = ({ geomColumn }: Pick<LayerTable, "geomColumn">, columns: ValidatedColumnInfo[]) => {
  
  const idColumns = columns.filter(c => c.is_pkey).map(c => c.name);
  
  const select = { 
    [MAP_SELECT_COLUMNS.idObj]: idColumns.length? { $jsonb_build_object: idColumns } : { $md5_multi: [geomColumn] },
    [MAP_SELECT_COLUMNS.geoJson]: { $ST_AsGeoJSON: [geomColumn] } 
  } as const satisfies SelectParams["select"];

  return select;
}
export const getMapFilter = ({ geomColumn }: Pick<LayerTable, "geomColumn">, columns: ValidatedColumnInfo[], fProps: GeoJSONFeature["properties"]) => {
  const select = getMapSelect({ geomColumn }, columns);
  if(fProps.type !== "table"){
    console.error("Only table type is supported");
    return undefined;
  }
  if(select.i.$jsonb_build_object){
    const filterValue = fProps.i;
    return {
      filterValue,
      detailedFilter: Object.entries(filterValue)
        .map(([fieldName, value]) => ({ fieldName, value })) satisfies DetailedFilterBase[]
    }
  }
  const filterValue = { 
    $filter: [
      select.i,
      "=",
      fProps.i
    ]
  };
  
  return {
    filterValue,
    detailedFilter: [{
      fieldName: "i",
      type: "=",
      value: fProps.i,
      complexFilter: {
        type: "$filter",
        leftExpression: select.i as any,
      }
    }] satisfies DetailedFilterBase[]
  }
}

export const getSQLHoverRow = async (q: LayerSQL, db: DBHandlerClient, $rowhash: string): Promise<{ $rowhash: string; d: AnyObject } | undefined>  => {

  const { parameters, geomColumn } = q;
  
  const rootQuery = getSQLQuery(q, [rowHashQuery, "row_to_json((t.*)) as d"].join(", "));
  const query = `SELECT * FROM (\n ${rootQuery} \n ) tt WHERE "$rowhash" = \${$rowhash} `;
  return await db.sql!(query, { ...parameters, geomColumn, $rowhash }, { returnType: "row" }) as any;
}