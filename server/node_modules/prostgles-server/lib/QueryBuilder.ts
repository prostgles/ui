
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Stefan L. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { pgp, Filter, LocalParams, isPlainObject, TableHandler, ViewHandler, postgresToTsType } from "./DboBuilder";
import { TableRule } from "./PublishParser";
import { SelectParams, isEmpty, FieldFilter, asName, TextFilter_FullTextSearchFilterKeys, ColumnInfo, PG_COLUMN_UDT_DATA_TYPE, isObject, Select } from "prostgles-types";
import { get } from "./utils";


export type SelectItem = {
  type: "column" | "function" | "aggregation" | "joinedColumn" | "computed";
  getFields: (args?: any[]) => string[] | "*";
  getQuery: (tableAlias?: string) => string;
  columnPGDataType?: string;
  column_udt_type?: PG_COLUMN_UDT_DATA_TYPE;
  // columnName?: string; /* Must only exist if type "column" ... dissalow aliased columns? */
  alias: string;
  selected: boolean;
};

export type NewQuery = {
  allFields: string[];

  /**
   * Contains user selection and all the allowed columns. Allowed columns not selected are marked with  selected: false
   */
  select: SelectItem[];

  table: string;
  where: string;
  orderBy: string[];
  having: string;
  limit: number;
  offset: number;
  isLeftJoin: boolean;
  joins?: NewQuery[];
  tableAlias?: string;
  $path?: string[];
};

export const asNameAlias = (field: string, tableAlias?: string) => {
  let result = asName(field);
  if(tableAlias) return asName(tableAlias) + "." + result;
  return result;
}

export const parseFunctionObject = (funcData: any): { funcName: string; args: any[] } => {
  const makeErr = (msg: string) => `Function not specified correctly. Expecting { $funcName: ["columnName",...] } object but got: ${JSON.stringify(funcData)} \n ${msg}`
  if(!isObject(funcData)) throw makeErr("");
  const keys = Object.keys(funcData);
  if(keys.length !== 1) throw makeErr("");
  const funcName = keys[0];
  const args = funcData[funcName];
  if(!args || !Array.isArray(args)){
    throw makeErr("Arguments missing or invalid");
  }

  return { funcName, args };
}

export const parseFunction = (funcData: { func: string | FunctionSpec, args: any[],  functions: FunctionSpec[]; allowedFields: string[]; }): FunctionSpec => {
  const { func, args, functions, allowedFields } = funcData;

  /* Function is computed column. No checks needed */
  if(typeof func !== "string"){
    const computedCol = COMPUTED_FIELDS.find(c => c.name === func.name);
    if(!computedCol) throw `Unexpected function: computed column spec not found for ${JSON.stringify(func.name)}`;
    return func;
  }

  const funcName = func;
  const makeErr = (msg: string): string => {
    return `Issue with function ${JSON.stringify({ [funcName]: args })}: \n${msg}`
  }

  /* Find function */
  const funcDef = functions.find(f => f.name === funcName);

  if(!funcDef) {
    const sf = functions.filter(f => f.name.toLowerCase().slice(1).startsWith(funcName.toLowerCase())).sort((a, b) => (a.name.length - b.name.length));
    const hint = (sf.length? `. \n Maybe you meant: \n | ${sf.map(s => s.name + " " + (s.description || "")).join("    \n | ")}  ?` : "");
    throw "\n Function " + funcName + " does not exist or is not allowed " + hint;
  }
  
  /* Validate fields */
  const fields = funcDef.getFields(args);
  if(fields !== "*"){
    fields.forEach(fieldKey => {
      if(typeof fieldKey !== "string" || !allowedFields.includes(fieldKey)) {
        throw makeErr(`getFields() => field name ${JSON.stringify(fieldKey)} is invalid or disallowed`)
      }
    });
    if((funcDef.minCols ?? 0) > fields.length){
      throw makeErr(`Less columns provided than necessary (minCols=${funcDef.minCols})`)
    }
  }

  if(funcDef.numArgs && funcDef.minCols !== 0 && fields !== "*" && Array.isArray(fields) && !fields.length) {
    throw `\n Function "${funcDef.name}" expects at least a field name but has not been provided with one`;
  }

  return funcDef;
}


type GetQueryArgs = { 
  allColumns: ColumnInfo[];
  allowedFields: string[];
  args: any[];
  tableAlias?: string;
  ctidField?: string;
};

export type FieldSpec = {
  name: string;
  type: "column" | "computed";
  /**
   * allowedFields passed for multicol functions (e.g.: $rowhash)
   */
  getQuery: (params: Omit<GetQueryArgs, "args">) => string;
};

export type FunctionSpec = {
  name: string;

  description?: string;

  /**
   * If true then it can be used in filters and is expected to return boolean
   */
  canBeUsedForFilter?: boolean;

  /**
   * If true then the first argument is expected to be a column name
   */
  singleColArg: boolean;

  /**
   * If true then this func can be used within where clause
   */
  // returnsBoolean?: boolean;

  /**
   * Number of arguments expected
   */
  numArgs: number;

  /**
   * If provided then the number of column names provided to the function (from getFields()) must not be less than this
   * By default every function is checked against numArgs
   */
  minCols?: number;

  type: "function" | "aggregation" | "computed";
  /**
   * getFields: string[] -> used to validate user supplied field names. It will be fired before querying to validate against allowed columns
   *      if not field names are used from arguments then return an empty array
   */
  getFields: (args: any[]) => "*" | string[];
  /**
   * allowedFields passed for multicol functions (e.g.: $rowhash)
   */
  getQuery: (params: GetQueryArgs) => string;

  returnType?: PG_COLUMN_UDT_DATA_TYPE;
};

const MAX_COL_NUM = 1600;
const asValue = (v: any, castAs: string = "") => pgp.as.format("$1" + castAs, [v]);

const FTS_Funcs: FunctionSpec[] = 
  /* Full text search 
    https://www.postgresql.org/docs/current/textsearch-dictionaries.html#TEXTSEARCH-SIMPLE-DICTIONARY
  */
  [
    "simple", //  • convert the input token to lower case • exclude stop words
    // "synonym", // replace word with a synonym
    "english",
    // "english_stem",
    // "english_hunspell", 
    ""
  ].map(type => ({
    name: "$ts_headline" + (type? ("_" + type) : ""),
    description: ` :[column_name <string>, search_term: <string | { to_tsquery: string } > ] -> sha512 hash of the of column content`,
    type: "function" as "function",
    singleColArg: true,
    numArgs: 2,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allColumns, args, tableAlias }) => {
      const col = asName(args[0]);
      let qVal = args[1], qType = "to_tsquery";
      let _type = type? (asValue(type) + ",") : "";

      const searchTypes = TextFilter_FullTextSearchFilterKeys;
      
      /* { to_tsquery: 'search term' } */
      if(isPlainObject(qVal)){
        const keys = Object.keys(qVal);
        if(!keys.length) throw "Bad arg";
        if(keys.length !==1 || !searchTypes.includes(keys[0] as any)) throw "Expecting a an object with a single key named one of: " + searchTypes.join(", ");
        qType = keys[0];
        qVal = asValue(qVal[qType]);

      /* 'search term' */
      } else if(typeof qVal === "string") {
        qVal = pgp.as.format(qType + "($1)", [qVal])
      } else throw "Bad second arg. Exepcting search string or { to_tsquery: 'search string' }";

      const res =`ts_headline(${_type} ${col}::text, ${qVal}, 'ShortWord=1 ' )`
      // console.log(res)
      
      return res
    }
  }));

