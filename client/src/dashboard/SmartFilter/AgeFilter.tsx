import React from "react";
import type {
  DetailedFilterBase,
  FilterType,
  SimpleFilter,
} from "../../../../commonTypes/filterUtils";
import {
  CORE_FILTER_TYPES,
  NUMERIC_FILTER_TYPES,
} from "../../../../commonTypes/filterUtils";
import Btn from "../../components/Btn";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import Select from "../../components/Select/Select";
import type { BaseFilterProps } from "./SmartFilter";

type FilterProps = BaseFilterProps;

export const getDefaultAgeFilter = (
  fieldName: string,
  type: (typeof AgeFilterTypes)[number],
) =>
  ({
    fieldName,
    complexFilter: {
      type: "controlled",
      funcName: type,
      argsLeftToRight: false,
      comparator: ">",
    },
    type,
    value: "1day",
  }) satisfies SimpleFilter;

export const AgeFilterTypes = [
  "$age",
  "$duration",
  "$ageNow",
] satisfies FilterType[];

export const AgeFilter = (props: FilterProps) => {
  const { filter, onChange, tables, column, tableName } = props;

  const otherDateCols = tables
    .find((t) => t.name === tableName)
    ?.columns.filter(
      (c) =>
        c.name !== column.name &&
        ["date", "timestamp", "timestamptz"].includes(c.udt_name),
    );
  if (!filter || !otherDateCols)
    return <>Something went wrong. Could not find column {column.name}</>;
  if (filter.complexFilter?.type !== "controlled")
    return <>Something went wrong. Could not find complex filter</>;

  const complex: DetailedFilterBase["complexFilter"] = {
    ...filter.complexFilter,
  };

  const updateComplex = (
    newOpt: Partial<
      Extract<DetailedFilterBase["complexFilter"], { type: "controlled" }>
    >,
  ) => {
    onChange({
      ...filter,
      complexFilter: {
        ...complex,
        ...newOpt,
      },
    });
  };

  const colOptsions = [
    { key: null, label: "NOW" },
    ...otherDateCols.map((c) => ({ key: c.name, label: c.label })),
  ];

  return (
    <div className="AgeFilter flex-row gap-p25">
      {filter.type !== "$age" && (
        <div className="flex-row p-p25 gap-p25 ai-center">
          <Btn
            size="small"
            color="action"
            data-command="AgeFilter.argsLeftToRight"
            onClick={() => {
              updateComplex({ argsLeftToRight: !complex.argsLeftToRight });
            }}
          >
            {complex.argsLeftToRight === false ? "Up to" : "Since"}
          </Btn>
          <Select
            value={complex.otherField ?? null}
            fullOptions={colOptsions}
            btnProps={{
              size: "small",
            }}
            onChange={(otherField) => {
              updateComplex({ otherField });
            }}
          />
        </div>
      )}
      <div className="flex-row p-p2d5 gap-p5">
        <Select
          className="text-action"
          iconPath=""
          data-command="AgeFilter.comparator"
          btnProps={{
            style: { borderRadius: 0 },
            color: "default",
            variant: "default",
          }}
          value={complex.comparator}
          fullOptions={[
            ...NUMERIC_FILTER_TYPES,
            ...CORE_FILTER_TYPES.filter(
              ({ key }) => key === "<>" || key === "=",
            ),
          ]}
          onChange={(comparator) => {
            updateComplex({ comparator });
          }}
        />
        <FormFieldDebounced
          type="text"
          autoComplete="off"
          value={filter.value}
          maxWidth="10em"
          inputStyle={{
            minHeight: "44px",
            padding: "8px 0 8px 1em",
          }}
          wrapperStyle={{
            borderRadius: "0",
            borderTop: "none",
            borderBottom: "none",
          }}
          placeholder="1 month 2 days"
          onChange={(value) => {
            onChange({
              ...filter,
              disabled: false,
              value: `${value}`,
            });
          }}
        />
      </div>
    </div>
  );
};
