import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import { isEmpty } from "../../../utils";

import {
  getSmartGroupFilter,
  type DetailedFilterBase,
} from "@common/filterUtils";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";

export const getRowFilter = async (
  row: AnyObject,
  table: DBSchemaTableWJoins,
  columnConfig: { name: string }[] | undefined,
  tableHandler: Partial<TableHandlerClient<AnyObject, void>>,
): Promise<
  | { filter: DetailedFilterBase[]; error: undefined }
  | { filter: undefined; error: string }
> => {
  let rowFilter: DetailedFilterBase[] | undefined;
  const { columns } = table;
  let pkeys = columns.filter((c) => c.filter && c.is_pkey);
  const uniqueColumnGroup = table.info.uniqueColumnGroups?.find((colNames) =>
    colNames.every((colName) => columns.some((c) => c.name === colName)),
  );
  if (!pkeys.length && uniqueColumnGroup) {
    pkeys = columns.filter(
      (c) => c.filter && uniqueColumnGroup.includes(c.name),
    );
  }
  if (
    pkeys.length &&
    (!columnConfig ||
      columnConfig.some((c) => pkeys.find((pk) => pk.name === c.name)))
    /** Allow using pkey/unique cols after func applied? */
  ) {
    pkeys.map((pkey) => {
      rowFilter ??= [];
      rowFilter.push({
        fieldName: pkey.name,
        value: row[pkey.name],
      });
    });
  } else {
    const dissallowedUdtTypes = ["interval"];
    const filterCols = columns.filter(
      (c) =>
        !dissallowedUdtTypes.includes(c.udt_name) &&
        c.filter &&
        (["number", "string", "boolean", "Date"].includes(c.tsDataType) ||
          c.udt_name === "jsonb"),
    );

    /** Trim value if too long to avoid btrim error */
    const getSlicedValue = (v) => {
      if (typeof v === "string" && v.length > 400) {
        return { $like: `${v.slice(0, 400)}%` };
      }

      return v;
    };

    rowFilter = filterCols.map((c) => {
      const val = row[c.name];
      return {
        fieldName: c.name,
        value:
          (
            c.udt_name.startsWith("json") &&
            typeof val === "string" &&
            !val.startsWith('"')
          ) ?
            JSON.stringify(val)
          : getSlicedValue(val),
      };
    });
    rowFilter = rowFilter.filter((f, i, arr) => {
      const filterStrLen = JSON.stringify(
        getSmartGroupFilter(arr.slice(0, i + 1)),
      ).length;
      return filterStrLen * 4 < 2104;
    });
  }

  const _rowFilter = getSmartGroupFilter(rowFilter);
  /** This check is needed for subscriptions */
  if (JSON.stringify(_rowFilter).length * 4 > 2704 || isEmpty(_rowFilter)) {
    return {
      filter: undefined,
      error:
        "Could not create filter for record" +
        (!pkeys.length ? ". Create a primary key to fix this issue" : ""),
    };
  }

  const [firstRecord, secondRecord] =
    (await tableHandler.find?.(_rowFilter, { select: "", limit: 2 })) ?? [];
  if (!firstRecord) {
    console.log(_rowFilter);
    return {
      filter: undefined,
      error: "Could not create a single row filter. Record not found.",
    };
  } else if (secondRecord) {
    return {
      filter: undefined,
      error:
        "Could not create a single row filter. More than one record returned" +
        (!pkeys.length ? ". Create a primary key to fix this issue" : ""),
    };
  } else {
    return { filter: rowFilter ?? [], error: undefined };
  }
};