let PostGIS_Funcs: FunctionSpec[] = [
    {
      fname: "ST_DWithin",
      description: `:[column_name, { lat?: number; lng?: number; geojson?: object; srid?: number; use_spheroid?: boolean; distance: number; }] 
        -> Returns true if the geometries are within a given distance
        For geometry: The distance is specified in units defined by the spatial reference system of the geometries. For this function to make sense, the source geometries must be in the same coordinate system (have the same SRID).
        For geography: units are in meters and distance measurement defaults to use_spheroid=true. For faster evaluation use use_spheroid=false to measure on the sphere.
      `
    },
    {
      fname: "<->",
      description: `:[column_name, { lat?: number; lng?: number; geojson?: object; srid?: number; use_spheroid?: boolean }] 
        -> The <-> operator returns the 2D distance between two geometries. Used in the "ORDER BY" clause provides index-assisted nearest-neighbor result sets. For PostgreSQL below 9.5 only gives centroid distance of bounding boxes and for PostgreSQL 9.5+, does true KNN distance search giving true distance between geometries, and distance sphere for geographies.`
    },
    { 
      fname: "ST_Distance",
      description: ` :[column_name, { lat?: number; lng?: number; geojson?: object; srid?: number; use_spheroid?: boolean }] 
        -> For geometry types returns the minimum 2D Cartesian (planar) distance between two geometries, in projected units (spatial ref units).
        -> For geography types defaults to return the minimum geodesic distance between two geographies in meters, compute on the spheroid determined by the SRID. If use_spheroid is false, a faster spherical calculation is used.
      `,
    },{ 
      fname: "ST_DistanceSpheroid",
      description: ` :[column_name, { lat?: number; lng?: number; geojson?: object; srid?: number; spheroid?: string; }] -> Returns minimum distance in meters between two lon/lat geometries given a particular spheroid. See the explanation of spheroids given for ST_LengthSpheroid.

      `,
    },{ 
      fname: "ST_DistanceSphere",
      description: ` :[column_name, { lat?: number; lng?: number; geojson?: object; srid?: number }] -> Returns linear distance in meters between two lon/lat points. Uses a spherical earth and radius of 6370986 meters. Faster than ST_DistanceSpheroid, but less accurate. Only implemented for points.`,
    }
  ].map(({ fname, description }) => ({
    name: "$" + fname,
    description,
    type: "function" as "function",
    singleColArg: true,
    numArgs: 1,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allColumns, args, tableAlias }) => {
      const arg2 = args[1],
        mErr = () => { throw `${fname}: Expecting a second argument like: { lat?: number; lng?: number; geojson?: object; srid?: number; use_spheroid?: boolean }` };
      
      if(!isPlainObject(arg2)) mErr();
      const col = allColumns.find(c => c.name === args[0]);
      if(!col) throw new Error("Col not found: " + args[0])

      const { 
        lat, lng, srid = 4326, 
        geojson, text, use_spheroid, 
        distance, spheroid = 'SPHEROID["WGS 84",6378137,298.257223563]',
        debug
      } = arg2;
      let geomQ = "", extraParams = "";
      
      if(typeof text === "string"){
        geomQ = `ST_GeomFromText(${asValue(text)})`;
      } else if([lat, lng].every(v => Number.isFinite(v))){
        geomQ = `ST_Point(${asValue(lng)}, ${asValue(lat)})`;
      } else if(isPlainObject(geojson)){
        geomQ = `ST_GeomFromGeoJSON(${geojson})`;
      } else mErr();

      if(Number.isFinite(srid)){
        geomQ = `ST_SetSRID(${geomQ}, ${asValue(srid)})`;
      }

      let colCast = "";
      const colIsGeog = col.udt_name === "geography";
      let geomQCast = colIsGeog? "::geography" : "::geometry";

      /**
       * float ST_Distance(geometry g1, geometry g2);
       * float ST_Distance(geography geog1, geography geog2, boolean use_spheroid=true);
       */
      if(fname === "ST_Distance"){

        if(typeof use_spheroid === "boolean"){
          extraParams = ", " + asValue(use_spheroid);
        }

        colCast = (colIsGeog || use_spheroid)? "::geography" : "::geometry";
        geomQCast = (colIsGeog || use_spheroid)? "::geography" : "::geometry";

      /**
       * boolean ST_DWithin(geometry g1, geometry g2, double precision distance_of_srid);
       * boolean ST_DWithin(geography gg1, geography gg2, double precision distance_meters, boolean use_spheroid = true);
       */
      } else if(fname === "ST_DWithin"){
        colCast = colIsGeog? "::geography" : "::geometry";
        geomQCast = colIsGeog? "::geography" : "::geometry";
        
        if(typeof distance !== "number") throw `ST_DWithin: distance param missing or not a number`;
        extraParams = ", " + asValue(distance);


      /**
       * float ST_DistanceSpheroid(geometry geomlonlatA, geometry geomlonlatB, spheroid measurement_spheroid);
       */
      } else if(fname === "ST_DistanceSpheroid"){
        colCast = "::geometry";
        geomQCast = "::geometry";
        if(typeof spheroid !== "string") throw `ST_DistanceSpheroid: spheroid param must be string`;
        extraParams = `, ${asValue(spheroid)}`



      /**
       * float ST_DistanceSphere(geometry geomlonlatA, geometry geomlonlatB);
       */
      } else if(fname === "ST_DistanceSphere"){
        colCast = "::geometry";
        geomQCast = "::geometry";
        extraParams = "";

      /**
       * double precision <->( geometry A , geometry B );
       * double precision <->( geography A , geography B );
       */
      } else if(fname === "<->"){
        colCast = colIsGeog? "::geography" : "::geometry";
        geomQCast = colIsGeog? "::geography" : "::geometry";
        const q = pgp.as.format(`${asNameAlias(args[0], tableAlias)}${colCast} <-> ${geomQ}${geomQCast}`);
        if(debug) throw q;
        return q;
      }
      const q = pgp.as.format(`${fname}(${asNameAlias(args[0], tableAlias)}${colCast} , ${geomQ}${geomQCast} ${extraParams})`);
      if(debug) throw q;
      return q;
    }
  }));

  PostGIS_Funcs = PostGIS_Funcs.concat(
    [
      "ST_AsText", "ST_AsEWKT", "ST_AsEWKB", "ST_AsBinary", "ST_AsMVT", "ST_AsMVTGeom", 
      "ST_AsGeoJSON", "ST_Simplify",
      "ST_SnapToGrid", 
    ]
    .map(fname => {
      const res: FunctionSpec = {
        name: "$" + fname,
        description: ` :[column_name, precision?] -> json GeoJSON output of a geometry column`,
        type: "function",
        singleColArg: true,
        numArgs: 1,
        getFields: (args: any[]) => [args[0]],
        getQuery: ({ allowedFields, args, tableAlias }) => {
          let secondArg = "";
          const otherArgs = args.slice(1);
          if(otherArgs.length) secondArg = ", " + otherArgs.map(arg => asValue(arg)).join(", ");
          const escTabelName = asNameAlias(args[0], tableAlias) + "::geometry";
          let result = pgp.as.format(fname + "(" + escTabelName + secondArg + ( fname === "ST_AsGeoJSON"? ")::jsonb" : ")" ));
          if(fname.startsWith("ST_SnapToGrid") || fname.startsWith("ST_Simplify")){
            let r = `ST_AsGeoJSON(${result})::jsonb`;
            return r;
          }
          return result;
        }
      }
      return res;
    }),
  );


  PostGIS_Funcs = PostGIS_Funcs.concat(
    ["ST_Extent", "ST_3DExtent", "ST_XMin_Agg", "ST_XMax_Agg", "ST_YMin_Agg", "ST_YMax_Agg", "ST_ZMin_Agg", "ST_ZMax_Agg"]
    .map(fname => {
      const res: FunctionSpec = {
        name: "$" + fname,
        description: ` :[column_name] -> ST_Extent returns a bounding box that encloses a set of geometries. 
          The ST_Extent function is an "aggregate" function in the terminology of SQL. 
          That means that it operates on lists of data, in the same way the SUM() and AVG() functions do.`,
        type: "aggregation",
        singleColArg: true,
        numArgs: 1,
        getFields: (args: any[]) => [args[0]],
        getQuery: ({ allowedFields, args, tableAlias }) => {
          const escTabelName = asNameAlias(args[0], tableAlias) + "::geometry";
          if(fname.includes("Extent")){
            return `${fname}(${escTabelName})`;
          }
          return `${fname.endsWith("_Agg")? fname.slice(0, -4) : fname}(ST_Collect(${escTabelName}))`;
        }
      }
      return res;
    }),
  );
  
