import type { BaseFilter, DetailedFilterBase } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import React, { useState } from "react";
import { DetailedFilterControl } from "../../dashboard/DetailedFilterControl/DetailedFilterControl";
import { GroupedFilterControl } from "../../dashboard/SmartFilter/GroupedFilterControl";
import {
  filterExampleContext,
  filterExampleDb,
  filterExamples,
  filterExampleTable,
  filterExampleTables,
  type PreviewFilter,
} from "./filterExampleData";

export const FilterExamples = () => {
  const [filters, setFilters] = useState<(PreviewFilter | undefined)[]>(
    filterExamples.map(({ filter }) => filter),
  );
  const setMinimised = (minimised: boolean) => {
    setFilters((currentFilters) =>
      currentFilters.map(
        (filter) =>
          filter &&
          updateFilter(filter, (condition) => ({ ...condition, minimised }), {
            minimised,
          }),
      ),
    );
  };

  return (
    <FlexCol
      id="filters"
      className="gap-1 p-2"
      style={{ background: "var(--bg-color-0)" }}
    >
      <FlexRowWrap className="gap-1">
        <h2 className="m-0 mr-auto">Filters</h2>
        <Btn size="small" variant="faded" onClick={() => setMinimised(true)}>
          Minimise all
        </Btn>
        <Btn size="small" variant="faded" onClick={() => setMinimised(false)}>
          Expand all
        </Btn>
        <Btn
          size="small"
          variant="faded"
          onClick={() => setFilters(filterExamples.map(({ filter }) => filter))}
        >
          Reset all
        </Btn>
      </FlexRowWrap>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 600px), 1fr))",
          gap: "1em",
        }}
      >
        {filterExamples.map(({ label }, index) => (
          <FilterExamplePreview
            key={label}
            label={label}
            filter={filters[index]}
            onChange={(filter) =>
              setFilters((currentFilters) =>
                currentFilters.map((currentFilter, filterIndex) =>
                  filterIndex === index ? filter : currentFilter,
                ),
              )
            }
          />
        ))}
      </div>
    </FlexCol>
  );
};

const FilterExamplePreview = ({
  label,
  filter,
  onChange,
}: {
  label: string;
  filter: PreviewFilter | undefined;
  onChange: (filter: PreviewFilter | undefined) => void;
}) => {
  const filterProps = {
    db: filterExampleDb,
    tables: filterExampleTables,
    selectedColumns: undefined,
    extraFilters: undefined,
    contextData: label === "Session value" ? filterExampleContext : undefined,
  };

  return (
    <FlexCol className="gap-p5 min-w-0" data-filter-example={label}>
      <strong>{label}</strong>
      <div className="o-auto p-p5" style={{ minHeight: "60px" }}>
        {!filter ?
          <span className="text-1">Filter deleted. Reset all to restore.</span>
        : "$and" in filter || "$or" in filter ?
          <GroupedFilterControl
            {...filterProps}
            tableName={filterExampleTable.name}
            type="where"
            itemName="condition"
            filter={filter}
            onChange={onChange}
          />
        : <DetailedFilterControl
            {...filterProps}
            table={filterExampleTable}
            filterItem={filter}
            minimisedOverride={undefined}
            otherFilters={[]}
            onChange={onChange}
          />
        }
      </div>
    </FlexCol>
  );
};

const updateFilter = (
  filter: PreviewFilter,
  updateCondition: (condition: DetailedFilterBase) => DetailedFilterBase,
  state: BaseFilter = {},
): PreviewFilter => {
  if ("$and" in filter)
    return {
      $and: filter.$and.map((condition) =>
        updateFilter(condition, updateCondition, state),
      ),
    };
  if ("$or" in filter)
    return {
      $or: filter.$or.map((condition) =>
        updateFilter(condition, updateCondition, state),
      ),
    };
  if ("path" in filter)
    return {
      ...filter,
      ...state,
      filter: updateFilter(
        filter.filter,
        updateCondition,
        state,
      ) as typeof filter.filter,
    };
  return updateCondition(filter);
};
