import type {
  DetailedFilter,
  GroupedDetailedFilter,
} from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { mdiFilterVariantPlus, mdiPlus } from "@mdi/js";
import React from "react";
import {
  SmartAddFilter,
  type SmartAddFilterProps,
} from "../SmartFilter/SmartAddFilter";

type Props = Pick<
  SmartAddFilterProps,
  "db" | "tableName" | "tables" | "newFilterType"
> & {
  onAdd: (conditions: (DetailedFilter | GroupedDetailedFilter)[]) => void;
};

export const JoinedFilterActions = ({ onAdd, ...props }: Props) => (
  <PopupMenu
    className="show-on-parent-hover"
    positioning="beneath-left"
    contentStyle={{ padding: 0 }}
    clickCatchStyle={{ opacity: 0 }}
    button={
      <Btn
        iconPath={mdiPlus}
        size="small"
        color="action"
        title="Add condition or group"
      />
    }
    render={() => (
      <FlexCol className="gap-0">
        <SmartAddFilter
          {...props}
          selectedColumns={undefined}
          itemName="condition"
          variant="full"
          className="w-full"
          style={{ boxShadow: "none", borderRadius: 0 }}
          btnProps={{ size: "small", variant: "text" }}
          onChange={onAdd}
        />
        <Btn
          iconPath={mdiFilterVariantPlus}
          size="small"
          variant="text"
          color="action"
          title="Add group"
          onClick={() => onAdd([{ $and: [] }])}
        >
          Add group
        </Btn>
      </FlexCol>
    )}
  />
);
