import { isObject, type ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import { FlexCol, FlexRow } from "../../components/Flex";
import { RenderFilter } from "../RenderFilter";
import { SmartFilterBarSearch } from "../SmartFilterBar/SmartFilterBarSearch";
import { InsertButton } from "../SmartForm/InsertButton";
import type { SmartCardListProps } from "./SmartCardList";
import type { SmartCardListState } from "./useSmartCardListState";
import SortByControl from "../SmartFilter/SortByControl";

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
  const showSearch =
    tableControls?.localFilter?.length ?
      true
    : tableControls && Boolean(totalRows && totalRows > 8);

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

      <FlexRow className=" ">
        {tableControls?.willShowInsert && (
          <InsertButton
            buttonProps={{
              children: "Add",
            }}
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
      </FlexRow>

      {!!tableControls?.localFilter?.length && (
        <RenderFilter
          db={db}
          contextData={undefined}
          tableName={tableControls.tableName}
          tables={tables}
          selectedColumns={undefined}
          filter={{ $and: tableControls.localFilter }}
          itemName={"filter"}
          hideOperand={true}
          onChange={(newf) => {
            const items = "$and" in newf ? newf.$and : newf.$or;
            tableControls.setLocalFilter(items);
          }}
        />
      )}
    </FlexCol>
  );
};
