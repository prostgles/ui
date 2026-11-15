import type { DetailedFilter } from "@common/filterUtils";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { isObject, type ValidatedColumnInfo } from "prostgles-types";
import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { RenderFilter, type RenderFilterProps } from "../RenderFilter";
import { SortByControl } from "../SmartFilter/SortByControl";
import { SmartFilterBarSearch } from "../SmartFilterBar/SmartFilterBarSearch";
import { InsertButton } from "../SmartForm/InsertButton";
import type { SmartCardListProps } from "./SmartCardList";
import type { SmartCardListState } from "./useSmartCardListState";
import {
  getTableHeaderMethods,
  TableHeaderActions,
} from "../ActionPopup/TableHeaderActions";

export const SmartCardListHeaderControls = (
  props: SmartCardListProps & {
    totalRows: number | undefined;
    itemsLength: number | undefined;
    columns: ValidatedColumnInfo[];
    tableControls: SmartCardListState["tableControls"];
  },
) => {
  const {
    title,
    totalRows,
    db,
    tables,
    methods,
    tableControls,
    showTopBar = true,
    headerControlsTarget,
    sql,
    fieldConfigs,
    hideColumns,
  } = props;

  const searchColumns = useMemo(
    () =>
      fieldConfigs?.map((field) => {
        const name = typeof field === "string" ? field : field.name;
        return {
          ...(typeof field === "string" ? {} : field.columnConfig),
          name,
          show:
            !hideColumns?.includes(name) &&
            (typeof field === "string" || !field.hide),
        };
      }),
    [fieldConfigs, hideColumns],
  );

  const titleNode =
    typeof title === "string" ? <h4 className="m-0">{title}</h4>
    : typeof title === "function" ? title({ count: totalRows ?? -1 })
    : title;
  const showSearch = tableControls?.localFilter?.length ? true : tableControls;

  const filterProps = useMemo(() => {
    if (!tableControls || !tableControls.localFilter?.length) return;
    return {
      tableName: tableControls.tableName,
      filter: { $and: tableControls.localFilter },
      onChange: (newFilter) => {
        tableControls.setLocalFilter(
          "$and" in newFilter ? newFilter.$and : [newFilter],
        );
      },
    } satisfies Pick<RenderFilterProps, "filter" | "onChange" | "tableName">;
  }, [tableControls]);

  const showSort = isObject(showTopBar) ? showTopBar.sort : showTopBar;
  const noItemsToShow = !props.itemsLength && !props.totalRows;
  const hasHeaderActions =
    typeof props.tableName === "string" &&
    getTableHeaderMethods(methods, props.tableName).length > 0;
  const hasControls = Boolean(
    (showTopBar &&
      ((isObject(showTopBar) && showTopBar.leftContent) ||
        hasHeaderActions ||
        tableControls?.willShowInsert ||
        (showSearch && tableControls && !noItemsToShow))) ||
    (tableControls?.setLocalOrderBy && showSort),
  );
  if (!titleNode && !hasControls && !filterProps) {
    return null;
  }

  const headerActions = showTopBar && typeof props.tableName === "string" && (
    <TableHeaderActions
      className="ml-auto"
      methods={methods}
      tableName={props.tableName}
    />
  );
  const controls = hasControls && (
    <>
      {isObject(showTopBar) && showTopBar.leftContent}
      {showTopBar && tableControls?.willShowInsert && (
        <InsertButton
          buttonProps={{
            children: "Add",
          }}
          {...(isObject(showTopBar) && isObject(showTopBar.insert) ?
            showTopBar.insert
          : {})}
          db={db}
          sql={sql}
          tables={tables}
          methods={methods}
          tableName={tableControls.tableName}
        />
      )}
      {showTopBar && showSearch && tableControls && !noItemsToShow && (
        <SmartFilterBarSearch
          placeholder={
            typeof props.searchPlaceholder === "function" ?
              props.searchPlaceholder({ count: Math.max(0, totalRows ?? 0) })
            : props.searchPlaceholder
          }
          db={db}
          tableName={tableControls.tableName}
          tables={tables}
          columns={searchColumns}
          onFilterChange={(filters) =>
            tableControls.setLocalFilter([
              ...filters,
              ...(tableControls.localFilter ?? []).filter(
                (f) => "$and" in f || "$or" in f,
              ),
            ])
          }
          filter={(tableControls.localFilter ?? []).filter(
            (f): f is DetailedFilter => !("$and" in f || "$or" in f),
          )}
          extraFilters={undefined}
          style={{
            width: "240px",
            maxWidth: "100%",
            margin: "unset",
          }}
        />
      )}
      {tableControls?.setLocalOrderBy && showSort && (
        <SortByControl
          value={tableControls.localOrderBy}
          columns={props.columns}
          onChange={tableControls.setLocalOrderBy}
        />
      )}
    </>
  );
  const headerControls =
    headerControlsTarget && controls ?
      createPortal(
        <FlexRowWrap className="gap-p5 min-w-0 jc-end">
          {controls}
          {headerActions}
        </FlexRowWrap>,
        headerControlsTarget,
      )
    : null;

  if (headerControlsTarget && !titleNode && !filterProps) {
    return headerControls;
  }

  return (
    <FlexCol className="SmartCardListControls gap-p5 aid-end py-p25">
      {titleNode}
      {headerControls}

      {((!headerControlsTarget && hasControls) || filterProps) && (
        <FlexRowWrap className="gap-p5">
          {!headerControlsTarget && controls}
          {filterProps && (
            <div className="min-w-0" style={{ flex: "1 1 240px" }}>
              <RenderFilter
                contextData={undefined}
                selectedColumns={undefined}
                itemName={"filter"}
                hideOperand={true}
                {...filterProps}
              />
            </div>
          )}
          {!headerControlsTarget && headerActions}
        </FlexRowWrap>
      )}
    </FlexCol>
  );
};
