import type {
  DetailedFilter,
  DetailedFilterBase,
  GroupedDetailedFilter,
} from "@common/filterUtils";
import { reverseParsedPath } from "prostgles-types";
import { getComputedColumnSelect } from "../../tableUtils/getTableSelect";
import type { ColumnConfig } from "../ColumnMenu";

export type LinkedRecordsSearchFilter = DetailedFilter | GroupedDetailedFilter;

export const getLinkedRecordsFilter = ({
  column,
  nestedColumn,
  nestedRow,
  parentRow,
  rootTableName,
}: {
  column: Omit<ColumnConfig, "format">;
  nestedColumn?: Omit<ColumnConfig, "nested">;
  nestedRow: undefined | Record<string, unknown>;
  parentRow: Record<string, unknown>;
  rootTableName: string;
}):
  | {
      searchFilter: LinkedRecordsSearchFilter[];
    }
  | undefined => {
  const { nested } = column;
  const aggregateConfig = nestedColumn?.computedConfig;
  const firstJoin = nested?.path[0];
  if (!firstJoin || (nestedColumn && !aggregateConfig?.funcDef.isAggregate)) {
    return;
  }

  const rootColumnNames = getParentTableJoinColumnNames(column);
  if (
    !rootColumnNames.length ||
    rootColumnNames.some((columnName) => parentRow[columnName] === undefined)
  ) {
    return;
  }

  const rootFilters: DetailedFilterBase[] = rootColumnNames.map(
    (fieldName) => ({
      fieldName,
      value: parentRow[fieldName],
      minimised: true,
    }),
  );
  const rootFilter =
    rootFilters.length === 1 ? rootFilters[0]! : { $and: rootFilters };
  const aggregateFilter = aggregateConfig?.aggregateOptions?.filter;
  const aggregateColumnNonNullFilter: DetailedFilterBase | undefined =
    aggregateConfig?.column ?
      {
        fieldName: aggregateConfig.column,
        type: "not null",
        minimised: true,
      }
    : undefined;

  const nonAggregateNestedColumns =
    nestedRow ?
      nested.columns.filter(
        (child) => child.show && !child.computedConfig?.funcDef.isAggregate,
      )
    : [];
  if (
    nonAggregateNestedColumns.some(
      (child) => nestedRow![child.name] === undefined,
    )
  ) {
    return;
  }
  const nestedRowFilters: DetailedFilterBase[] = nonAggregateNestedColumns.map(
    (child) => ({
      fieldName: child.name,
      type: "$eq",
      value: nestedRow![child.name],
      ...(child.computedConfig && {
        complexFilter: {
          type: "$filter" as const,
          leftExpression: getComputedColumnSelect(child.computedConfig),
        },
      }),
      minimised: true,
    }),
  );

  return {
    searchFilter: [
      ...(nested.detailedFilter ?? []),
      ...nestedRowFilters,
      aggregateFilter,
      aggregateColumnNonNullFilter,
      {
        type: "$existsJoined",
        path: reverseParsedPath(nested.path.slice(), rootTableName),
        filter: rootFilter,
        minimised: true,
      },
    ].filter((filter): filter is LinkedRecordsSearchFilter => !!filter),
  };
};

/**
 * Adds parent table join column names for a given nested column.
 * This ensures we return only the parent row linked records
 */
export const getParentTableJoinColumnNames = (
  column: Omit<ColumnConfig, "format">,
) => {
  const nested = column.nested;
  if (
    !nested ||
    !(
      column.action?.type === "relatedRecords" ||
      nested.display?.type === "entities" ||
      nested.columns.some(
        (child) => child.show && child.action?.type === "relatedRecords",
      )
    )
  ) {
    return [];
  }
  return Array.from(
    new Set(
      column.nested?.path[0]?.on.flatMap((constraint) =>
        Object.keys(constraint),
      ) ?? [],
    ),
  );
};
