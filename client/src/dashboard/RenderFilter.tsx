import type {
  DetailedFilter,
  GroupedDetailedFilter,
} from "@common/filterUtils";
import Btn from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
import { mdiFilter } from "@mdi/js";
import React, { useMemo } from "react";
import type {
  ContextDataSchema,
  ForcedFilterControlProps,
  SingleGroupFilter,
} from "./AccessControl/OptionControllers/FilterControl";
import { SmartFilter, type SmartFilterProps } from "./SmartFilter/SmartFilter";
import type { ColumnConfig } from "./W_Table/ColumnMenu/ColumnMenu";

export type RenderFilterProps = {
  filter: SingleGroupFilter | undefined;
  onChange: (filter: SingleGroupFilter) => void;
  contextData: ContextDataSchema | undefined;
  title?: string;
  mode?: "micro" | "compact" | "minimised";
  itemName: "filter" | "condition";
  selectedColumns: ColumnConfig[] | undefined;
  hideOperand?: boolean;
} & Pick<ForcedFilterControlProps, "db" | "tableName" | "tables">;

export const RenderFilter = (props: RenderFilterProps) => {
  const {
    filter: f = { $and: [] },
    onChange,
    contextData,
    mode,
    title = `Edit ${props.itemName}s`,
    itemName,
    db,
    tableName,
    tables,
    selectedColumns,
    hideOperand,
  } = props;
  const isAndOrFilter = "$and" in f || "$or" in f;
  const minimised = mode && mode === "minimised";
  const { filters, ...filterProps } = useMemo(() => {
    const isAnd = "$and" in f;
    const filters = isAnd ? f.$and : f.$or;
    const simpleFilters = filters.filter(isSimpleFilter);
    const groupFilters = filters.filter(isNotSimpleFilter);
    return {
      filters,
      filterClassName:
        /** Where was this needed? Both cases look better with the classes applied */
        // (minimised ?? filters.some((f) => f.minimised)) ?
        //   " "
        // :
        " rounded  b b-action",
      operand: isAnd ? "AND" : "OR",
      detailedFilter: simpleFilters,
      onOperandChange: (operand) => {
        onChange(operand === "AND" ? { $and: filters } : { $or: filters });
      },
      onChange: (newF) => {
        const newFilters = [...newF, ...groupFilters];
        if (isAnd) f.$and = newFilters;
        else f.$or = newFilters;
        onChange(f);
      },
    } satisfies Pick<
      SmartFilterProps,
      | "filterClassName"
      | "operand"
      | "detailedFilter"
      | "onOperandChange"
      | "onChange"
    > & {
      filters: DetailedFilter[];
    };
  }, [f, onChange]);

  if (!isAndOrFilter) {
    return <>Unexpected {itemName}. Expecting $and / $or</>;
  }

  const content = (showAddFilter?: boolean) => (
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
        db={db}
        tableName={tableName}
        tables={tables}
        selectedColumns={selectedColumns}
        hideOperand={hideOperand}
        {...filterProps}
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
      {content(true)}
    </PopupMenu>
  );
};

const isSimpleFilter = (
  f: DetailedFilter | GroupedDetailedFilter,
): f is DetailedFilter => {
  return !("$and" in f || "$or" in f);
};
const isNotSimpleFilter = (
  f: DetailedFilter | GroupedDetailedFilter,
): f is GroupedDetailedFilter => {
  return !isSimpleFilter(f);
};
