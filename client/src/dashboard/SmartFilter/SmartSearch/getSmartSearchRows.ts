import { getSmartGroupFilter, type DetailedFilter } from "@common/filterUtils";
import { isObject } from "@common/publishUtils";
import {
  _PG_numbers,
  type AnyObject,
  type SelectFunction,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { getValueAsText } from "@components/SearchList/SearchListContent";
import { getSearchHighlight } from "./getSearchHighlight";
import type { Prgl } from "src/App";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import {
  getComputedColumnSelect,
  getTableSelect,
} from "../../W_Table/tableUtils/getTableSelect";

type Args = {
  currentlySearchedColumn: string;
  expression?: SelectFunction;
  term: string;
  matchCase: boolean;
  db: Prgl["db"];
  tableName: string;
  columns: Pick<ValidatedColumnInfo, "name" | "is_pkey" | "udt_name">[];
  detailedFilter: DetailedFilter[];
  extraFilters: AnyObject[] | undefined;
  column?: string | ColumnConfig | undefined;
  selectedColumns: ColumnConfig[] | undefined;
  tables: DBSchemaTableWJoins[];
};
export type SmartSearchResultRows = (AnyObject & {
  prgl_term_highlight: Record<string, (string | string[])[]> | null;
})[];
export const getRows = async (args: Args, limit = 3, matchStart = false) => {
  const {
    db,
    currentlySearchedColumn,
    expression,
    matchCase,
    term,
    tableName,
    columns,
    detailedFilter,
    extraFilters,
    column,
    selectedColumns,
    tables,
  } = args;
  const computedConfig = isObject(column) ? column.computedConfig : undefined;
  const computedExpression =
    expression ?? (computedConfig && getComputedColumnSelect(computedConfig));
  const isAggregate = !!computedConfig?.funcDef.isAggregate;
  const getLikeFilter = (notLike = false, prefix = true) => {
    const operator = `$${notLike ? "n" : ""}${matchCase ? "" : "i"}like`;
    const value = `${prefix ? "" : "%"}${term}%`;
    return computedExpression ?
        { $filter: [computedExpression, operator, value] }
      : { [currentlySearchedColumn]: { [operator]: value } };
  };

  let select: AnyObject =
    computedExpression ?
      { [currentlySearchedColumn]: computedExpression }
    : {
        prgl_term_highlight: {
          $term_highlight: [
            [currentlySearchedColumn],
            term,
            { matchCase, edgeTruncate: 30, returnType: "object" },
          ],
        },
        ...(column && { [isObject(column) ? column.name : column]: 1 }),
      };
  if (computedConfig && selectedColumns) {
    const { select: fullSelect } = await getTableSelect(
      { table_name: tableName, columns: selectedColumns },
      tables,
      db,
      {},
      true,
    );
    select = { ...fullSelect, ...select };
  }

  const searchFilters =
    !term.length ? []
    : isAggregate ? [{ [currentlySearchedColumn]: term }]
    : matchStart ? [getLikeFilter()]
    : [
        getLikeFilter(true),
        computedExpression ?
          getLikeFilter(false, false)
        : {
            $term_highlight: [
              [currentlySearchedColumn],
              term,
              { matchCase, edgeTruncate: 30, returnType: "boolean" },
            ],
          },
      ];

  const finalFilter = {
    $and: [
      ...(extraFilters ?? []),
      ...(isAggregate ? [] : searchFilters),
      ...(detailedFilter.length ? [getSmartGroupFilter(detailedFilter)] : []),
    ],
  };
  const having = isAggregate ? { $and: searchFilters } : undefined;

  const columnInfo = columns.find((c) => c.name === currentlySearchedColumn);
  /** Group increases query time considerably. Must try not to use it when not crucial */
  const groupBy = !columnInfo?.is_pkey && columnInfo?.udt_name !== "uuid";
  const skipSearch = isFruitlessSearch(term, columnInfo);
  const items: AnyObject[] =
    skipSearch ?
      []
    : ((await db[tableName]?.find?.(finalFilter, {
        select,
        limit,
        having,
        groupBy,
      })) ?? []);
  const computedColName = computedExpression && currentlySearchedColumn;
  const result: SmartSearchResultRows = items.map((row) => ({
    ...row,
    prgl_term_highlight:
      computedColName ?
        {
          [computedColName]: getSearchHighlight(
            getValueAsText(row[computedColName]) ?? "",
            term,
            matchCase,
          ),
        }
      : row.prgl_term_highlight,
  }));
  return { result, isAggregate };
};

/**
 * Check if search is pointless. For example if searching for a characters in a numeric column
 */
const isFruitlessSearch = (
  term: string,
  columnInfo: Pick<ValidatedColumnInfo, "udt_name"> | undefined,
) => {
  if (!columnInfo) return false;
  const isNumeric = _PG_numbers.some((v) => v === columnInfo.udt_name);
  if (isNumeric) {
    /** Is searching for negative numbers */
    if (term === "-") {
      return false;
    }
    const isInteger = ["int2", "int4", "int8"].includes(columnInfo.udt_name);
    const termAsNumber = Number(term);
    if (isInteger) {
      if (!Number.isInteger(termAsNumber)) {
        return true;
      }
    } else {
      /** Is searching for fractional numbers */
      if (term === ".") {
        return false;
      }
      if (!Number.isFinite(termAsNumber)) {
        return true;
      }
    }
  }

  const isDate =
    columnInfo.udt_name.startsWith("timestamp") ||
    columnInfo.udt_name === "date";
  if (isDate) {
    const containsOnlyNumbersOrSymbols = term
      .split("")
      .every((c) => !isNaN(Number(c)) || c === "-" || c === ":" || c === " ");
    if (containsOnlyNumbersOrSymbols) {
      return false;
    }
    const english = new Intl.DateTimeFormat("en", { weekday: "long" });
    const englishFormatter = {
      weekDay: new Intl.DateTimeFormat("en", { weekday: "long" }),
      month: new Intl.DateTimeFormat("en", { month: "long" }),
    };
    const clientFormatter = {
      weekDay: new Intl.DateTimeFormat(navigator.language, { weekday: "long" }),
      month: new Intl.DateTimeFormat(navigator.language, { month: "long" }),
    };
    const weekdays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, i + 1);
      return [
        englishFormatter.weekDay.format(date),
        clientFormatter.weekDay.format(date),
      ];
    }).flat();
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2024, i, 1);
      return [
        englishFormatter.month.format(date),
        clientFormatter.month.format(date),
      ];
    }).flat();
    if (
      ![...weekdays, ...months].some((name) =>
        name.toLowerCase().includes(term.toLowerCase()),
      )
    ) {
      return true;
    }
  }
};
const testCases: {
  term: string;
  columnInfo: Pick<ValidatedColumnInfo, "udt_name">;
  expected: boolean;
}[] = [
  {
    term: "1",
    columnInfo: { udt_name: "int4" },
    expected: false,
  },
  {
    term: "1.1",
    columnInfo: { udt_name: "int4" },
    expected: true,
  },
  {
    term: "1.1",
    columnInfo: { udt_name: "float4" },
    expected: false,
  },
  {
    term: "jebruary",
    columnInfo: { udt_name: "date" },
    expected: true,
  },
  {
    term: "february",
    columnInfo: { udt_name: "date" },
    expected: false,
  },
];
testCases.forEach(({ term, columnInfo, expected }) => {
  const actual = isFruitlessSearch(term, columnInfo) ?? false;
  if (actual !== expected) {
    console.error("isFruitlessSearch failed", {
      term,
      columnInfo,
      expected,
      actual,
    });
    throw new Error("isFruitlessSearch failed");
  }
});

export const getSmartSearchRows = async (
  args: Args,
): Promise<SmartSearchResultRows> => {
  /* First we try to match the start. If not enough matches then match any part of text */
  try {
    const { result, isAggregate } = await getRows(args, undefined, true);
    const remaining = 3 - result.length;
    if (args.term && remaining > 0 && !isAggregate) {
      const moreRows = await getRows(args, remaining);
      return [...result, ...moreRows.result];
    }
    return result;
  } catch (e) {
    console.error(e);
  }

  return [];
};
