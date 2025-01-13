import { mdiFilter } from "@mdi/js";
import React from "react";
import type {
  GroupedDetailedFilter,
  SimpleFilter,
} from "../../../commonTypes/filterUtils";
import Btn from "../components/Btn";
import PopupMenu from "../components/PopupMenu";
import { pickKeys } from "prostgles-types";
import type {
  ContextDataSchema,
  ForcedFilterControlProps,
  SingleGroupFilter,
} from "./AccessControl/OptionControllers/FilterControl";
import { SmartFilter } from "./SmartFilter/SmartFilter";
import type { ColumnConfig } from "./W_Table/ColumnMenu/ColumnMenu";

type RenderFilterProps = {
  filter: SingleGroupFilter | undefined;
  onChange: (filter: SingleGroupFilter) => void;
  contextData: ContextDataSchema | undefined;
  title?: string;
  mode?: "micro" | "compact" | "minimised";
  itemName: "filter" | "condition";
  selectedColumns: ColumnConfig[] | undefined;
} & Pick<ForcedFilterControlProps, "db" | "tableName" | "tables">;

export const RenderFilter = (props: RenderFilterProps) => {
  const {
    filter: f = { $and: [] },
    onChange,
    contextData,
    mode,
    title = `Edit ${props.itemName}s`,
    itemName,
    ...otherProps
  } = props;
  const isAndOrFilter = "$and" in f || "$or" in f;
  if (!isAndOrFilter) {
    return <>Unexpected {itemName}. Expecting $and / $or</>;
  }

  const isAnd = "$and" in f;
  const filters = isAnd ? f.$and : f.$or;
  const simpleFilters = filters.filter(isSimpleFilter);
  const groupFilters = filters.filter(isNotSimpleFilter);

  const content = (minimised?: boolean, showAddFilter?: boolean) => (
    <>
      <SmartFilter
        type="where"
        itemName={itemName}
        contextData={contextData}
        variant={
          minimised ? "row"
          : window.isMobileDevice ?
            undefined
          : "row"
        }
        filterClassName={
          (minimised ?? filters.some((f) => f.minimised)) ?
            " "
          : " rounded  b b-action"
        }
        {...pickKeys(otherProps, [
          "db",
          "tableName",
          "tables",
          "selectedColumns",
        ])}
        operand={isAnd ? "AND" : "OR"}
        detailedFilter={simpleFilters}
        onOperandChange={(operand) => {
          onChange(operand === "AND" ? { $and: filters } : { $or: filters });
        }}
        onChange={(newF) => {
          const newFilters = [...newF, ...groupFilters];
          if (isAnd) f.$and = newFilters;
          else f.$or = newFilters;
          onChange(f);
        }}
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
    return content(false, true);
  }

  if (mode === "minimised") {
    return content(true, false);
  }

  const filterIsNotEmpty = filters.some((f) => !f.disabled);

  return (
    <PopupMenu
      title={title}
      positioning="center"
      onClickClose={false}
      button={
        <Btn
          title={title}
          iconPath={mdiFilter}
          variant="icon"
          data-command="RenderFilter.edit"
          color={filterIsNotEmpty ? "action" : undefined}
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
            filters.some((f) => f.disabled) ?
              `Some ${itemName}s are incomplete/disabled`
            : undefined,
        },
      ]}
    >
      {content(false, true)}
    </PopupMenu>
  );
};

const isSimpleFilter = (
  f: SimpleFilter | GroupedDetailedFilter,
): f is SimpleFilter => {
  return !("$and" in f || "$or" in f);
};
const isNotSimpleFilter = (
  f: SimpleFilter | GroupedDetailedFilter,
): f is GroupedDetailedFilter => {
  return !isSimpleFilter(f);
};
