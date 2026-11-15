import type {
  DetailedFilterBase,
  FilterType,
  DetailedFilter,
} from "@common/filterUtils";
import { CORE_FILTER_TYPES, NUMERIC_FILTER_TYPES } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { Select } from "@components/Select/Select";
import React from "react";
import type { BaseFilterProps } from "../../SmartFilter/SmartFilter";

type FilterProps = BaseFilterProps & {
  part: "reference" | "value";
};

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
  }) satisfies DetailedFilter;

export const AgeFilterTypes = [
  "$age",
  "$duration",
  "$ageNow",
] satisfies FilterType[];

export const AgeFilter = (props: FilterProps) => {
  const { filter, onChange, tables, column, tableName, part } = props;

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

  const columnOptions = [
    { key: null, label: "NOW" },
    ...otherDateCols.map((c) => ({ key: c.name, label: c.label })),
  ];

  if (part === "reference") {
    if (filter.type === "$age") return null;
    return (
      <div className="AgeFilter_Reference flex-row-wrap gap-p25 ai-center min-w-0 max-w-full">
        <Btn
          className="FilterWrapper_Type"
          size="small"
          color="default"
          data-command="AgeFilter.argsLeftToRight"
          onClick={() => {
            updateComplex({ argsLeftToRight: !complex.argsLeftToRight });
          }}
        >
          {complex.argsLeftToRight === false ? "up to" : "since"}
        </Btn>
        <Select
          iconPath=""
          value={complex.otherField ?? null}
          fullOptions={columnOptions}
          style={{
            minHeight: "30px",
            padding: "4px 6px",
            gap: "4px",
          }}
          btnProps={{
            size: "small",
            variant: "default",
          }}
          onChange={(otherField) => {
            updateComplex({ otherField });
          }}
        />
      </div>
    );
  }

  return (
    <div className="AgeFilter flex-row gap-p5 ai-center min-w-0 max-w-full px-p25 pb-p25">
      <Select
        className="FilterWrapper_Type"
        size="small"
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
          ...CORE_FILTER_TYPES.filter(({ key }) => key === "<>" || key === "="),
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
          minHeight: "30px",
          padding: "4px 8px",
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
  );
};
