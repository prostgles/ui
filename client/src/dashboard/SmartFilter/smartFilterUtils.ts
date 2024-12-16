import type {
  DBHandlerClient,
  TableHandlerClient,
} from "prostgles-client/dist/prostgles";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import type {
  DetailedFilterBase,
  SimpleFilter,
  SmartGroupFilter,
} from "../../../../commonTypes/filterUtils";
import { getFinalFilter } from "../../../../commonTypes/filterUtils";
import { isDefined } from "../../utils";
import type { ContextDataSchema } from "../AccessControl/OptionControllers/FilterControl";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import { simplifyFilter } from "../W_Table/tableUtils/tableUtils";
import type { FilterWrapperProps } from "./FilterWrapper";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";

export const testFilter = (
  f: SimpleFilter,
  tableHandler: TableHandlerClient,
  cb: (err: any, ok?: true) => any,
) => {
  return tableHandler
    .findOne(getFinalFilter(f))
    .then(() => cb(undefined, true))
    .catch((err) => cb(err));
};

export const getSmartGroupFilter = (
  detailedFilter: SmartGroupFilter = [],
  extraFilters?: { detailed?: SmartGroupFilter; filters?: AnyObject[] },
  operand?: "and" | "or",
): AnyObject => {
  let input = detailedFilter;
  if (extraFilters?.detailed) {
    input = [...detailedFilter, ...extraFilters.detailed];
  }
  let output = input.map((f) => getFinalFilter(f));
  if (extraFilters?.filters) {
    output = output.concat(extraFilters.filters);
  }
  const result = simplifyFilter({
    [`$${operand || "and"}`]: output.filter(isDefined),
  });

  return result ?? {};
};

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
  onChange: (filter?: SimpleFilter) => void;
  tables: CommonWindowProps["tables"];
  column: FilterColumn;
  otherFilters: SmartGroupFilter;
  extraFilters: AnyObject[] | undefined;
  error?: any;
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
