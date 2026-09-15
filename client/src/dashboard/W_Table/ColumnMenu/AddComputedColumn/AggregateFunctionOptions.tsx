import { FlexCol, FlexRowWrap } from "@components/Flex";
import { Label } from "@components/Label";
import React from "react";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import { RenderFilter } from "src/dashboard/RenderFilter";
import { SortByControl } from "src/dashboard/SmartFilter/SortByControl";
import type { AggregateOptions } from "../ColumnMenu";

type P = {
  table: DBSchemaTableWJoins;
  value: AggregateOptions | undefined;
  onChange: (value: AggregateOptions | undefined) => void;
};

export const AggregateFunctionOptions = ({ table, value, onChange }: P) => {
  const filter = value?.filter ?? { $and: [] };
  const filterCount = "$and" in filter ? filter.$and.length : filter.$or.length;

  const update = (newValue: Partial<AggregateOptions>) => {
    const aggregateOptions = { ...value, ...newValue };
    onChange(
      aggregateOptions.filter || aggregateOptions.orderBy ?
        aggregateOptions
      : undefined,
    );
  };

  return (
    <FlexCol className="gap-p5 ai-start">
      <Label
        label="Aggregate options"
        variant="normal"
        info="Filter or order the rows passed to this aggregate function"
      />
      <FlexRowWrap className="gap-p5 ai-center">
        <RenderFilter
          filter={filter}
          tableName={table.name}
          selectedColumns={undefined}
          contextData={undefined}
          itemName="filter"
          title="Filter aggregate input rows"
          mode={{
            children: filterCount ? `Filter (${filterCount})` : "Filter",
            variant: "faded",
            color: filterCount ? "action" : undefined,
          }}
          onChange={(filter) => {
            const items = "$and" in filter ? filter.$and : filter.$or;
            update({ filter: items.length ? filter : undefined });
          }}
        />
        <SortByControl
          label="Order input by"
          columns={table.columns}
          value={value?.orderBy}
          onChange={(orderBy) => update({ orderBy })}
        />
      </FlexRowWrap>
    </FlexCol>
  );
};
