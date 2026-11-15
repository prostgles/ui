import {
  CORE_FILTER_TYPES,
  DATE_FILTER_TYPES,
  FTS_FILTER_TYPES,
  JOINED_FILTER_TYPES,
  NUMERIC_FILTER_TYPES,
  TEXT_FILTER_TYPES,
  type DetailedFilter,
  type DetailedFilterBase,
  type FilterType,
  type GroupedDetailedFilter,
} from "@common/filterUtils";
import type { Prgl } from "src/App";
import type { DBSchemaTableWJoins } from "../../dashboard/Dashboard/dashboardUtils";
import { getDefaultAgeFilter } from "../../dashboard/DetailedFilterControl/DetailedFilterBaseTypes/AgeFilter";
import { getDefaultGeoFilter } from "../../dashboard/DetailedFilterControl/DetailedFilterBaseTypes/GeoFilter";
import { DEFAULT_VALIDATED_COLUMN_INFO } from "../../dashboard/SmartFilter/smartFilterUtils";

export type PreviewFilter = DetailedFilter | GroupedDetailedFilter;
export type FilterExample = {
  label: string;
  filter: PreviewFilter;
};

export const createExampleFilter = (
  fieldName: string,
  type: FilterType = "=",
): DetailedFilterBase => {
  if (type === "$age" || type === "$ageNow" || type === "$duration") {
    return getDefaultAgeFilter(fieldName, type);
  }
  if (type === "$ST_DWithin") {
    return {
      ...getDefaultGeoFilter(fieldName),
      value: {
        distance: 1000,
        lat: 51.5,
        lng: -0.12,
        name: "London",
        unit: "km",
      },
    };
  }
  const values = sampleValues[fieldName] ?? sampleValues.status;
  const value =
    type === "null" || type === "not null" ? undefined
    : type === "$in" || type === "$nin" || type === "$between" ? values
    : values?.[0];
  return { fieldName, type, value };
};

const sampleValues: Record<string, unknown[]> = {
  status: ["Active", "Pending", "Archived"],
  title: [
    "A long filter value to inspect truncation and tooltips in the minimised view",
  ],
  tags: [
    "Design",
    "Development",
    "Review",
    "Testing",
    "Documentation",
    "Release",
  ],
  amount: [25, 100],
  zero: [0, 1],
  active: [true, false],
  inactive: [false, true],
  created_at: ["2026-01-01", "2026-12-31"],
  updated_at: ["2026-01-01T09:00:00", "2026-12-31T17:30:00"],
  metadata: [{ priority: "high", reviewed: true }],
};

export const filterExampleTable: DBSchemaTableWJoins = {
  name: "filter_examples",
  label: "Examples",
  icon: undefined,
  sort: undefined,
  card: undefined,
  referenceDisplay: undefined,
  rowIconColumn: undefined,
  managedTableType: undefined,
  oid: 0,
  qualifiedNameParts: { schema: "public", name: "filter_examples" },
  publishInfo: { select: { syncConfig: undefined } },
  joins: [],
  joinsV2: [],
  joinOptions: [],
  columns: [
    ...["status", "title", "tags"].map((name) => ({
      name,
      udt_name: "text" as const,
      tsDataType: "string" as const,
    })),
    ...["amount", "zero"].map((name) => ({
      name,
      udt_name: "numeric" as const,
      tsDataType: "number" as const,
    })),
    ...["active", "inactive"].map((name) => ({
      name,
      udt_name: "bool" as const,
      tsDataType: "boolean" as const,
    })),
    {
      name: "created_at",
      udt_name: "date" as const,
      tsDataType: "string" as const,
    },
    {
      name: "updated_at",
      udt_name: "timestamp" as const,
      tsDataType: "string" as const,
    },
    {
      name: "location",
      udt_name: "geometry" as const,
      tsDataType: "any" as const,
    },
    {
      name: "metadata",
      udt_name: "jsonb" as const,
      tsDataType: "any" as const,
    },
  ].map((column) => ({
    ...DEFAULT_VALIDATED_COLUMN_INFO,
    ...column,
    label: column.name,
    data_type: column.udt_name,
    style: undefined,
    icon: undefined,
    renderAs: undefined,
  })),
};

