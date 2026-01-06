import type { DetailedFilter, DetailedFilterBase } from "@common/filterUtils";
import { getFinalFilter } from "@common/filterUtils";
import type {
  DBHandlerClient,
  TableHandlerClient,
} from "prostgles-client/dist/prostgles";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import type { ContextDataSchema } from "../AccessControl/OptionControllers/FilterControl";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";
import type { FilterWrapperProps } from "../DetailedFilterControl/FilterWrapper";

export const testFilter = (
  f: DetailedFilter,
  tableHandler: TableHandlerClient,
  cb: (err: unknown, ok?: true) => any,
) => {
  return tableHandler
    .findOne(getFinalFilter(f))
    .then(() => cb(undefined, true))
    .catch((err: unknown) => cb(err));
};

// export const getSmartGroupFilter = (
//   detailedFilter: SmartGroupFilter = [],
//   extraFilters?: { detailed?: SmartGroupFilter; filters?: AnyObject[] },
//   operand?: "and" | "or",
// ): AnyObject => {
//   let input = detailedFilter;
//   if (extraFilters?.detailed) {
//     input = [...detailedFilter, ...extraFilters.detailed];
//   }
//   let output = input.map((f) => getFinalFilter(f));
//   if (extraFilters?.filters) {
//     output = output.concat(extraFilters.filters);
//   }
//   const result = simplifyFilter({
//     [`$${operand || "and"}`]: output.filter(isDefined),
//   });

//   return result ?? {};
// };

type TableColumn = ValidatedColumnInfo & {
  type: "column";
};
type ComputedColumn = Pick<
  ValidatedColumnInfo,
  "name" | "label" | "tsDataType" | "udt_name"
> & {
  type: "computed";
  /** Needed for aggregate functions */
  columns: ColumnConfig[];
} & Pick<Required<ColumnConfig>, "computedConfig">;

export type FilterColumn = TableColumn | ComputedColumn;

export type BaseFilterProps = Pick<FilterWrapperProps, "variant"> & {
  db: DBHandlerClient;
  tableName: string;
  onChange: (filter?: DetailedFilter) => void;
  tables: CommonWindowProps["tables"];
  column: FilterColumn;
  /**
   * Used to ensure that narrow down options based on other filters.
   * No point in allowing the user to filter on values that are already filtered out.
   */
  otherFilters: DetailedFilter[];
  /**
   * Additional filters to always apply on top of otherFilters.
   */
  extraFilters: AnyObject[] | undefined;
  error?: unknown;
  filter?: DetailedFilterBase;
  className?: string;
  style?: React.CSSProperties;
  contextData?: ContextDataSchema;
};

export const DEFAULT_VALIDATED_COLUMN_INFO = {
  comment: "",
  data_type: "text",
  delete: false,
  element_type: "",
  element_udt_name: "",
  filter: true,
  has_default: false,
  insert: false,
  udt_name: "text",
  is_nullable: true,
  is_pkey: false,
  ordinal_position: -1,
  select: true,
  orderBy: true,
  tsDataType: "string",
  update: true,
  is_updatable: true,
  is_generated: false,
} as const;
