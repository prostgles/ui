import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import { getTableFilterFromDetailedGroupFilter } from "@common/filterUtils";
import { isDefined, type SelectFunction } from "prostgles-types";
import { isEmpty } from "../../../utils/utils";

export const getComputedColumnSelect = (
  computedConfig: Required<ColumnConfig>["computedConfig"],
): SelectFunction => {
  let funcName = computedConfig.funcDef.key;
  let functionArgs: any[] = [computedConfig.column].filter(isDefined);
  if (computedConfig.column || computedConfig.args) {
    const { args } = computedConfig;
    if (args?.$duration?.otherColumn) {
      functionArgs = [computedConfig.column, args.$duration.otherColumn];
      funcName = "$age";
    } else if (args?.$jsonb_diff) {
      functionArgs = [args.$jsonb_diff.oldColumn, args.$jsonb_diff.newColumn];
    } else if (funcName === "$string_agg") {
      functionArgs = [
        computedConfig.column,
        args?.$string_agg?.separator || ", ",
      ];
    } else if (args?.$template_string) {
      functionArgs = [args.$template_string];
    }
  }
  const aggregateOptions =
    computedConfig.funcDef.isAggregate ?
      computedConfig.aggregateOptions
    : undefined;
  const aggregateFilter =
    aggregateOptions?.filter &&
    getTableFilterFromDetailedGroupFilter(aggregateOptions.filter);
  return {
    [funcName]: functionArgs,
    ...(!isEmpty(aggregateFilter) && { $filter: aggregateFilter }),
    ...(aggregateOptions?.orderBy && {
      $orderBy: aggregateOptions.orderBy,
    }),
  } as SelectFunction;
};
