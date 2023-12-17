import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { AnyObject, ValidatedColumnInfo, SelectParams } from "prostgles-types";
import { LayerSQL, LayerTable } from "./W_Map";

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
  // if(!idColumns.length){
  //   idColumns = [geomColumn];
  // }
  return { 
    [MAP_SELECT_COLUMNS.idObj]: idColumns.length? { $jsonb_build_object: idColumns } : { $md5_multi: [geomColumn] }, 
    // [MAP_SELECT_COLUMNS.idObj]: { $jsonb_build_object: idColumns }, 
    [MAP_SELECT_COLUMNS.geoJson]: { $ST_AsGeoJSON: [geomColumn] } 
  } as const satisfies SelectParams["select"] ;
}

export const getSQLHoverRow = async (q: LayerSQL, db: DBHandlerClient, $rowhash: string): Promise<{ $rowhash: string; d: AnyObject } | undefined>  => {

  const { parameters, geomColumn } = q;
  
  const rootQuery = getSQLQuery(q, [rowHashQuery, "row_to_json((t.*)) as d"].join(", "));// + " WHERE \"$rowhash\" = ${$rowhash}"
  const query = `SELECT * FROM (\n ${rootQuery} \n ) tt WHERE "$rowhash" = ` + " ${$rowhash} ";
  return await db.sql!(query, { ...parameters, geomColumn, $rowhash }, { returnType: "row" }) as any;
}