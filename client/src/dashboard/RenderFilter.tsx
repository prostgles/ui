import type {
  DetailedFilter,
  GroupedDetailedFilter,
} from "@common/filterUtils";
import Btn, { type BtnProps } from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
import { mdiFilter } from "@mdi/js";
import React from "react";
import type {
  ContextDataSchema,
  ForcedFilterControlProps,
  SingleGroupFilter,
} from "./AccessControl/OptionControllers/FilterControl";
import { GroupedFilterControl } from "./SmartFilter/GroupedFilterControl";
import type { ColumnConfig } from "./W_Table/ColumnMenu/ColumnMenu";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

export type RenderFilterProps = {
  filter: SingleGroupFilter | undefined;
  onChange: (filter: SingleGroupFilter) => void;
  contextData: ContextDataSchema | undefined;
  title?: string;
  mode?: ("micro" | BtnProps) | "compact" | "minimised";
  itemName: "filter" | "condition";
  selectedColumns: ColumnConfig[] | undefined;
  hideOperand?: boolean;
} & Pick<ForcedFilterControlProps, "tableName">;

export const RenderFilter = (props: RenderFilterProps) => {
  const {
    filter: f = { $and: [] },
    onChange,
    contextData,
    mode,
    title = `Edit ${props.itemName}s`,
    itemName,
    tableName,
    selectedColumns,
    hideOperand,
  } = props;
  const { db, tables } = usePrgl();
  const isAndOrFilter = "$and" in f || "$or" in f;
  const minimised = mode && mode === "minimised";
  const filters = "$and" in f ? f.$and : f.$or;

  if (!isAndOrFilter) {
    return <>Unexpected {itemName}. Expecting $and / $or</>;
  }

  const content = (showAddFilter?: boolean) => (
    <>
      <GroupedFilterControl
        type="where"
        itemName={itemName}
        contextData={contextData}
        variant={
          minimised ? "row"
          : window.isMobileDevice ?
            undefined
          : "row"
        }
        db={db}
        tableName={tableName}
        tables={tables}
        selectedColumns={selectedColumns}
        hideOperand={hideOperand}
        filter={f}
        onChange={onChange}
        newFilterType={contextData ? "=" : undefined}
        hideToggle={true}
        minimised={minimised}
        showAddFilter={showAddFilter}
        extraFilters={undefined}
        showNoFilterInfoRow={true}
      />
    </>
  );

  if (!mode) {
    return content();
  }

  if (mode === "compact") {
    return content(true);
  }

  if (mode === "minimised") {
    return content(false);
  }

  const filterIsNotEmpty = filters.length > 0;

  return (
    <PopupMenu
      title={title}
      positioning="center"
      onClickClose={false}
      button={
        <Btn
          title={title}
          iconPath={mdiFilter}
          // variant="icon"
          color={filterIsNotEmpty ? "action" : undefined}
          {...(mode === "micro" ? {} : mode)}
          data-command="RenderFilter.edit"
        />
      }
      contentStyle={{
        minWidth: "400px",
      }}
      fixedTopLeft={true}
      clickCatchStyle={{ opacity: 0.5 }}
      footerButtons={[
        {
          onClickClose: true,
          color: "action",
          variant: "filled",
          label: "Done",
          "data-command": "RenderFilter.done",
          disabledInfo:
            hasDisabledFilter(f) ?
              `Some ${itemName}s are incomplete/disabled`
            : undefined,
        },
      ]}
    >
      {content(true)}
    </PopupMenu>
  );
};

const hasDisabledFilter = (
  filter: DetailedFilter | GroupedDetailedFilter,
): boolean => {
  if ("$and" in filter) return filter.$and.some(hasDisabledFilter);
  if ("$or" in filter) return filter.$or.some(hasDisabledFilter);
  return (
    !!filter.disabled || ("path" in filter && hasDisabledFilter(filter.filter))
  );
};
