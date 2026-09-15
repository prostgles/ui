import type { DetailedJoinedFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { mdiCheckBold, mdiDelete } from "@mdi/js";
import React from "react";
import { GroupedFilterControl } from "../SmartFilter/GroupedFilterControl";
import { JoinFilterTypeToggle } from "../SmartFilter/JoinFilterTypeToggle";
import type { SmartFilterProps } from "../SmartFilter/SmartFilter";

type Props = Pick<
  SmartFilterProps,
  "db" | "tables" | "contextData" | "hideToggle" | "variant" | "className"
> & {
  filter: DetailedJoinedFilter;
  onChange: (filter?: DetailedJoinedFilter) => void;
  minimised: boolean | undefined;
};

export const JoinedFilterControl = ({
  filter,
  onChange,
  minimised,
  ...props
}: Props) => {
  const target = filter.path.at(-1);
  if (!target) return <>Missing join path</>;
  const tableName = typeof target === "string" ? target : target.table;
  const collapsed = minimised ?? filter.minimised;
  const group =
    "fieldName" in filter.filter ? { $and: [filter.filter] } : filter.filter;
  return (
    <FlexCol
      className={`b rounded p-p5 gap-p5 ${props.className ?? ""}`}
      data-command="JoinedFilterControl"
    >
      <FlexRow className="gap-0">
        {!props.hideToggle && (
          <Btn
            iconPath={mdiCheckBold}
            title={filter.disabled ? "Enable filter" : "Disable filter"}
            color={filter.disabled ? undefined : "action"}
            onClick={() => onChange({ ...filter, disabled: !filter.disabled })}
          />
        )}
        <JoinFilterTypeToggle
          value={filter.type}
          disabled={filter.disabled}
          onChange={(type) => onChange({ ...filter, type })}
        />
        <Btn
          variant="text"
          title="Expand/collapse joined conditions"
          onClick={() => onChange({ ...filter, minimised: !collapsed })}
        >
          {filter.path
            .map((p) => (typeof p === "string" ? p : p.table))
            .join(" > ")}
        </Btn>
        <Btn
          iconPath={mdiDelete}
          className="ml-auto"
          title="Delete joined filter"
          onClick={() => onChange()}
        />
      </FlexRow>
      <GroupedFilterControl
        {...props}
        filterClassName={props.className}
        tableName={tableName}
        type="where"
        itemName="condition"
        selectedColumns={undefined}
        extraFilters={undefined}
        newFilterType={props.contextData ? "=" : undefined}
        minimised={collapsed ? true : undefined}
        showAddFilter={!collapsed}
        filter={group}
        onChange={(innerFilter) =>
          onChange({
            ...filter,
            filter: innerFilter,
            minimised: collapsed ? false : filter.minimised,
            disabled: "fieldName" in filter.filter ? false : filter.disabled,
          })
        }
      />
    </FlexCol>
  );
};
