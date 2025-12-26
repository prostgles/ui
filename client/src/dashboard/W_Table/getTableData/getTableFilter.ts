import {
  getSmartGroupFilter,
  simplifyFilter,
  type DetailedFilter,
} from "@common/filterUtils";
import type { AnyObject } from "prostgles-types";
import { isDefined, isEmpty } from "prostgles-types";
import type { WindowData } from "../../Dashboard/dashboardUtils";
import type { W_TableProps } from "../W_Table";
import type { TableWindowInsertModel } from "@common/DashboardTypes";

export const getTableFilter = (
  w: WindowData<"table">,
  {
    externalFilters,
    joinFilter,
  }: Pick<W_TableProps, "joinFilter" | "externalFilters">,
) => {
  const { filter: rawFilter, having: rawHaving } = w;

  let filter: AnyObject = {};
  let having: AnyObject = {};
  /* Parse and Remove bad filters */
  if (w.table_name) {
    const quickFilterGroups = w.options
      ?.quickFilterGroups as TableWindowInsertModel["quickFilterGroups"];
    const quickFilters = Object.values(quickFilterGroups ?? {})
      .map(({ toggledFilterName, filters }) => {
        if (!toggledFilterName) return;
        const filter = filters[toggledFilterName];
        if (!filter) return;
        const [operand, fieldFilters] = (
          "$and" in filter ? ["and", filter.$and]
          : "$or" in filter ? ["or", filter.$or]
          : ["and", [filter]]) satisfies ["and" | "or", AnyObject[]];
        return getSmartGroupFilter(
          fieldFilters as DetailedFilter[],
          undefined,
          operand,
        );
      })
      .filter(isDefined);

    filter = getSmartGroupFilter(
      rawFilter || [],
      { filters: quickFilters },
      w.options?.filterOperand === "OR" ? "or" : undefined,
    );

    having = getSmartGroupFilter(
      rawHaving || [],
      undefined,
      w.options?.havingOperand === "OR" ? "or" : undefined,
    );
  }

  return {
    filter:
      simplifyFilter({
        $and: [
          !isEmpty(filter) ? filter : undefined,
          joinFilter,
          ...externalFilters,
        ].filter(isDefined),
      }) ?? {},
    having:
      simplifyFilter({
        $and: [having].filter(isDefined),
      }) ?? {},
  };
};