/**
* Each function expects a column at the very least
*/
export const FUNCTIONS: FunctionSpec[] = [

  // Hashing
  {
    name: "$md5_multi",
    description: ` :[...column_names] -> md5 hash of the column content`,
    type: "function",
    singleColArg: false,
    numArgs: MAX_COL_NUM,
    getFields: (args: any[]) => args,
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const q = pgp.as.format("md5(" + args.map(fname => "COALESCE( " + asNameAlias(fname, tableAlias) + "::text, '' )" ).join(" || ") + ")");
      return q
    }
  },
  {
    name: "$md5_multi_agg",
    description: ` :[...column_names] -> md5 hash of the string aggregation of column content`,
    type: "aggregation",
    singleColArg: false,
    numArgs: MAX_COL_NUM,
    getFields: (args: any[]) => args,
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const q = pgp.as.format("md5(string_agg(" + args.map(fname => "COALESCE( " + asNameAlias(fname, tableAlias) + "::text, '' )" ).join(" || ") + ", ','))");
      return q
    }
  },

  {
    name: "$sha256_multi",
    description: ` :[...column_names] -> sha256 hash of the of column content`,
    type: "function",
    singleColArg: false,
    numArgs: MAX_COL_NUM,
    getFields: (args: any[]) => args,
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const q = pgp.as.format("encode(sha256((" + args.map(fname => "COALESCE( " + asNameAlias(fname, tableAlias) + ", '' )" ).join(" || ") + ")::text::bytea), 'hex')");
      return q
    }
  },
  {
    name: "$sha256_multi_agg",
    description: ` :[...column_names] -> sha256 hash of the string aggregation of column content`,
    type: "aggregation",
    singleColArg: false,
    numArgs: MAX_COL_NUM,
    getFields: (args: any[]) => args,
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const q = pgp.as.format("encode(sha256(string_agg(" + args.map(fname => "COALESCE( " + asNameAlias(fname, tableAlias) + ", '' )" ).join(" || ") + ", ',')::text::bytea), 'hex')");
      return q
    }
  },
  {
    name: "$sha512_multi",
    description: ` :[...column_names] -> sha512 hash of the of column content`,
    type: "function",
    singleColArg: false,
    numArgs: MAX_COL_NUM,
    getFields: (args: any[]) => args,
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const q = pgp.as.format("encode(sha512((" + args.map(fname => "COALESCE( " + asNameAlias(fname, tableAlias) + ", '' )" ).join(" || ") + ")::text::bytea), 'hex')");
      return q
    }
  },
  {
    name: "$sha512_multi_agg",
    description: ` :[...column_names] -> sha512 hash of the string aggregation of column content`,
    type: "aggregation",
    singleColArg: false,
    numArgs: MAX_COL_NUM,
    getFields: (args: any[]) => args,
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const q = pgp.as.format("encode(sha512(string_agg(" + args.map(fname => "COALESCE( " + asNameAlias(fname, tableAlias) + ", '' )" ).join(" || ") + ", ',')::text::bytea), 'hex')");
      return q
    }
  },

  ...FTS_Funcs,

  ...PostGIS_Funcs,

  {
    name: "$left",
    description: ` :[column_name, number] -> substring`,
    type: "function",
    numArgs: 2,
    singleColArg: false,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      return pgp.as.format("LEFT(" + asNameAlias(args[0], tableAlias) + ", $1)", [args[1]]);
    }
  },
  {
    name: "$unnest_words",
    description: ` :[column_name] -> Splits string at spaces`,
    type: "function",
    numArgs: 1,
    singleColArg: true,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      return pgp.as.format("unnest(string_to_array(" + asNameAlias(args[0], tableAlias) + "::TEXT , ' '))");//, [args[1]]
    }
  },
  {
    name: "$right",
    description: ` :[column_name, number] -> substring`,
    type: "function",
    numArgs: 2,
    singleColArg: false,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      return pgp.as.format("RIGHT(" + asNameAlias(args[0], tableAlias) + ", $1)", [args[1]]);
    }
  },

  {
    name: "$to_char",
    type: "function",
    description: ` :[column_name, format<string>] -> format dates and strings. Eg: [current_timestamp, 'HH12:MI:SS']`,
    singleColArg: false,
    numArgs: 2,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      if(args.length === 3){
        return pgp.as.format("to_char(" + asNameAlias(args[0], tableAlias) + ", $2, $3)", [args[0], args[1], args[2]]);
      }
      return pgp.as.format("to_char(" + asNameAlias(args[0], tableAlias) + ", $2)", [args[0], args[1]]);
    }
  },

  /**
   * Date trunc utils
   */
  ...[
    "microsecond",
    "millisecond",
    "second",
    "minute",
    "hour",
    "day",
    "week",
    "month",
    "quarter",
    "year",
    "decade",
    "century",
    "millennium"
  ].map(k => ({ val: 0, unit: k  }))
  .concat([
    { val: 6, unit: 'month'  },
    { val: 4, unit: 'month'  },
    { val: 2, unit: 'month'  },
    { val: 8, unit: 'hour'  },
    { val: 4, unit: 'hour'  },
    { val: 2, unit: 'hour'  },
    { val: 30, unit: 'minute'  },
    { val: 15, unit: 'minute'  },
    { val: 6, unit: 'minute'  },
    { val: 5, unit: 'minute'  },
    { val: 4, unit: 'minute'  },
    { val: 3, unit: 'minute'  },
    { val: 2, unit: 'minute'  },
    { val: 30, unit: 'second'  },
    { val: 15, unit: 'second'  },
    { val: 10, unit: 'second'  },
    { val: 8, unit: 'second'  },
    { val: 6, unit: 'second'  },
    { val: 5, unit: 'second'  },
    { val: 4, unit: 'second'  },
    { val: 3, unit: 'second'  },
    { val: 2, unit: 'second'  },

    { val: 500, unit: 'millisecond'  },
    { val: 250, unit: 'millisecond'  },
    { val: 100, unit: 'millisecond'  },
    { val: 50, unit: 'millisecond'  },
    { val: 25, unit: 'millisecond'  },
    { val: 10, unit: 'millisecond'  },
    { val: 5, unit: 'millisecond'  },
    { val: 2, unit: 'millisecond'  },
  ]).map(({ val, unit }) => ({
    name: "$date_trunc_" + (val || "") + unit,
    type: "function",
    description: ` :[column_name] -> round down timestamp to closest ${val || ""} ${unit} `,
    singleColArg: true,
    numArgs: 1,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const col = asNameAlias(args[0], tableAlias);
      if(!val) return `date_trunc(${asValue(unit)}, ${col})`;
      const prevInt = {
        month: "year",
        hour: "day",
        minute: "hour",
        second: "minute" 
      };

      let res = `(date_trunc(${asValue(prevInt[unit as "month"] || "hour")}, ${col}) + date_part(${asValue(unit, "::text")}, ${col})::int / ${val} * interval ${asValue(val + " " + unit)})`;
      // console.log(res);
      return res;
    }
  } as FunctionSpec)),

  /* Date funcs date_part */
  ...["date_trunc", "date_part"].map(funcName => ({
    name: "$" + funcName,
    type: "function",
    numArgs: 2,
    description: ` :[unit<string>, column_name] -> ` + (funcName === "date_trunc"? ` round down timestamp to closest unit value. ` : ` extract date unit as float8. ` ) + ` E.g. ['hour', col] `,
    singleColArg: false,
    getFields: (args: any[]) => [args[1]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      return `${funcName}(${asValue(args[0])}, ${asNameAlias(args[1], tableAlias)})`;
    }
  } as FunctionSpec)),

  /* Handy date funcs */
  ...[
    ["date", "YYYY-MM-DD"],
    ["datetime", "YYYY-MM-DD HH24:MI"],
    ["timedate", "HH24:MI YYYY-MM-DD"],

    ["time", "HH24:MI"],
    ["time12", "HH:MI"],
    ["timeAM", "HH:MI AM"],

    ["dy", "dy"],
    ["Dy", "Dy"],
    ["day", "day"],
    ["Day", "Day"],

    ["DayNo", "DD"],
    ["DD", "DD"],

    ["dowUS", "D"],
    ["D", "D"],
    ["dow", "ID"],
    ["ID", "ID"],

    ["MonthNo", "MM"],
    ["MM", "MM"],

    ["mon", "mon"],
    ["Mon", "Mon"],
    ["month", "month"],
    ["Month", "Month"],

    ["year", "yyyy"],
    ["yyyy", "yyyy"],
    ["yy", "yy"],
    ["yr", "yy"],
  ].map(([funcName, txt]) => ({
    name: "$" + funcName,
    type: "function",
    description: ` :[column_name] -> get timestamp formated as ` + txt,
    singleColArg: true,
    numArgs: 1,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      return pgp.as.format("trim(to_char(" + asNameAlias(args[0], tableAlias) + ", $2))", [args[0], txt]);
    }
  } as FunctionSpec)),

  /* Basic 1 arg col funcs */
  ...["upper", "lower", "length", "reverse", "trim", "initcap", "round", "ceil", "floor", "sign", "md5"].map(funcName => ({
    name: "$" + funcName,
    type: "function",
    numArgs: 1,
    singleColArg: true,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      return funcName + "(" + asNameAlias(args[0], tableAlias) + ")";
    }
  } as FunctionSpec)),

  /* Interval funcs */
  ...["age", "difference"].map(funcName => ({
    name: "$" + funcName,
    type: "function",
    numArgs: 1,
    singleColArg: true,
    getFields: (args: any[]) => args,
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const validCols = args.filter(a => typeof a === "string").length
      if(funcName === "difference" && validCols !== 2) throw new Error("Must have two column names")
      if(![1,2].includes(validCols)) throw new Error("Must have one or two column names")
      const [leftField, rightField] = args;
      const leftQ = asNameAlias(leftField, tableAlias);
      let rightQ = rightField? asNameAlias(rightField, tableAlias) : "";
      if(funcName === "age"){
        if(rightQ) rightQ = ", " + rightQ;
        return `${funcName}(${leftQ} ${rightQ})`;
      } else {
        return `${leftQ} - ${rightQ}`;
      }
    }
  } as FunctionSpec)),

  /* pgcrypto funcs */
  ...["crypt"].map(funcName => ({
    name: "$" + funcName,
    type: "function",
    numArgs: 1,
    singleColArg: false,
    getFields: (args: any[]) => [args[1]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const value = asValue(args[0]) + "",
        seedColumnName = asNameAlias(args[1], tableAlias);
        
      return `crypt(${value}, ${seedColumnName}::text)`;
    }
  } as FunctionSpec)),

  /* Text col and value funcs */
  ...["position", "position_lower"].map(funcName => ({
    name: "$" + funcName,
    type: "function",
    numArgs: 1,
    singleColArg: false,
    getFields: (args: any[]) => [args[1]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      let a1 = asValue(args[0]),
        a2 = asNameAlias(args[1], tableAlias);
      if(funcName === "position_lower"){
        a1 = `LOWER(${a1}::text)`;
        a2 = `LOWER(${a2}::text)`;
      }
      return `position( ${a1} IN ${a2} )`;
    }
  } as FunctionSpec)),
  ...["template_string"].map(funcName => ({
    name: "$" + funcName,
    type: "function",
    numArgs: 1,
    minCols: 0,
    singleColArg: false,
    getFields: (args: any[]) => [] as string[], // Fields not validated because we'll use the allowed ones anyway
    getQuery: ({ allowedFields, args, tableAlias }) => {
      let value = asValue(args[0]);
      if(typeof value !== "string") throw "expecting string argument";
      
      const usedColumns = allowedFields.filter(fName => value.includes(`{${fName}}`));
      usedColumns.forEach((colName, idx) => {
        value = value.split(`{${colName}}`).join(`%${idx + 1}$s`)
      });
      value = asValue(value);
      
      if(usedColumns.length){
        return `format(${value}, ${usedColumns.map(c => `${asNameAlias(c, tableAlias)}::TEXT`).join(", ")})`;
      }
      
      return `format(${value})`;
    }
  } as FunctionSpec)),

  /** Custom highlight -> myterm => ['some text and', ['myterm'], ' and some other text']
   * (fields: "*" | string[], term: string, { edgeTruncate: number = -1; noFields: boolean = false }) => string | (string | [string])[]  
   * edgeTruncate = maximum extra characters left and right of matches
   * noFields = exclude field names in search
   * */ 
  {
    name: "$term_highlight", /* */
    description: ` :[column_names<string[] | "*">, search_term<string>, opts?<{ returnIndex?: number; edgeTruncate?: number; noFields?: boolean }>] -> get case-insensitive text match highlight`,
    type: "function",
    numArgs: 1,
    singleColArg: true,
    canBeUsedForFilter: true,
    getFields: (args: any[]) => args[0],
    getQuery: ({ allowedFields, args, tableAlias, allColumns }) => {

      const cols = ViewHandler._parseFieldFilter(args[0], false, allowedFields);
      let term = args[1];
      const rawTerm = args[1];
      let { edgeTruncate, noFields = false, returnType, matchCase = false } = args[2] || {};
      if(!isEmpty(args[2])){
        const keys = Object.keys(args[2]);
        const validKeys = ["edgeTruncate", "noFields", "returnType", "matchCase"];
        const bad_keys = keys.filter(k => !validKeys.includes(k));
        if(bad_keys.length) throw "Invalid options provided for $term_highlight. Expecting one of: " + validKeys.join(", ");
      }
      if(!cols.length) throw "Cols are empty/invalid";
      if(typeof term !== "string") throw "Non string term provided: " + term;
      if(edgeTruncate !== undefined && (!Number.isInteger(edgeTruncate) || edgeTruncate < -1)) throw "Invalid edgeTruncate. expecting a positive integer";
      if(typeof noFields !== "boolean") throw "Invalid noFields. expecting boolean";
      const RETURN_TYPES = ["index", "boolean", "object"];
      if(returnType && !RETURN_TYPES.includes(returnType)){
        throw `returnType can only be one of: ${RETURN_TYPES}`
      }

      const makeTextMatcherArray = (rawText: string, _term: string) => {
        let matchText = rawText, term = _term;
        if(!matchCase) {
          matchText = `LOWER(${rawText})`
          term = `LOWER(${term})`
        }
        let leftStr = `substr(${rawText}, 1, position(${term} IN ${matchText}) - 1 )`,
          rightStr = `substr(${rawText}, position(${term} IN ${matchText}) + length(${term}) )`;
        if(edgeTruncate){
          leftStr = `RIGHT(${leftStr}, ${asValue(edgeTruncate)})`;
          rightStr = `LEFT(${rightStr}, ${asValue(edgeTruncate)})`
        }
        return `
          CASE WHEN position(${term} IN ${matchText}) > 0 AND ${term} <> '' 
            THEN array_to_json(ARRAY[
                to_json( ${leftStr}::TEXT ), 
                array_to_json(
                  ARRAY[substr(${rawText}, position(${term} IN ${matchText}), length(${term}) )::TEXT ]
                ),
                to_json(${rightStr}::TEXT ) 
              ]) 
            ELSE 
              array_to_json(ARRAY[(${rawText})::TEXT]) 
          END
        `;
      }

      let colRaw = "( " + cols.map(c =>`${noFields? "" : (asValue(c + ": ") + " || ")} COALESCE(${asNameAlias(c, tableAlias)}::TEXT, '')`).join(" || ', ' || ") + " )";
      let col = colRaw;
      term = asValue(term);
      if(!matchCase) {
        col = "LOWER" + col;
        term = `LOWER(${term})`
      }

      let leftStr = `substr(${colRaw}, 1, position(${term} IN ${col}) - 1 )`,
        rightStr = `substr(${colRaw}, position(${term} IN ${col}) + length(${term}) )`;
      if(edgeTruncate){
        leftStr = `RIGHT(${leftStr}, ${asValue(edgeTruncate)})`;
        rightStr = `LEFT(${rightStr}, ${asValue(edgeTruncate)})`
      }
      
      // console.log(col);
      let res = ""
      if(returnType === "index"){ 
        res = `CASE WHEN position(${term} IN ${col}) > 0 THEN position(${term} IN ${col}) - 1 ELSE -1 END`;

      // } else if(returnType === "boolean"){
      //   res = `CASE WHEN position(${term} IN ${col}) > 0 THEN TRUE ELSE FALSE END`;

      } else if(returnType === "object" || returnType === "boolean"){
        const hasChars = Boolean(rawTerm &&  /[a-z]/i.test(rawTerm));
        let validCols = cols.map(c => {
            const colInfo = allColumns.find(ac => ac.name === c);
            return {
              key: c,
              colInfo
            }
          })
          .filter(c => c.colInfo && c.colInfo.udt_name !== "bytea")
        
        let _cols = validCols.filter(c => 
          /** Exclude numeric columns when the search tern contains a character */
          !hasChars ||  
          postgresToTsType(c.colInfo!.udt_name) !== "number"
        );

        /** This will break GROUP BY (non-integer constant in GROUP BY) */
        if(!_cols.length){
          if(validCols.length && hasChars) throw `You're searching the impossible: characters in numeric fields. Use this to prevent making such a request in future: /[a-z]/i.test(your_term) `
          return (returnType === "boolean")? "FALSE" : "NULL"
        }
        res = `CASE 
          ${_cols
           .map(c => {
            const colNameEscaped = asNameAlias(c.key, tableAlias)
            let colSelect = `${colNameEscaped}::TEXT`;
            const isTstamp = c.colInfo?.udt_name.startsWith("timestamp");
            if(isTstamp || c.colInfo?.udt_name === "date"){
              colSelect = `( CASE WHEN ${colNameEscaped} IS NULL THEN '' 
              ELSE concat_ws(' ', 
              ${colNameEscaped}::TEXT, 
              ${isTstamp? `'TZ' || trim(to_char(${colNameEscaped}, 'OF')), `: ''}
                trim(to_char(${colNameEscaped}, 'Day Month')), 
                'Q' || trim(to_char(${colNameEscaped}, 'Q')),
                'WK' || trim(to_char(${colNameEscaped}, 'WW'))
              ) END)`
            }
            let colTxt = `COALESCE(${colSelect}, '')`; //  position(${term} IN ${colTxt}) > 0
            if(returnType === "boolean"){
              return ` 
                WHEN  ${colTxt} ${matchCase? "LIKE" : "ILIKE"} ${asValue('%' + rawTerm + '%')}
                  THEN TRUE
                `
            }
            return ` 
              WHEN  ${colTxt} ${matchCase? "LIKE" : "ILIKE"} ${asValue('%' + rawTerm + '%')}
                THEN json_build_object(
                  ${asValue(c.key)}, 
                  ${makeTextMatcherArray(
                    colTxt, 
                    term
                  )}
                )::jsonb
              `
          }).join(" ")}
          ELSE ${(returnType === "boolean")? "FALSE" : "NULL"}

        END`;

        // console.log(res)
      } else {
        /* If no match or empty search THEN return full row as string within first array element  */
        res = `CASE WHEN position(${term} IN ${col}) > 0 AND ${term} <> '' THEN array_to_json(ARRAY[
          to_json( ${leftStr}::TEXT ), 
          array_to_json(
            ARRAY[substr(${colRaw}, position(${term} IN ${col}), length(${term}) )::TEXT ]
          ),
          to_json(${rightStr}::TEXT ) 
        ]) ELSE array_to_json(ARRAY[(${colRaw})::TEXT]) END`;

      }

      return res;
    } 
  },

  /* Aggs */
  ...["max", "min", "count", "avg", "json_agg", "jsonb_agg", "string_agg", "array_agg", "sum"].map(aggName => ({
    name: "$" + aggName,
    type: "aggregation",
    numArgs: 1,
    singleColArg: true,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      let extraArgs = "";
      if(args.length > 1){
        extraArgs  = pgp.as.format(", $1:csv", args.slice(1))
      }
      return aggName + "(" + asNameAlias(args[0], tableAlias) + `${extraArgs})`;
    }
  } as FunctionSpec)),

  /* More aggs */
  {
    name: "$countAll",
    type: "aggregation",
    description: `agg :[]  COUNT of all rows `,
    singleColArg: true,
    numArgs: 0,
    getFields: (args: any[]) => [],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      return "COUNT(*)";
    }
  } as FunctionSpec,
  {
    name: "$diff_perc",
    type: "aggregation",
    numArgs: 1,
    singleColArg: true,
    getFields: (args: any[]) => [args[0]],
    getQuery: ({ allowedFields, args, tableAlias }) => {
      const col = asNameAlias(args[0], tableAlias);
      return `round( ( ( MAX(${col}) - MIN(${col}) )::float/MIN(${col}) ) * 100, 2)`
    }
  } as FunctionSpec
];

