import { mdiFunction, mdiSigma } from "@mdi/js";
import type { ValidatedColumnInfo } from "prostgles-types";
import { _PG_date, _PG_interval, _PG_numbers } from "prostgles-types";
import React, { useMemo } from "react";
import Select from "../../../components/Select/Select";
import type { ColumnConfig } from "./ColumnMenu";

type P = {
  selectedFunction?: string;
  column: string | undefined;
  /**
   * If defined then this is not a nested column
   */
  wColumns: ColumnConfig[] | undefined;
  tableColumns: ValidatedColumnInfo[];
  onSelect: (func: FuncDef | undefined) => void;
  className?: string;
  currentNestedColumnName?: string;
};

const funcAcceptsColumn = (f: FuncDef, targetCols: ValidatedColumnInfo[]) => {
  return (
    (!f.tsDataTypeCol && !f.udtDataTypeCol) ||
    f.tsDataTypeCol === "any" ||
    f.udtDataTypeCol === "any" ||
    (Array.isArray(f.udtDataTypeCol) &&
      f.udtDataTypeCol.some((udt) =>
        targetCols.some((c) => c.udt_name === udt),
      )) ||
    (Array.isArray(f.tsDataTypeCol) &&
      f.tsDataTypeCol.some((tsd) =>
        targetCols.some((c) => c.tsDataType === tsd),
      ))
  );
};

export const FunctionSelector = ({
  column,
  tableColumns,
  onSelect,
  selectedFunction,
  wColumns: parentColumns,
  className,
  currentNestedColumnName,
}: P) => {
  const cannotUseAggs = useMemo(
    () =>
      parentColumns?.some(
        (c) => c.show && c.nested && c.name !== currentNestedColumnName,
      ),
    [parentColumns, currentNestedColumnName],
  );

  const funcs = useMemo(() => {
    const columnInfo = tableColumns.find((c) => c.name === column);
    const funcs = [...getAggFuncs(), ...getFuncs()]
      .map((f) => ({
        ...f,
        isAllowedForColumn: funcAcceptsColumn(
          f,
          columnInfo ? [columnInfo] : tableColumns,
        ),
      }))
      .filter((f) => f.isAllowedForColumn);
    return funcs;
  }, [column, tableColumns]);

  const list = (
    <Select
      className={className}
      style={{ maxHeight: "500px" }}
      id="func_type"
      value={selectedFunction}
      label={"Applied function"}
      showSelectedSublabel={true}
      data-command="FunctionSelector"
      optional={true}
      onChange={(key) => {
        const def = funcs.find((f) => f.key === key);
        onSelect(def);
      }}
      noSearchLimit={5}
      variant={selectedFunction ? undefined : "search-list-only"}
      fullOptions={funcs.map((def) => {
        return {
          ...def,
          iconPath: def.isAggregate ? mdiSigma : mdiFunction,
          disabledInfo:
            cannotUseAggs && def.isAggregate ?
              "Cannot use aggregations with nested column"
            : def.isAllowedForColumn ? undefined
            : "Not suitable for the selected column data type",
        };
      })}
    />
  );

  return list;
};

const infoTypes = {
  string: { udt_name: "text", tsDataType: "string" },
  number: { udt_name: "numeric", tsDataType: "number" },
  date: { udt_name: "date", tsDataType: "string" },
  interval: { udt_name: "interval", tsDataType: "any" },
  geo: { udt_name: "geography", tsDataType: "any" },
} as const;

export type FuncDef = {
  key: string;
  label: string;
  subLabel: string;
  tsDataTypeCol?: "any" | Array<ValidatedColumnInfo["tsDataType"]>;
  udtDataTypeCol?: "any" | Array<ValidatedColumnInfo["udt_name"]>;
  outType: Pick<ValidatedColumnInfo, "tsDataType" | "udt_name">;
  isAggregate?: boolean;
};

