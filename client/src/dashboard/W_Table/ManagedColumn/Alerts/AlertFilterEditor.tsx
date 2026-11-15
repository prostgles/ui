import FormField from "@components/FormField/FormField";
import React from "react";
import { RenderFilter, type RenderFilterProps } from "../../../RenderFilter";

export const AlertFilterEditor = ({
  label,
  hideLabel,
  emptyLabel,
  ...props
}: Pick<RenderFilterProps, "filter" | "onChange" | "tableName" | "source"> & {
  label: string;
  hideLabel?: boolean;
  emptyLabel: string;
}) => (
  <FormField
    label={hideLabel ? undefined : label}
    inputContent={
      <RenderFilter
        {...props}
        title={label}
        itemName="condition"
        contextData={undefined}
        selectedColumns={undefined}
        mode={
          (
            props.filter &&
            ("$and" in props.filter ? props.filter.$and : props.filter.$or)
              .length
          ) ?
            "minimised-popup"
          : {
              children: emptyLabel,
              variant: "select",
              size: "small",
              disabledInfo:
                !props.tableName ? "Choose a query table first" : undefined,
            }
        }
      />
    }
  />
);