/* The difference between a function and computed field is that the computed field does not require any arguments */
export const COMPUTED_FIELDS: FieldSpec[] = [

  /**
   * Used instead of row id. Must be used as a last resort. Use all non pseudo or domain data type columns first!
   */
  {
    name: "$rowhash",
    type: "computed",
    // description: ` order hash of row content  `,
    getQuery: ({ allowedFields, tableAlias, ctidField }) => {
      return "md5(" +
        allowedFields

          /* CTID not available in AFTER trigger */
          // .concat(ctidField? [ctidField] : [])
          .sort()
          .map(f => asNameAlias(f, tableAlias))
          .map(f => `md5(coalesce(${f}::text, 'dd'))`)
          .join(" || ") + 
      `)`;
    }
  }
  // ,{
  //   name: "ctid",
  //   type: "computed",
  //   // description: ` order hash of row content  `,
  //   getQuery: ({ allowedFields, tableAlias, ctidField }) => {
  //     return asNameAlias("ctid", tableAlias);
  //   }
  // }
];

export class SelectItemBuilder {

  select: SelectItem[] = [];
  private allFields: string[];

  private allowedFields: string[];
  private computedFields: FieldSpec[];
  private functions: FunctionSpec[];
  private allowedFieldsIncludingComputed: string[];
  private isView: boolean;
  private columns: ColumnInfo[];