function getFuncs(): FuncDef[] {
  const GeometryFuncs: {
    key: string;
    label: string;
    subLabel: string;
    outType: Pick<ValidatedColumnInfo, "tsDataType" | "udt_name">;
  }[] = [
    {
      key: "$ST_Length",
      label: "ST_Length",
      subLabel:
        "returns the 2D Cartesian length of the geometry if it is a LineString, MultiLineString, ST_Curve, ST_MultiCurve.",
      outType: { udt_name: "numeric", tsDataType: "number" },
    },
    {
      key: "$ST_AsText",
      label: "ST_AsText",
      subLabel:
        "Returns the OGC Well-Known Text (WKT) representation of the geometry/geography",
      outType: { udt_name: "text", tsDataType: "string" },
    },
    {
      key: "$ST_AsGeoJSON",
      label: "ST_AsGeoJSON",
      subLabel:
        "Returns a geometry as a GeoJSON 'geometry', or a row as a GeoJSON 'feature'",
      outType: { udt_name: "json", tsDataType: "string" },
    },
    {
      key: "$ST_SnapToGrid",
      label: "ST_SnapToGrid",
      subLabel:
        "Snap all points of the input geometry to the grid defined by its origin and cell size. Remove consecutive points falling on the same cell",
      outType: { udt_name: "geometry", tsDataType: "any" },
    },
  ];

  const DateFuncs = [
    {
      key: "$datetime",
      label: "Date and time",
      subLabel: "Timestamp formated as 'YYYY-MM-DD HH24:MI'",
    },
    {
      key: "$timedate",
      label: "Time and date",
      subLabel: "Timestamp formated as 'HH24:MI YYYY-MM-DD'",
    },
    // { key: "$DayNo",    label: "", subLabel: "Timestamp formated as 'DD" },
    // { key: "$dowUS",    label: "", subLabel: "Timestamp formated as 'D" },
    {
      key: "$D",
      label: "Day of week number",
      subLabel:
        "Timestamp formated as 'D'. Day of the week, Sunday (1) to Saturday (7)",
    },
    {
      key: "$dy",
      label: "Day name short",
      subLabel:
        "Timestamp formated as 'dy'. Abbreviated lower case day name (3 chars in English, localized lengths vary)",
    },
    {
      key: "$Dy",
      label: "Day Name short",
      subLabel:
        "Timestamp formated as 'Dy'. Abbreviated capitalized day name (3 chars in English, localized lengths vary)",
    },
    {
      key: "$DD",
      label: "Day of month",
      subLabel: "Timestamp formated as 'DD'. Day of month (01-31)",
    },
    {
      key: "$ID",
      label: "ISO 8601 day of the week",
      subLabel: "Timestamp formated as 'ID'. Monday (1) to Sunday (7)",
    },
    {
      key: "$MM",
      label: "Month number",
      subLabel: "Timestamp formated as 'MM'. Month number (01-12)",
    },
    // { key: "$MonthNo",  label: "Month number", subLabel: "Timestamp formated as 'MM. Month number (01-12)" },
    {
      key: "$yy",
      label: "Year short",
      subLabel: "Timestamp formated as 'YY'. Last 2 digits of year",
    },
    // { key: "$yr",       label: "", subLabel: "Timestamp formated as 'yy" },
    {
      key: "$day",
      label: "Day name",
      subLabel: "Timestamp formated as 'day'. Full lower case day name",
    },
    {
      key: "$Day",
      label: "Day Name",
      subLabel: "Timestamp formated as 'Day'. Full capitalized day name",
    },
    // { key: "$dow",      label: "", subLabel: "Timestamp formated as 'ID" },
    {
      key: "$mon",
      label: "Month name short",
      subLabel:
        "Timestamp formated as 'mon'. Abbreviated lower case month name (3 chars in English, localized lengths vary)",
    },
    {
      key: "$Mon",
      label: "Month Name short",
      subLabel:
        "Timestamp formated as 'Mon'. Abbreviated capitalized month name (3 chars in English, localized lengths vary)",
    },
    {
      key: "$month",
      label: "Month name",
      subLabel: "Timestamp formated as 'month'. Full lower case month name ",
    },
    {
      key: "$Month",
      label: "Month Name",
      subLabel: "Timestamp formated as 'Month'. Full capitalized month name ",
    },
    {
      key: "$date",
      label: "Date",
      subLabel: "Timestamp formated as 'YYYY-MM-DD'",
    },
    {
      key: "$time",
      label: "Time",
      subLabel: "Timestamp formated as 'HH24:MI'. 24 Hour time format",
    },
    // { key: "$year",     label: "", subLabel: "Timestamp formated as 'yyyy" },
    {
      key: "$yyyy",
      label: "Year full",
      subLabel: "Timestamp formated as 'yyyy'. Year (4 or more digits)",
    },
    {
      key: "$time12",
      label: "Time 12H",
      subLabel: "Timestamp formated as 'HH:MI'. 12 Hour time format",
    },
    {
      key: "$timeAM",
      label: "Time AM/PM",
      subLabel:
        "Timestamp formated as 'HH:MI AM'. 24 Hour time format with AM/PM meridiem indicators",
    },
    // { label: "$to_char", subLabel: "format dates and strings. Eg: [current_timestamp, 'HH12:MI:SS']" },
    {
      key: "$age",
      label: "Age at start of day",
      subLabel: "Age of timestamp compared to start of today",
    },
    {
      key: "$ageNow",
      label: "Age",
      subLabel: "Age of timestamp compared to now",
    },
    {
      key: "$duration",
      label: "Duration",
      subLabel:
        "Duration between another date field. Expressed as an interval of years, months, days, minutes",
    },
  ] as const;

  const StringFuncs = [
    // { label: "$left", subLabel: "[column_name, number] -> substring"  },
    // { label: "$right", subLabel: "[column_name, number] -> substring"   },
    {
      key: "$trim",
      label: "TRIM",
      subLabel:
        "Remove spaces or set of characters from the leading or trailing or both side from a string",
    },
    {
      key: "$upper",
      label: "Uppercase",
      subLabel: "Convert all characters to uppercase",
    },
    {
      key: "$lower",
      label: "Lowercase",
      subLabel: "Convert all characters to lowercase",
    },
    {
      key: "$length",
      label: "Length",
      subLabel: "Number of characters in the string",
    },
    {
      key: "$reverse",
      label: "Reverse",
      subLabel: "Arrange a string in reverse order",
    },
    {
      key: "$initcap",
      label: "Capitalise Initials",
      subLabel:
        "Convert the first letter of each word to upper case and the remaining to lower case",
    },
    {
      key: "$unnest_words",
      label: "Split into words",
      subLabel: "Split text from a column at spaces",
    },
  ];

  const NumberFuncs = [
    {
      key: "$ceil",
      label: "Ceil",
      subLabel:
        "Smallest integer which is greater than, or equal to, the specified numeric expression",
    },
    {
      key: "$floor",
      label: "Floor",
      subLabel:
        "Smallest integer which is lower than, or equal to, the specified numeric expression",
    },
    {
      key: "$sign",
      label: "Sign",
      subLabel:
        "Returns -1 0 or 1 depending of the column value. Returns null if null is provided",
    },
    { key: "$round", label: "Round", subLabel: "Round to nearest integer" },
    // { key: "$sum", label: "Sum",  subLabel: "Sum of all values" },
    // { key: "$avg", label: "Average",  subLabel: "Average of all values" },
  ];

  const AnyFuncs = [
    {
      key: "$template_string",
      label: "Template string",
      subLabel:
        "Create a string based on column values. E.g.: Dear {FirstName} {LastName}, ...",
    },
  ];

  const res: FuncDef[] = [
    ...GeometryFuncs.map((f) => ({
      ...f,
      udtDataTypeCol: ["geography", "geometry"] as any,
    })),
    ...DateFuncs.map((f) => ({
      ...f,
      outType:
        f.key.startsWith("$age") || f.key === "$duration" ?
          infoTypes.interval
        : infoTypes.string,
      udtDataTypeCol: ["int8", ..._PG_date] as any,
    })),
    ...StringFuncs.map((f) => ({
      ...f,
      outType: infoTypes.string,
      tsDataTypeCol: ["string"] as any,
    })),
    ...NumberFuncs.map((f) => ({
      ...f,
      outType: infoTypes.number,
      tsDataTypeCol: ["number"] as any,
    })),
    ...AnyFuncs.map((f) => ({
      ...f,
      outType: infoTypes.string,
    })),
  ].map((f) => ({
    ...f,
  }));

  return res;
}

