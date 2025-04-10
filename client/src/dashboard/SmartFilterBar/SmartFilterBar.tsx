import {
  mdiTableColumn,
  mdiTableRow,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type {
  SimpleFilter,
  SmartGroupFilter,
} from "../../../../commonTypes/filterUtils";
import { isJoinedFilter } from "../../../../commonTypes/filterUtils";
import type { PrglCore } from "../../App";
import Btn, { type BtnProps } from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import {
  FlexCol,
  FlexRow,
  FlexRowWrap,
  classOverride,
} from "../../components/Flex";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { SmartAddFilter } from "../SmartFilter/SmartAddFilter";
import type {
  ColumnConfig,
  ColumnSort,
} from "../W_Table/ColumnMenu/ColumnMenu";
import { SmartFilterBarFilters } from "./SmartFilterBarFilters";
import { SmartFilterBarRightActions } from "./SmartFilterBarRightActions";
import { SmartFilterBarSearch } from "./SmartFilterBarSearch";
import { useSmartFilterBarState } from "./useSmartFilterBarState";

export type SmartFilterBarProps = PrglCore & {
  className?: string;
  innerClassname?: string;
  style?: React.CSSProperties;

  filterFields?: string[];
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showInsertUpdateDelete?: {
    onSuccess?: VoidFunction;
    showInsert?: boolean | Pick<BtnProps, "children">;
    showupdate?: boolean;
    showdelete?: boolean;
  };
  rowCount: number;
  hideSort?: boolean;
  extraFilters?: AnyObject[];
  fixedData?: AnyObject;
} & (
    | {
        w: WindowSyncItem<"table"> | WindowSyncItem<"card">;
      }
    | {
        filter?: SmartGroupFilter;
        having?: SmartGroupFilter;
        table_name: string;
        onChange: (newFilter: SmartGroupFilter, isAggregate?: boolean) => any;
        onHavingChange?: (newFilter: SmartGroupFilter) => any;

        onSortChange: undefined | ((newSort: ColumnSort | undefined) => void);
        sort?: ColumnSort;
        columns?: ColumnConfig[];
      }
  );

export const SmartFilterBar = (props: SmartFilterBarProps) => {
  const {
    db,
    tables,
    leftContent,
    filterFields,
    style,
    className,
    innerClassname,
  } = props;

  const state = useSmartFilterBarState(props);

  if (state.type === "error") {
    return <ErrorComponent error={state.error} />;
  }

  const {
    table,
    filter,
    selectedColumns,
    onFilterChange,
    someFiltersExpanded,
    colFilterLayout,
    setColFilterLayout,
  } = state;

  return (
    <FlexCol
      className={classOverride(
        "SmartFilterBar min-h-0 min-w-0 relative gap-0",
        className,
      )}
      style={style}
    >
      {leftContent}

      <FlexRowWrap
        className={classOverride(
          "min-h-0 f-0 relative ai-center gap-p5",
          innerClassname,
        )}
      >
        <SmartAddFilter
          selectedColumns={selectedColumns ?? []}
          tableName={table.name}
          filterFields={filterFields}
          db={db}
          tables={tables}
          detailedFilter={filter}
          onChange={onFilterChange}
        />
        {Boolean(filter.length) && (
          <>
            <Btn
              title="Expand/Collapse filters"
              iconPath={
                window.isMobileDevice ?
                  !someFiltersExpanded ?
                    mdiUnfoldMoreHorizontal
                  : mdiUnfoldLessHorizontal
                : undefined
              }
              onClick={() => {
                const newFilters = toggleAllFilters(filter);

                onFilterChange(newFilters);
              }}
            >
              {window.isMobileDevice ? null : (
                `${!someFiltersExpanded ? "Expand" : "Collapse"} filters`
              )}
            </Btn>
            <Btn
              title="Filter layout"
              iconPath={colFilterLayout ? mdiTableColumn : mdiTableRow}
              onClick={() => {
                setColFilterLayout(!colFilterLayout);
              }}
            />
          </>
        )}
        <FlexRow className={"gap-0 f-1 mx-p5 jc-center mr-p5 ai-center"}>
          <SmartFilterBarSearch
            db={db}
            tableName={table.name}
            tables={tables}
            onFilterChange={onFilterChange}
            filter={filter}
            extraFilters={props.extraFilters}
          />
          <SmartFilterBarRightActions {...props} />
        </FlexRow>
      </FlexRowWrap>
      <SmartFilterBarFilters
        state={state}
        db={db}
        tables={tables}
        extraFilters={props.extraFilters}
      />
    </FlexCol>
  );
};

const toggleAllFilters = (filters: SimpleFilter[], minimised?: boolean) => {
  const someFiltersExpanded = minimised ?? filters.some((f) => !f.minimised);

  return filters.map((f) => {
    if (isJoinedFilter(f)) {
      f.filter.minimised = someFiltersExpanded;
    }
    return {
      ...f,
      minimised: someFiltersExpanded,
    };
  });
};
