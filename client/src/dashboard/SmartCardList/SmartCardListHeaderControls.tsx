import { isObject, type ValidatedColumnInfo } from "prostgles-types";
import React, { useMemo } from "react";
import { FlexRowWrap } from "../../components/Flex";
import { SmartFilterBar } from "../SmartFilterBar/SmartFilterBar";
import { InsertButton } from "../SmartForm/InsertButton";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";
import type { SmartCardListProps } from "./SmartCardList";
import type { SmartCardListState } from "./useSmartCardListState";
import { SmartFilterBarSearch } from "../SmartFilterBar/SmartFilterBarSearch";

export const SmartCardListHeaderControls = (
  props: SmartCardListProps & {
    totalRows: number | undefined;
    itemsLength: number | undefined;
    columns: ValidatedColumnInfo[];
    tableControls: SmartCardListState["tableControls"];
  },
) => {
  const { title, totalRows, db, tables, methods, tableControls } = props;

  return (
    <FlexRowWrap
      className="SmartCardListControls gap-p5 ai-end py-p25"
      style={{ justifyContent: "space-between" }}
    >
      {typeof title === "string" ?
        <h4 className="m-0">{title}</h4>
      : typeof title === "function" ?
        title({ count: totalRows ?? -1 })
      : title}

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
      {tableControls && (
        <SmartFilterBarSearch
          db={db}
          tableName={tableControls.tableName}
          tables={tables}
          onFilterChange={tableControls.setLocalFilter}
          filter={tableControls.localFilter ?? []}
          extraFilters={tableControls.localFilter}
        />
        // <SmartFilterBar
        //   className="p-1 bg-color-2 min-h-fit min-w-0"
        //   rowCount={totalRows ?? 0}
        //   db={db}
        //   methods={{}}
        //   table_name={tableControls.tableName}
        //   tables={tables}
        //   filter={tableControls.localFilter}
        //   onChange={(filter) => {
        //     tableControls.setLocalFilter(filter);
        //   }}
        //   columns={sorting?.orderByFields?.map((f) => ({
        //     name: f,
        //     show: true,
        //   }))}
        //   sort={sorting?.orderBy}
        //   onSortChange={sorting?.setOrderBy}
        //   showInsertUpdateDelete={{
        //     showdelete: false,
        //     showupdate: false,
        //     showInsert: {
        //       children: "Add",
        //     },
        //   }}
        // />
      )}
    </FlexRowWrap>
  );
};
