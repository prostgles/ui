import { getFinalFilterInfo } from "@common/filterUtils";
import FormField from "@components/FormField/FormField";
import React from "react";
import { RenderFilter, type RenderFilterProps } from "../../../RenderFilter";

export const AlertFilterEditor = ({
  label,
  emptyLabel,
  ...props
}: Pick<RenderFilterProps, "filter" | "onChange" | "tableName" | "source"> & {
  label: string;
  emptyLabel: string;
}) => (
  <FormField
    label={label}
    inputContent={
      <RenderFilter
        {...props}
        title={label}
        itemName="condition"
        contextData={undefined}
        selectedColumns={undefined}
        mode={{
          children: (
            <span className="text-ellipsis">
              {getFinalFilterInfo(props.filter) || emptyLabel}
            </span>
          ),
          variant: "outline",
          size: "small",
          style: { borderRadius: "1em", maxWidth: "100%" },
          disabledInfo:
            !props.tableName ? "Choose a query table first" : undefined,
        }}
      />
    }
  />
);
