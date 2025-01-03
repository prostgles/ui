import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import {
  type ValidatedColumnInfo,
  type AnyObject,
  _PG_numbers,
} from "prostgles-types";
import type { SmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import { getSmartGroupFilter } from "../smartFilterUtils";
import type { ColumnConfig } from "../../W_Table/ColumnMenu/ColumnMenu";
import { isObject } from "../../../../../commonTypes/publishUtils";
import {
  getComputedColumnSelect,
  getTableSelect,
} from "../../W_Table/tableUtils/getTableSelect";
import type { DashboardState } from "../../Dashboard/Dashboard";

type Args = {
  currentlySearchedColumn: string;
  term: string;
  matchCase: boolean;
  db: DBHandlerClient;
  tableName: string;
  columns: Pick<ValidatedColumnInfo, "name" | "is_pkey" | "udt_name">[];
  detailedFilter: SmartGroupFilter;
  extraFilters: AnyObject[] | undefined;
  column?: string | ColumnConfig | undefined;
  selectedColumns: ColumnConfig[] | undefined;
  tables: Required<DashboardState>["tables"];
};
export type SmartSearchResultRows = {
  prgl_term_highlight: string[];
}[];
export const getRows = async (args: Args, limit = 3, matchStart = false) => {
  const {
    db,
    currentlySearchedColumn,
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
  const getLikeFilter = (notLike = false) => ({
    [currentlySearchedColumn]: {
      [`$${notLike ? "n" : ""}${matchCase ? "" : "i"}like`]: `${term}%`,
    },
  });

  /** If single column then include it to later extract exact value */
  let computedCol: ColumnConfig | undefined;
  let isAggregate = false;
  const prgl_term_highlight = {
    $term_highlight: [
      [currentlySearchedColumn],
      term,
      { matchCase, edgeTruncate: 30, returnType: "object" },
    ],
  };
  let select: { prgl_term_highlight: AnyObject } = { prgl_term_highlight };
  if (column) {
    if (isObject(column)) {
      if (column.computedConfig) {
        computedCol = column;
        isAggregate = !!column.computedConfig.funcDef.isAggregate;
        select[column.name] = getComputedColumnSelect(column.computedConfig);
        if (selectedColumns) {
          const { select: fullSelect } = await getTableSelect(
            { table_name: tableName, columns: selectedColumns },
            tables,
            db,
            {},
            true,
          );
          select = {
            ...select,
            ...fullSelect,
          };
        }
        select.prgl_term_highlight = getComputedColumnSelect(
          column.computedConfig,
        );
      } else {
        select[column.name] = 1;
      }
    } else {
      select[column] = 1;
    }
  }

  const searchFilters =
    !term.length ? []
    : isAggregate ? [{ [currentlySearchedColumn]: term }]
    : matchStart ? [getLikeFilter()]
    : [
        getLikeFilter(true),
        {
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
  const items =
    skipSearch ?
      []
    : ((await db[tableName]?.find?.(finalFilter, {
        select,
        limit,
        having,
        groupBy,
      })) ?? []);
  const computedColName = computedCol?.name;
  const result =
    computedColName ?
      items.map((d) => ({
        ...d,
        prgl_term_highlight: {
          [computedColName]: [d[computedColName].toString()],
        },
      }))
    : items;
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
    const englishFormatter = {
      weekDay: new Intl.DateTimeFormat("en", { weekday: "long" }).format,
      month: new Intl.DateTimeFormat("en", { month: "long" }).format,
    };
    const clientFormatter = {
      weekDay: new Intl.DateTimeFormat(navigator.language, { weekday: "long" })
        .format,
      month: new Intl.DateTimeFormat(navigator.language, { month: "long" })
        .format,
    };
    const weekdays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, i + 1);
      return [englishFormatter.weekDay(date), clientFormatter.weekDay(date)];
    }).flat();
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2024, i, 1);
      return [englishFormatter.month(date), clientFormatter.month(date)];
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
    if (remaining > 0 && !isAggregate) {
      const moreRows = await getRows(args, remaining);
      return [...result, ...moreRows.result];
    }
    return result;
  } catch (e) {
    console.error(e);
  }

  return [];
};
