import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import { getComputedColumnSelect } from "src/dashboard/W_Table/tableUtils/getTableSelect";
import type { FilterColumn } from "../../SmartFilter/smartFilterUtils";
import { colIs } from "./fieldUtils";
const OPTIONS_LIMIT = 20;

export const fetchColumnValueSuggestions = async (args: {
  table: string;
  db: DBHandlerClient;
  column: FilterColumn;
  term?: string;
  groupBy?: boolean;
  filter?: AnyObject;
}): Promise<(string | null)[]> => {
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
    const select = {
      [col.name]:
        col.type === "computed" ?
          getComputedColumnSelect(col.computedConfig)
        : 1,
      /** Sorting removed because it is expensive on big dataset */
      // [`${col}_sort`]: {
      //     $position_lower: [
      //         term || '', col
      //     ]
      // },
    } as const;

    if (col.type === "computed" && col.computedConfig.funcDef.isAggregate) {
      console.warn(
        "TOOD: implement groupBy other columns to ensure correct aggregate results",
      );
    }

    const res = await tableHandler.find(finalFilter, {
      select,
      groupBy,
      returnType: "values",
      limit: OPTIONS_LIMIT,
      // orderBy: !term?
      //     [{ key: col, asc: true, nulls: "first" } ]:

      //     [

      //         { key: `${col}_sort`, asc: true, nulls: "first" },
      //         { key: col, asc: true, nulls: "first" }
      //     ],
    });

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