  constructor(params: { allowedFields: string[]; computedFields: FieldSpec[]; functions: FunctionSpec[]; allFields: string[]; isView: boolean; columns: ColumnInfo[]; }){
    this.allFields = params.allFields;
    this.allowedFields = params.allowedFields;
    this.computedFields = params.computedFields;
    this.isView = params.isView;
    this.functions = params.functions;
    this.columns = params.columns;
    this.allowedFieldsIncludingComputed = this.allowedFields.concat(this.computedFields? this.computedFields.map(cf => cf.name) : []);
    if(!this.allowedFields.length){
      throw "allowedFields empty/missing";
    }

    /* Check for conflicting computed column names */
    const conflictingCol = this.allFields.find(fieldName => this.computedFields.find(cf => cf.name === fieldName));
    if(conflictingCol){
      throw "INTERNAL ERROR: Cannot have duplicate column names ( " + conflictingCol + " ). One or more computed column names are colliding with table columns ones";
    }
  }

  private checkField = (f: string) => {
    if(!this.allowedFieldsIncludingComputed.includes(f)){ 
      console.log(f, f === "name", this.allowedFieldsIncludingComputed.includes("name"), this.allowedFieldsIncludingComputed)
      throw "Field " + f + " is invalid or dissallowed";
    }
    return f;
  }

