import { isObject, type ValidatedColumnInfo } from "prostgles-types";
import React, { useMemo } from "react";
import { FlexCol, FlexRowWrap } from "../../components/Flex";
import { RenderFilter, type RenderFilterProps } from "../RenderFilter";
import SortByControl from "../SmartFilter/SortByControl";
import { SmartFilterBarSearch } from "../SmartFilterBar/SmartFilterBarSearch";
import { InsertButton } from "../SmartForm/InsertButton";
import type { SmartCardListProps } from "./SmartCardList";
import type { SmartCardListState } from "./useSmartCardListState";

export const SmartCardListHeaderControls = (
  props: SmartCardListProps & {
    totalRows: number | undefined;
    itemsLength: number | undefined;
    columns: ValidatedColumnInfo[];
    tableControls: SmartCardListState["tableControls"];
  },
) => {
  const { title, totalRows, db, tables, methods, tableControls, showTopBar } =
    props;

  const titleNode =
    typeof title === "string" ? <h4 className="m-0">{title}</h4>
    : typeof title === "function" ? title({ count: totalRows ?? -1 })
    : title;
  const showSearch = tableControls?.localFilter?.length ? true : tableControls; //&& Boolean(totalRows && totalRows > 8)

  const filterProps = useMemo(() => {
    if (!tableControls || !tableControls.localFilter?.length) return;
    return {
      tableName: tableControls.tableName,
      filter: { $and: tableControls.localFilter },
      onChange: (newf) => {
        const items = "$and" in newf ? newf.$and : newf.$or;
        tableControls.setLocalFilter(items);
      },
    } satisfies Pick<RenderFilterProps, "filter" | "onChange" | "tableName">;
  }, [tableControls]);

  const showSort = isObject(showTopBar) ? showTopBar.sort : showTopBar;
  if (
    !showTopBar ||
    (!titleNode && !showSearch && !tableControls?.willShowInsert)
  ) {
    return null;
  }
  return (
    <FlexCol className="SmartCardListControls gap-p5 aid-end py-p25">
      {titleNode}

      <FlexRowWrap className=" ">
        {isObject(showTopBar) && showTopBar.leftContent}
        {tableControls?.willShowInsert && (
          <InsertButton
            buttonProps={{
              children: "Add",
            }}
            {...(isObject(showTopBar) && isObject(showTopBar.insert) ?
              showTopBar.insert
            : {})}
            db={db}
            tables={tables}
            methods={methods}
            tableName={tableControls.tableName}
          />
        )}
        {showSearch && tableControls && (
          <SmartFilterBarSearch
            db={db}
            tableName={tableControls.tableName}
            tables={tables}
            onFilterChange={tableControls.setLocalFilter}
            filter={tableControls.localFilter ?? []}
            extraFilters={undefined}
            style={{
              width: "unset",
              margin: "unset",
              flex: "1",
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
      </FlexRowWrap>

      {filterProps && (
        <RenderFilter
          db={db}
          contextData={undefined}
          tables={tables}
          selectedColumns={undefined}
          itemName={"filter"}
          hideOperand={true}
          {...filterProps}
        />
      )}
    </FlexCol>
  );
};