export const filterExampleTables = [filterExampleTable];
export const filterExampleContext = [
  {
    name: "user",
    columns: [
      { ...DEFAULT_VALIDATED_COLUMN_INFO, name: "name", label: "Name" },
    ],
    data: { name: "Alex" },
  },
];

/* Only suggestion reads are needed for these local previews. */
export const filterExampleDb = {
  [filterExampleTable.name]: {
    find: (
      _filter: unknown,
      params: {
        select: Record<string, unknown>;
        returnType?: string;
        limit?: number;
      },
    ) => {
      if (params.limit === 0) return Promise.resolve([]);
      const [columnName = "status"] = Object.keys(params.select).filter(
        (key) => key !== "prgl_term_highlight",
      );
      const values = sampleValues[columnName] ?? [];
      return Promise.resolve(
        params.returnType === "values" ?
          [...values]
        : values.map((value) => ({
            [columnName]: value,
            prgl_term_highlight: { [columnName]: [String(value)] },
          })),
      );
    },
  },
} as unknown as Prgl["db"];

const groupConditions = [
  createExampleFilter("status"),
  createExampleFilter("amount", ">="),
];

export const filterExamples: FilterExample[] = [
  ...[
    { fieldName: "status", types: CORE_FILTER_TYPES },
    { fieldName: "status", types: TEXT_FILTER_TYPES },
    { fieldName: "status", types: FTS_FILTER_TYPES },
    { fieldName: "amount", types: NUMERIC_FILTER_TYPES },
    { fieldName: "created_at", types: DATE_FILTER_TYPES },
  ].flatMap(({ fieldName, types }) =>
    types.map(({ key, label }) => ({
      label: `${fieldName} · ${label} (${key})`,
      filter: createExampleFilter(fieldName, key),
    })),
  ),
  ...(
    [
      { label: "Long text", fieldName: "title", type: "=" },
      { label: "Long list", fieldName: "tags", type: "$in" },
      { label: "Zero", fieldName: "zero", type: "=" },
      { label: "Boolean true", fieldName: "active", type: "=" },
      { label: "Boolean false", fieldName: "inactive", type: "=" },
      { label: "Date", fieldName: "created_at", type: "=" },
      { label: "Date range", fieldName: "created_at", type: "$between" },
      { label: "Timestamp range", fieldName: "updated_at", type: "$between" },
      { label: "Location", fieldName: "location", type: "$ST_DWithin" },
      { label: "JSON", fieldName: "metadata", type: "=" },
      { label: "Search all columns", fieldName: "*", type: "$term_highlight" },
    ] satisfies { label: string; fieldName: string; type: FilterType }[]
  ).map(({ label, fieldName, type }) => ({
    label,
    filter: createExampleFilter(fieldName, type),
  })),
  {
    label: "Session value",
    filter: {
      ...createExampleFilter("status"),
      contextValue: { objectName: "user", objectPropertyName: "name" },
    },
  },
  ...JOINED_FILTER_TYPES.flatMap((type) => [
    {
      label: `${type} · single condition`,
      filter: {
        type,
        path: [filterExampleTable.name],
        filter: createExampleFilter("status"),
      },
    },
    {
      label: `${type} · grouped conditions`,
      filter: {
        type,
        path: [filterExampleTable.name],
        filter: { $or: groupConditions },
      },
    },
  ]),
  { label: "AND group", filter: { $and: groupConditions } },
  { label: "OR group", filter: { $or: groupConditions } },
  {
    label: "Nested groups",
    filter: {
      $and: [
        createExampleFilter("status"),
        {
          $or: [
            createExampleFilter("amount", ">"),
            createExampleFilter("active"),
          ],
        },
      ],
    },
  },
];
