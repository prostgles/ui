import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import { isObject } from "prostgles-types";
import { renderInterval } from "../../W_SQL/customRenderers";
import { colIs } from "../../W_Table/ColumnMenu/ColumnSelect";
import type { FilterColumn } from "../../SmartFilter/smartFilterUtils";
import { getComputedColumnSelect } from "../../W_Table/tableUtils/getTableSelect";

export const OPTIONS_LIMIT = 20;
export const getSuggestions = async (args: {
  table: string;
  db: DBHandlerClient;
  column: FilterColumn;
  term?: string;
  groupBy?: boolean;
  filter?: AnyObject;
}): Promise<(string | null)[]> => {
  //  { raw: any; text: string }

  const { db, table, term: _term, column: col, groupBy = true, filter } = args;
  const tableHandler = db[table];
  if (!tableHandler?.find) {
    console.error("Invalid column provided");
    return [];
  }
  const term = (_term || "").trimStart();

  try {
    const finalFilter = {
      $and: [
        filter,
        !term ? {} : { [col.name]: { $ilike: `%${term}%` } },
      ].filter((v) => v),
    };
    const res = (await tableHandler.find(finalFilter, {
      select: {
        [col.name]:
          col.type === "computed" ?
            getComputedColumnSelect(col.computedConfig)
          : 1,
        // [`${col}_sort`]: {
        //     $position_lower: [
        //         term || '', col
        //     ]
        // },
      },
      groupBy,
      returnType: "values",
      limit: OPTIONS_LIMIT,
      // orderBy: !term?
      //     [{ key: col, asc: true, nulls: "first" } ]:

      //     [

      //         { key: `${col}_sort`, asc: true, nulls: "first" },
      //         { key: col, asc: true, nulls: "first" }
      //     ],
    })) as any;

    /**
     * Prepend empty/null value options to the top if they exist
     */
    if (col.type === "column") {
      if (
        !res.includes("") &&
        !colIs(col, "_PG_date") &&
        col.tsDataType === "string" &&
        col.udt_name !== "uuid"
      ) {
        const empty = await tableHandler.findOne?.(
          { [col.name]: "" },
          { select: { [col.name]: "$trim" } },
        );
        if (empty) res.unshift("");
      }
      if (!res.includes(null)) {
        const c = (await tableHandler.count?.({ [col.name]: null })) ?? "0";
        if (+c) res.unshift(null);
      }
    }

    return res;
  } catch (e) {
    console.error(e);
    return [];
  }
};

/**
 * Used in transforming a postgres/db value to a valid html <input /> OR <CodeEditor /> value
 */
export const parseValue = (
  c: ValidatedColumnInfo | FilterColumn,
  value: any,
  reverseForServer = false,
) => {
  if (reverseForServer) {
    if (
      (c.udt_name === "geography" || c.udt_name === "geometry") &&
      typeof value === "string" &&
      value.trim().startsWith("{")
    ) {
      try {
        return JSON.parse(value);
      } catch (e) {}
    }

    return value;
  }

  /** CodeEditor accepts only string */
  if (c.udt_name.startsWith("json")) {
    if (!value) return "";
    return JSON.stringify(value, null, 2);
  }

  if (value) {
    if (c.udt_name === "interval" && typeof value !== "string") {
      return renderInterval(value);
    }

    const parseDateStr = (v: string | number, withTimeZone = false) => {
      const wTz = new Date(v).toISOString();
      if (!withTimeZone) return wTz.slice(0, -5);

      /** datetime-local does not support timezone so we're slicing it out anyway */
      return wTz.slice(0, 19);
    };

    if (c.udt_name.startsWith("geo")) {
      if (typeof value === "string") return value;

      try {
        return JSON.stringify(
          typeof value === "object" ? value : JSON.parse(value as any),
          null,
          2,
        );
      } catch (err) {
        return typeof value === "string" ? value : value + "";
      }
    }

    if (
      c.udt_name.startsWith("geo") &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return JSON.stringify(value);
    }
    const v = typeof value === "string" ? value : +value;
    if (c.udt_name === "date") return new Date(v).toISOString().split("T")[0];
    if (c.udt_name.startsWith("timestamp"))
      return parseDateStr(v, c.udt_name === "timestamptz");
    if (Array.isArray(value) && !value.some((v) => isObject(v))) {
      if (c.udt_name.includes("timestamp")) {
        return value
          .filter((v) => v !== "")
          .map((v) => parseDateStr(v, c.udt_name.endsWith("z")));
      }
    }
  }

  return value;
};

export const parseDefaultValue = (
  c: ValidatedColumnInfo,
  value: any,
  wasChanged: boolean,
) => {
  if (wasChanged) return value;

  /* If value is provided then return it */
  if (![null, undefined].includes(value)) return value;

  /* If value is nullable and null then return it */
  if (c.is_nullable && value === null) return value;

  if (c.has_default && typeof c.column_default === "string") {
    if (c.column_default.endsWith("::text"))
      return c.column_default.slice(1, -7);
    // if (["now()", "CURRENT_TIMESTAMP"].includes(c.column_default)) {
    //   if (c.udt_name === "date") return (new Date()).toISOString().split('T')[0];
    //   return (new Date()).toISOString().slice(0, -5);
    // }
    if (c.udt_name === "jsonb" && c.column_default.endsWith("::jsonb")) {
      try {
        const val = JSON.parse(c.column_default.slice(1, -8));
        return val;
      } catch (e) {
        console.error("Could not parse column_default", e);
      }
    }
    if (c.tsDataType === "number") return Number(c.column_default);
  } else if (value) {
    return parseValue(c, value);
  }

  return value;
};