  private addItem = (item: SelectItem) => {
    let fields = item.getFields();
    // console.trace(fields)
    if(fields === "*") fields = this.allowedFields.slice(0);//.concat(fields.filter(f => f !== "*"));
    fields.map(this.checkField);

    if(this.select.find(s => s.alias === item.alias)) throw `Cannot specify duplicate columns ( ${item.alias} ). Perhaps you're using "*" with column names?`;
    this.select.push(item);
  }

  private addFunction = (func: FunctionSpec | string, args: any[], alias: string) => {
    const funcDef = parseFunction({
      func, args, functions: this.functions,
      allowedFields: this.allowedFieldsIncludingComputed,
    });

    this.addItem({
      type: funcDef.type,
      alias,
      getFields: () => funcDef.getFields(args),
      getQuery: (tableAlias?: string) => funcDef.getQuery({ allColumns: this.columns, allowedFields: this.allowedFields, args, tableAlias, 
        ctidField: undefined,

        /* CTID not available in AFTER trigger */
        // ctidField: this.isView? undefined : "ctid" 
      }),
      selected: true
    });
  }

  addColumn = (fieldName: string, selected: boolean) => {
  
    /* Check if computed col */
    if(selected){
      const compCol = COMPUTED_FIELDS.find(cf => cf.name === fieldName);
      if(compCol && !this.select.find(s => s.alias === fieldName)){
        const cf: FunctionSpec = { 
          ...compCol,
          type: "computed",
          numArgs: 0,
          singleColArg: false,
          getFields: (args: any[]) => [] 
        }
        this.addFunction(cf, [], compCol.name)
        return;
      }
    }

    const colDef = this.columns.find(c => c.name === fieldName);
    let alias = selected? fieldName : ("not_selected_" + fieldName);
    this.addItem({
      type: "column",
      columnPGDataType: colDef?.data_type,
      column_udt_type: colDef?.udt_name,
      alias,
      getQuery: () => asName(fieldName),
      getFields: () => [fieldName],
      selected
    });
  }

  parseUserSelect = async (userSelect: Select, joinParse?: (key: string, val: any, throwErr: (msg: string) => any) => any) => {

    /* Array select */
    if(Array.isArray(userSelect)){
      if(userSelect.find(key => typeof key !== "string")) throw "Invalid array select. Expecting an array of strings";
  
      userSelect.map(key => this.addColumn(key, true))
  
    /* Empty select */
    } else if(userSelect === ""){
      // select.push({
      //   type: "function",
      //   alias: "",
      //   getFields: () => [],
      //   getQuery: () => ""
      // })
      return [];
    } else if(userSelect === "*"){
      this.allowedFields.map(key => this.addColumn(key, true) );

    } else if(isPlainObject(userSelect) && !isEmpty(userSelect)){
      const selectKeys = Object.keys(userSelect),
        selectValues = Object.values(userSelect);
  
      /* Cannot include and exclude at the same time */
      if(
        selectValues.filter(v => [0, false].includes(v)).length 
      ){
        if(selectValues.filter(v => ![0, false].includes(v)).length ){
          throw "\nCannot include and exclude fields at the same time";
        }
  
        /* Exclude only */
        this.allowedFields.filter(f => !selectKeys.includes(f)).map(key => this.addColumn(key, true) )
          
      } else {
        await Promise.all(selectKeys.map(async key => {
          const val: any = userSelect[key as keyof typeof userSelect],
            throwErr = (extraErr: string = "") => {
              console.trace(extraErr)
              throw "Unexpected select -> " + JSON.stringify({ [key]: val }) + "\n" + extraErr;
            };
        
          /* Included fields */
          if([1, true].includes(val)){
            if(key === "*"){
              this.allowedFields.map(key => this.addColumn(key, true) )
            } else {
              this.addColumn(key, true);
            }
  
          /* Aggs and functions */
          } else if(typeof val === "string" || isPlainObject(val)) {
  
            /* Function shorthand notation
                { id: "$max" } === { id: { $max: ["id"] } } === SELECT MAX(id) AS id 
            */  
            if(
              (typeof val === "string" && val !== "*") ||
              isPlainObject(val) && Object.keys(val).length === 1 && Array.isArray(Object.values(val)[0]) // !isPlainObject(Object.values(val)[0])
            ){
              // if(!Array.isArray(Object.values(val)[0])){
              //   throw `Could not parse selected item: ${JSON.stringify(val)}\nFunction arguments must be in an array`;
              // }

              let funcName, args;
              if(typeof val === "string") {
                /* Shorthand notation -> it is expected that the key is the column name used as the only argument */
                try {
                  this.checkField(key)
                } catch (err){
                  throwErr(` Shorthand function notation error: the specifield column ( ${key} ) is invalid or dissallowed. \n Use correct column name or full aliased function notation, e.g.: -> { alias: { $func_name: ["column_name"] } } `)
                }
                funcName = val;
                args = [key];

              /** Function full notation { $funcName: ["colName", ...args] } */
              } else {
                ({ funcName, args } = parseFunctionObject(val));
              }
              
              this.addFunction(funcName, args, key);
  
            /* Join */
            } else {

              if(!joinParse) throw "Joins dissalowed";
              await joinParse(key, val, throwErr);
              
            }
  
          } else throwErr();
  
        }));
      }
    } else throw "Unexpected select -> " + JSON.stringify(userSelect);
  
  }

}

