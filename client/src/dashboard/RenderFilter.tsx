import { mdiFilter } from "@mdi/js";
import { pickKeys } from "prostgles-types";
import React, { useMemo } from "react";
import type { GroupedDetailedFilter, SimpleFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
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
    ...otherProps
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
      filters: SimpleFilter[];
    };
  }, [f, minimised, onChange]);

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
        {...pickKeys(otherProps, [
          "db",
          "tableName",
          "tables",
          "selectedColumns",
          "hideOperand",
        ])}
        {...filterProps}
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
  f: SimpleFilter | GroupedDetailedFilter,
): f is SimpleFilter => {
  return !("$and" in f || "$or" in f);
};
const isNotSimpleFilter = (
  f: SimpleFilter | GroupedDetailedFilter,
): f is GroupedDetailedFilter => {
  return !isSimpleFilter(f);
};