const numericOrDate: FuncDef["udtDataTypeCol"] = [
  ..._PG_date,
  ..._PG_interval,
  ..._PG_numbers,
];
const numeric: FuncDef["udtDataTypeCol"] = [..._PG_interval, ..._PG_numbers];

export const CountAllFunc: FuncDef & { name: string } = {
  key: "$countAll",
  name: "COUNT ALL",
  label: "Count of all rows",
  subLabel: "",
  tsDataTypeCol: undefined,
  outType: infoTypes.number,
  isAggregate: true,
};

const aggFunctions = [
  CountAllFunc,
  {
    key: "$count",
    name: "COUNT",
    label: "Count of rows for which the column value is not null",
    tsDataTypeCol: "any",
    outType: infoTypes.number,
  },

  {
    key: "$max",
    name: "MAX",
    label: "Maximum value",
    udtDataTypeCol: numericOrDate,
    outType: infoTypes.number,
  },
  {
    key: "$min",
    name: "MIN",
    label: "Minimum value",
    udtDataTypeCol: numericOrDate,
    outType: infoTypes.number,
  },
  {
    key: "$avg",
    name: "AVERAGE",
    label: "Average value",
    udtDataTypeCol: numeric,
    outType: infoTypes.number,
  },
  {
    key: "$sum",
    name: "SUM",
    label: "Sum of all non-null input values",
    udtDataTypeCol: numeric,
    outType: infoTypes.number,
  },
  {
    key: "$string_agg",
    name: "AGGREGATE STRING",
    label:
      "Non-null string/text values concatenated into a string, separated by delimiter",
    tsDataTypeCol: ["string"] as ["string"],
    outType: infoTypes.string,
  },
] as const satisfies readonly (Omit<FuncDef, "subLabel"> & { name: string })[];

function getAggFuncs(): FuncDef[] {
  return aggFunctions.map(
    (f) =>
      ({
        ...f,
        isAggregate: true,
        label: f.name,
        subLabel: f.label,
      }) satisfies FuncDef,
  );
}
