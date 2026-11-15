import {
  getJSONBSchemaValidationError,
  parsedJoinPathSchema,
  type JSONB,
} from "prostgles-types";
import {
  CORE_FILTER_TYPES,
  DATE_FILTER_TYPES,
  FTS_FILTER_TYPES,
  GEO_FILTER_TYPES,
  JOINED_FILTER_TYPES,
  NUMERIC_FILTER_TYPES,
  TEXT_FILTER_TYPES,
  type DetailedFilter,
  type GroupedDetailedFilter,
} from "./filterUtils";

const nestedFilterSchema = { record: { values: "unknown" } } as const;

export const groupedDetailedFilterSchema = {
  oneOfType: [
    { $and: { arrayOf: nestedFilterSchema } },
    { $or: { arrayOf: nestedFilterSchema } },
  ],
} as const satisfies JSONB.FieldType;

const filterOptionsSchema = {
  disabled: { type: "boolean", optional: true },
  minimised: { type: "boolean", optional: true },
} as const;

const detailedFilterSchema = {
  oneOf: [
    groupedDetailedFilterSchema,
    {
      type: {
        ...filterOptionsSchema,
        fieldName: "string",
        type: {
          enum: [
            ...CORE_FILTER_TYPES,
            ...DATE_FILTER_TYPES,
            ...FTS_FILTER_TYPES,
            ...GEO_FILTER_TYPES,
            ...NUMERIC_FILTER_TYPES,
            ...TEXT_FILTER_TYPES,
          ].map(({ key }) => key),
          optional: true,
        },
        value: { type: "unknown", optional: true, nullable: true },
        contextValue: {
          optional: true,
          type: {
            objectName: { enum: ["user"] },
            objectPropertyName: "string",
          },
        },
        ftsFilterOptions: { optional: true, type: { lang: "string" } },
        complexFilter: {
          optional: true,
          oneOfType: [
            {
              type: { enum: ["controlled"] },
              funcName: { type: "string", optional: true },
              argsLeftToRight: "boolean",
              comparator: "string",
              otherField: { type: "string", optional: true, nullable: true },
            },
            {
              type: { enum: ["$filter"] },
              leftExpression: nestedFilterSchema,
            },
          ],
        },
      },
    },
    {
      type: {
        ...filterOptionsSchema,
        type: { enum: JOINED_FILTER_TYPES },
        path: {
          arrayOf: {
            oneOf: [
              "string",
              {
                type: {
                  ...parsedJoinPathSchema.type,
                  on: { ...parsedJoinPathSchema.type.on, optional: true },
                },
              },
            ],
          },
        },
        filter: nestedFilterSchema,
      },
    },
  ],
} as const satisfies JSONB.FieldType;

/** Validate recursive groups and joins without limiting their nesting depth. */
export const parseDetailedFilter = (
  value: unknown,
): DetailedFilter | GroupedDetailedFilter => {
  const { error } = getJSONBSchemaValidationError(detailedFilterSchema, value);
  if (error) throw new Error(`Invalid detailed filter: ${error}`);
  const filter = value as DetailedFilter | GroupedDetailedFilter;
  if ("$and" in filter || "$or" in filter) {
    const filters = "$and" in filter ? filter.$and : filter.$or;
    filters.forEach(parseDetailedFilter);
  } else if ("path" in filter) {
    if (!filter.path.length) throw new Error("A joined filter requires a path");
    parseDetailedFilter(filter.filter);
  }
  return filter;
};