export async function getNewQuery(
  _this: TableHandler,
  filter: Filter, 
  selectParams: (SelectParams & { alias?: string })  = {}, 
  param3_unused = null, 
  tableRules: TableRule | undefined, 
  localParams: LocalParams | undefined,
  columns: ColumnInfo[],
): Promise<NewQuery> {

  if((localParams?.socket || localParams?.httpReq) && !get(tableRules, "select.fields")){
    throw `INTERNAL ERROR: publish.${_this.name}.select.fields rule missing`;
  }

  // const all_columns: SelectItem[] = _this.column_names.slice(0).map(fieldName => ({
  //   type: "column",
  //   alias: fieldName,
  //   getQuery: () => asName(fieldName),
  //   getFields: () => [fieldName],
  //   selected: false
  // } as SelectItem))
  // .concat(COMPUTED_FIELDS.map(c => ({
  //   type: c.type,
  //   alias: c.name,
  //   getQuery: () => c.getQuery(),
  //   getFields: c.getFields,
  //   selected: false
  // })))

  // let select: SelectItem[] = [],
  let  joinQueries: NewQuery[] = [];

    // const all_colnames = _this.column_names.slice(0).concat(COMPUTED_FIELDS.map(c => c.name));

  const { select: userSelect = "*" } = selectParams,
    // allCols = _this.column_names.slice(0),
    // allFieldsIncludingComputed = allCols.concat(COMPUTED_FIELDS.map(c => c.name)),
    allowedFields = _this.parseFieldFilter(get(tableRules, "select.fields")) || _this.column_names.slice(0),
    // allowedFieldsIncludingComputed = _this.parseFieldFilter(get(tableRules, "select.fields"), true, allFieldsIncludingComputed) || allFieldsIncludingComputed,
    sBuilder = new SelectItemBuilder({ allowedFields, computedFields: COMPUTED_FIELDS, isView: _this.is_view, functions: FUNCTIONS, allFields: _this.column_names.slice(0), columns });

  
 
  await sBuilder.parseUserSelect(userSelect, async (key, val, throwErr) => {

    // console.log({ key, val })
    let j_filter: Filter = {},
        j_selectParams: SelectParams = {},
        j_path: string[] | undefined,
        j_alias: string | undefined,
        j_tableRules: TableRule | undefined,
        j_table: string | undefined,
        j_isLeftJoin: boolean = true;

    if(val === "*"){
      j_selectParams.select = "*";
      j_alias = key;
      j_table = key;
    } else {

      /* Full option join  { field_name: db.innerJoin.table_name(filter, select)  } */
      const JOIN_KEYS = ["$innerJoin", "$leftJoin"];
      const JOIN_PARAMS = ["select", "filter", "$path", "offset", "limit", "orderBy"];
      const joinKeys = Object.keys(val).filter(k => JOIN_KEYS.includes(k));
      if(joinKeys.length > 1) {
        throwErr("\nCannot specify more than one join type ( $innerJoin OR $leftJoin )");
      } else if(joinKeys.length === 1) {
        const invalidParams = Object.keys(val).filter(k => ![ ...JOIN_PARAMS, ...JOIN_KEYS ].includes(k));
        if(invalidParams.length) throw "Invalid join params: " + invalidParams.join(", ");

        j_isLeftJoin = joinKeys[0] === "$leftJoin";
        j_table = val[joinKeys[0]];
        j_alias = key;
        if(typeof j_table !== "string") throw "\nIssue with select. \nJoin type must be a string table name but got -> " + JSON.stringify({ [key]: val });
        
        j_selectParams.select = val.select || "*";
        j_filter = val.filter || {};
        j_selectParams.limit = val.limit;
        j_selectParams.offset = val.offset;
        j_selectParams.orderBy = val.orderBy;
        j_path = val.$path;
      } else {
        j_selectParams.select = val;
        j_alias = key;
        j_table = key;
      }
    }
    if(!j_table) throw "j_table missing"
    const _thisJoinedTable: any = _this.dboBuilder.dbo[j_table];
    if(!_thisJoinedTable) {
      throw `Joined table ${JSON.stringify(j_table)} is disallowed or inexistent \nOr you've forgot to put the function arguments into an array`;
    }

    let isLocal = true;
    if(localParams && (localParams.socket || localParams.httpReq)){
      isLocal = false;
      j_tableRules = await _this.dboBuilder.publishParser?.getValidatedRequestRuleWusr({ tableName: j_table, command: "find", localParams });
    }
    
    if(isLocal || j_tableRules){

      const joinQuery: NewQuery = await getNewQuery(
          _thisJoinedTable,
          j_filter, 
          { ...j_selectParams, alias: j_alias }, 
          param3_unused, 
          j_tableRules, 
          localParams,
          columns
        );
      joinQuery.isLeftJoin = j_isLeftJoin;
      joinQuery.tableAlias = j_alias;
      joinQuery.$path = j_path;
      joinQueries.push(joinQuery);
      // console.log(joinQuery)
    }
  })

  /* Add non selected columns */
  /* WHY???? */
  allowedFields.map(key => {
    if(!sBuilder.select.find(s => s.alias === key && s.type === "column")){
      sBuilder.addColumn(key, false);
    }
  });

  let select: SelectItem[] = sBuilder.select;
  // const validatedAggAliases = select
  //   .filter(s => s.type !== "joinedColumn")
  //   .map(s => s.alias);
    
  const where = await _this.prepareWhere({
    filter, 
    select, 
    forcedFilter: get(tableRules, "select.forcedFilter"), 
    filterFields: get(tableRules, "select.filterFields"), 
    tableAlias: selectParams.alias, 
    localParams,
    tableRule: tableRules
  });
  const p = _this.getValidatedRules(tableRules, localParams);

  let resQuery: NewQuery = {
    allFields: allowedFields,
    select,
    table: _this.name,
    joins: joinQueries,
    where,
    // having: cond.having,
    limit: _this.prepareLimitQuery(selectParams.limit, p),
    orderBy: [_this.prepareSort(selectParams.orderBy, allowedFields, selectParams.alias, undefined, select)],
    offset: _this.prepareOffsetQuery(selectParams.offset)
  } as NewQuery;

  // console.log(resQuery);
  // console.log(buildJoinQuery(_this, resQuery));
  return resQuery;
}



