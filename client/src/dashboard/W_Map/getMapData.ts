import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type {
  AnyObject,
  ValidatedColumnInfo,
  SelectParams,
} from "prostgles-types";
import type { LayerSQL, LayerTable } from "./W_Map";
import type { GeoJSONFeature } from "../Map/DeckGLMap";
import type { DetailedFilterBase } from "../../../../commonTypes/filterUtils";
import type { LinkSyncItem } from "../Dashboard/dashboardUtils";

export const WITH_LAST_SELECT_ALIAS = "prostgles_chart_data";
const rowHashQuery =
  `md5(((${WITH_LAST_SELECT_ALIAS}.*))::text) as "$rowhash"` as const;
const getSQLQuery = ({
  sql,
  withStatement,
  limit,
  whereClause = "",
  selectList,
}: Pick<LayerSQL, "sql" | "withStatement"> & {
  selectList: string;
  whereClause?: string;
  limit?: number;
}) => {
  const limitQuery = Number.isInteger(limit) ? ` LIMIT ${limit} ` : "";
  return `
    ${withStatement}
    SELECT 
      ${selectList}
      , ST_AsGeoJSON(ST_SetSRID(\${geomColumn:name}, 4326))::json as l 
    FROM (
      ${sql}
    ) prostgles_chart_data
    ${whereClause}
    ${limitQuery}
  `;
};

export const MAP_SELECT_COLUMNS = {
  geoJson: "l",
  idObj: "i",
  props: "p",
} as const;
export type MapDataResult = {
  l: AnyObject;
  i: AnyObject | string;
};

export const getSQLData = async (
  layer: LayerSQL,
  db: DBHandlerClient,
  AGG_LIMIT: number,
): Promise<{ $rowhash: string; l: AnyObject }[]> => {
  const { parameters, geomColumn } = layer;

  const query = getSQLQuery({
    ...layer,
    selectList: [
      rowHashQuery,
      "ST_AsGeoJSON(ST_SetSRID(${geomColumn:name}, 4326))::json as l",
    ].join(", "),
    limit: AGG_LIMIT,
  });

  const result = (await db.sql!(
    query,
    { ...parameters, geomColumn },
    { returnType: "rows" },
  )) as any;

  return result;
};

export const getMapSelect = (
  { geomColumn, linkId }: Pick<LayerTable, "geomColumn" | "linkId">,
  columns: ValidatedColumnInfo[],
  myLinks: LinkSyncItem[],
) => {
  const idColumns = columns.filter((c) => c.is_pkey).map((c) => c.name);
  const link = myLinks.find((l) => l.id === linkId);
  const opts = link?.options;
  const select = {
    [MAP_SELECT_COLUMNS.idObj]:
      idColumns.length ?
        { $jsonb_build_object: idColumns }
      : { $md5_multi: [geomColumn] },
    [MAP_SELECT_COLUMNS.geoJson]: { $ST_AsGeoJSON: [geomColumn] },
    ...(opts?.type === "map" && opts.mapShowText?.columnName ?
      {
        [MAP_SELECT_COLUMNS.props]: {
          $jsonb_build_object: [opts.mapShowText.columnName],
        },
      }
    : {}),
  } as const satisfies SelectParams["select"];

  return select;
};
export const getMapFilter = (
  lt: Pick<LayerTable, "geomColumn" | "linkId">,
  columns: ValidatedColumnInfo[],
  fProps: GeoJSONFeature["properties"],
  myLinks: LinkSyncItem[],
) => {
  const select = getMapSelect(lt, columns, myLinks);
  if (fProps.type !== "table") {
    console.error("Only table type is supported");
    return undefined;
  }
  if (select.i.$jsonb_build_object) {
    const filterValue = fProps.i;
    return {
      filterValue,
      detailedFilter: Object.entries(filterValue).map(([fieldName, value]) => ({
        fieldName,
        value,
      })) satisfies DetailedFilterBase[],
    };
  }
  const filterValue = {
    $filter: [select.i, "=", fProps.i],
  };

  return {
    filterValue,
    detailedFilter: [
      {
        fieldName: "i",
        type: "=",
        value: fProps.i,
        complexFilter: {
          type: "$filter",
          leftExpression: select.i as any,
        },
      },
    ] satisfies DetailedFilterBase[],
  };
};

export const getSQLHoverRow = async (
  q: LayerSQL,
  db: DBHandlerClient,
  $rowhash: string,
): Promise<{ $rowhash: string; d: AnyObject } | undefined> => {
  const { parameters, geomColumn } = q;

  const query = getSQLQuery({
    ...q,
    selectList: [
      rowHashQuery,
      `row_to_json((${WITH_LAST_SELECT_ALIAS}.*)) as d`,
    ].join(", "),
    whereClause: `WHERE "$rowhash" = \${$rowhash} `,
  });
  return (await db.sql!(
    query,
    { ...parameters, geomColumn, $rowhash },
    { returnType: "row" },
  )) as any;
};