/* No validation/authorisation at this point */
export function makeQuery(
  _this: TableHandler,
  q: NewQuery, 
  depth: number = 0, 
  joinFields: string[] = [],
  selectParams: SelectParams = {},
): string {
  const PREF = `prostgles`,
      joins = q.joins || [],
      // aggs = q.aggs || [],
      makePref = (q: NewQuery) => !q.tableAlias? q.table : `${q.tableAlias || ""}_${q.table}`,
      makePrefANON = (joinAlias: string | undefined, table: string) => asName(!joinAlias? table : `${joinAlias || ""}_${table}`),
      makePrefAN = (q: NewQuery) => asName(makePref(q));

  const indentLine = (numInd: number, str: string, indentStr = "    ") => new Array(numInd).fill(indentStr).join("") + str;
  const indStr = (numInd: number, str: string) => str.split("\n").map(s => indentLine(numInd, s)).join("\n");
  const indjArr = (numInd: number, strArr: string[], indentStr = "    "): string[] => strArr.map(str => indentLine(numInd, str) );
  const indJ = (numInd: number, strArr: string[], separator = " \n ", indentStr = "    ") => indjArr(numInd, strArr, indentStr).join(separator);
  const selectArrComma = (strArr: string[]): string[] => strArr.map((s, i, arr)=> s + (i < arr.length - 1? " , " : " "));
  const prefJCAN = (q: NewQuery, str: string) => asName(`${q.tableAlias || q.table}_${PREF}_${str}`);

  // const indent = (a, b) => a;
  const joinTables = (q1: NewQuery, q2: NewQuery): string[] => {
    const joinInfo = _this.getJoins(q1.table, q2.table, q2.$path, true);
    const paths = joinInfo.paths;

    return paths.flatMap(({ table, on }, i) => {
      const getColName = (col: string, q: NewQuery) => {
        if(table === q.table){
          const colFromSelect = q.select.find(s => s.getQuery() === asName(col));
          if(!colFromSelect){
            console.error(`${col} column might be missing in user publish `);
            throw `Could not find join column (${col}) in allowe select. Some join tables and columns might be invalid/dissallowed`
          }
          return colFromSelect.alias;
        }

        return col;
      }
      const getPrevColName = (col: string) => {
        return getColName(col, q1);
      }
      const getThisColName = (col: string) => {
        return getColName(col, q2);
      }

      // console.log(JSON.stringify({i, table, on, q1, q2}, null, 2));

      const prevTable = i === 0? q1.table : (paths[i - 1].table);
      const thisAlias = makePrefANON(q2.tableAlias, table);
      // const prevAlias = i === 0? makePrefAN(q1) : thisAlias;
      const prevAlias =  i === 0? makePrefAN(q1) : makePrefANON(q2.tableAlias, prevTable)
      // If root then prev table is aliased from root query. Alias from join otherwise

      let iQ = [
        asName(table) + ` ${thisAlias}`
      ];

      /* If target table then add filters, options, etc */
      if(i === paths.length - 1){
            
          // const targetSelect = (
          //     q2.select.concat(
          //         (q2.joins || []).map(j => j.tableAlias || j.table)
          //     ).concat(
          //         /* Rename aggs to avoid collision with join cols */
          //         (q2.aggs || []).map(a => asName(`agg_${a.alias}`) + " AS " + asName(a.alias)) || [])
          //     ).filter(s => s).join(", ");
          
          const targetSelect = q2.select.filter(s => s.selected).map(s => {
              /* Rename aggs to avoid collision with join cols */
              if(s.type === "aggregation") return asName(`agg_${s.alias}`) + " AS " + asName(s.alias);
              return asName(s.alias);
            }).concat(q2.joins?.map(j => asName(j.table)) ?? []).join(", ");

          const _iiQ = makeQuery(
            _this, 
            q2, 
            depth + 1, 
            on.map(([c1, c2]) => asName(c2)),
            selectParams,
          );
          // const iiQ = flat(_iiQ.split("\n")); // prettify for debugging
          // console.log(_iiQ)
          const iiQ = [_iiQ];

          iQ = [
              "("
          , ...indjArr(depth + 1, [
                  `-- 4. [target table] `
              ,   `SELECT *,`
              ,   `row_number() over() as ${prefJCAN(q2, `rowid_sorted`)},`
              ,   `row_to_json((select x from (SELECT ${targetSelect}) as x)) AS ${prefJCAN(q2, `json`)}`
              ,   `FROM (`
              ,   ...iiQ
              ,   `) ${asName(q2.table)}    `
          ])
          ,   `) ${thisAlias}`
          ]
      }
      let jres =  [
          `${q2.isLeftJoin? "LEFT" : "INNER"} JOIN `
      , ...iQ
      ,   `ON ${
              on.map(([c1, c2]) => 
                  `${prevAlias}.${asName(getPrevColName(c1))} = ${thisAlias}.${asName(getThisColName(c2))} `
              ).join(" AND ")
          }`
      ];
      return jres;
    });
  }

  const getGroupBy = (rootSelectItems: SelectItem[], groupByItems: SelectItem[]): string => {
    if(groupByItems.length){
      /** Root Select column index number is used where possible to prevent "non-integer constant in GROUP BY" error */

      return `GROUP BY ` + groupByItems.map(gi => {
        const idx = rootSelectItems.findIndex(si => si.alias === gi.alias);
        if(idx < 0) throw `Could not find GROUP BY column ${gi.alias} in ROOT SELECT ${rootSelectItems.map(s => s.alias)}`;
        return idx + 1;
      }).join(", ")
    }

    return ""
  }
      
  /* Leaf query -> no joins -> return simple query */
  const aggs = q.select.filter(s => s.type === "aggregation");
  const nonAggs = q.select.filter(s => depth || s.selected).filter(s => s.type !== "aggregation");
  if(!joins.length){
    /* Nested queries contain all fields to allow joining */
    let groupBy = "";

    const rootSelectItems = q.select.filter(s => joinFields.includes(s.getQuery()) || s.selected)

    /* If aggs exist need to set groupBy add joinFields into select */
    if(aggs.length || selectParams?.groupBy){
        // const missingFields = joinFields.filter(jf => !q.select.find(s => s.type === "column" && s.alias === jf));
        // if(depth && missingFields.length){
        //     // select = Array.from(new Set(missingFields.concat(select)));
        // }

        if(nonAggs.length){
          let groupByFields = nonAggs.filter(sf => !depth || joinFields.includes(sf.getQuery()));
          groupBy = getGroupBy(rootSelectItems, groupByFields);
          // if(groupByFields.length){
          //   groupBy = `GROUP BY ${groupByFields.map(sf => sf.type === "function"? sf.getQuery() :  asName(sf.alias)).join(", ")}\n`;
          // }
        }
    }

    // console.log(q.select, joinFields)
    let simpleQuery = indJ(depth, [
        `-- 0. or 5. [leaf query] `
        
        /* Group by selected fields + any join fields */
    ,   `SELECT ` + rootSelectItems.map(s => {
            // return s.getQuery() + ((s.type !== "column")? (" AS " + s.alias) : "")
            
            if(s.type === "aggregation"){
              /* Rename aggs to avoid collision with join cols */
              return s.getQuery() + " AS " + asName((depth? "agg_" : "") + s.alias);
            }
            return s.getQuery() + " AS " + asName(s.alias)
      }).join(", ")
    ,   `FROM ${asName(q.table)} `
    ,   q.where
    ,   groupBy //!aggs.length? "" : `GROUP BY ${nonAggs.map(sf => asName(sf.alias)).join(", ")}`,
    ,   q.having? `HAVING ${q.having}` : ""
    ,   q.orderBy.join(", ")
    ,   !depth? `LIMIT ${q.limit} ` : null
    ,   !depth? `OFFSET ${q.offset || 0} ` : null
    ].filter(v => v && (v + "").trim().length) as unknown as string[]);
    // console.log(fres);
    return simpleQuery;
  } else {
    // if(q.aggs && q.aggs && q.aggs.length) throw "Cannot join an aggregate";
    if(
      q.select.find(s => s.type === "aggregation") && 
      joins.find(j => j.select.find(s => s.type === "aggregation"))
    ) throw "Cannot join two aggregates";
  }

  if(joins && joins.length && (aggs.length || selectParams.groupBy)) throw "Joins within Aggs dissallowed";

  // if(q.selectFuncs.length) throw "Functions within select not allowed in joins yet. -> " + q.selectFuncs.map(s => s.alias).join(", ");
  
  const rootSelectItems = q.select.filter(s => depth || s.selected)

  let rootGroupBy: string | undefined;
  if((selectParams.groupBy || aggs.length || q.joins && q.joins.length) && nonAggs.length){
    // console.log({ aggs, nonAggs, joins: q.joins })
    // rootGroupBy = getGroupBy(rootSelectItems, depth? rootSelectItems : nonAggs) + (aggs?.length? "" : ", ctid")
    rootGroupBy = `GROUP BY ${
      (depth? 
        q.allFields.map(f => asName(f)) : 
        nonAggs.map(s => s.type === "function"? s.getQuery() : asName(s.alias))
      ).concat(
        (aggs && aggs.length)? 
          [] : 
          [`ctid`]
        ).filter(s => s).join(", ")} `
  }

  /* Joined query */
  const joinedQuery = [
      " \n"
  ,   `-- 0. [joined root]  `
  ,   "SELECT    "
  ,...selectArrComma(rootSelectItems.map(s => s.getQuery() + " AS " + asName(s.alias)).concat(
      joins.map((j, i)=> {

        /** Apply LIMIT to joined items */
        const jsq = `json_agg(${prefJCAN(j, `json`)}::jsonb ORDER BY ${prefJCAN(j, `rowid_sorted`)}) FILTER (WHERE ${prefJCAN(j, `limit`)} <= ${j.limit} AND ${prefJCAN(j, `dupes_rowid`)} = 1 AND ${prefJCAN(j, `json`)} IS NOT NULL)`;
        const resAlias = asName(j.tableAlias || j.table)

        // If limit = 1 then return a single json object (first one)
        return (j.limit === 1? `${jsq}->0 ` : `COALESCE(${jsq}, '[]') `) +  `  AS ${resAlias}`;
      })
    ))
  ,   `FROM ( `
  ,   ...indjArr(depth + 1, [
          "-- 1. [subquery limit + dupes] "
      ,   "SELECT     "
      ,    ...selectArrComma([`t1.*`].concat(
              joins.map((j, i)=> {
                  return  `row_number() over(partition by ${prefJCAN(j, `dupes_rowid`)}, ` + 
                      `ctid order by ${prefJCAN(j, `rowid_sorted`)}) AS ${prefJCAN(j, `limit`)}  `
              }))
          )
      ,   `FROM ( ----------- ${makePrefAN(q)}`
      ,   ...indjArr(depth + 1, [
              "-- 2. [source full select + ctid to group by] "
          ,   "SELECT "
          ,   ...selectArrComma(
                  q.allFields.concat(["ctid"])
                  .map(field => `${makePrefAN(q)}.${asName(field)}  `)
                  .concat(
                      joins.map((j, i)=> 
                      makePrefAN(j) + "." + prefJCAN(j, `json`) + ", " + makePrefAN(j) + "." + prefJCAN(j, `rowid_sorted`)
                      ).concat(
                          joins.map(j => `row_number() over(partition by ${makePrefAN(j)}.${prefJCAN(j, `rowid_sorted`)}, ${makePrefAN(q)}.ctid ) AS ${prefJCAN(j, `dupes_rowid`)}`)
                      )
              ))
          ,   `FROM ( `
          ,   ...indjArr(depth + 1, [
                  "-- 3. [source table] "
              ,   "SELECT "
              ,   "*, row_number() over() as ctid "
              ,   `FROM ${asName(q.table)} `
              ,   `${q.where} `
              ])
          ,   `) ${makePrefAN(q)} `
          ,   ...joins.flatMap((j, i)=> joinTables(q, j))
          ])
      ,   ") t1"
      ])
  ,   ") t0"
  ,   rootGroupBy
  ,   q.having? `HAVING ${q.having} ` : ""
  ,   q.orderBy
  ,   depth? null : `LIMIT ${q.limit || 0} OFFSET ${q.offset || 0}`
  ,   "-- EOF 0. joined root"
  ,   " \n"
  ].filter(v => v)

  let res = indJ(depth, joinedQuery as unknown as string[]);
  // res = indent(res, depth);
  // console.log(res);
  return res;
}
