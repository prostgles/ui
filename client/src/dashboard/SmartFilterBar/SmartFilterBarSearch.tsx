import type { DetailedFilter } from "@common/filterUtils";
import { isJoinedFilter } from "@common/filterUtils";
import ErrorComponent from "@components/ErrorComponent";
import { useMemoDeep } from "prostgles-client/dist/react-hooks";
import type { AnyObject } from "prostgles-types";
import React from "react";
import { SmartSearch } from "../SmartFilter/SmartSearch/SmartSearch";
import { colIs } from "../SmartForm/SmartFormField/fieldUtils";
import type { SmartFilterBarProps } from "./SmartFilterBar";

type P = Pick<SmartFilterBarProps, "db" | "tables" | "style"> & {
  tableName: string;
  filter: DetailedFilter[];
  extraFilters: AnyObject[] | undefined;
  onFilterChange: (newFilter: DetailedFilter[]) => void;
};

export const SmartFilterBarSearch = ({
  tables,
  db,
  tableName,
  filter,
  extraFilters,
  onFilterChange,
  style,
}: P) => {
  const table = useMemoDeep(
    () => tables.find((t) => t.name === tableName),
    [tables, tableName],
  );
  if (!table) {
    return <ErrorComponent error="Table not found" />;
  }
  return (
    <SmartSearch
      tables={tables}
      db={db}
      style={{
        alignSelf: "center",
        width: "500px",
        maxWidth: "80vw",
        ...style,
      }}
      className="m-auto"
      tableName={tableName}
      detailedFilter={filter}
      extraFilters={extraFilters}
      onPressEnter={(term) => {
        let newGroupFilter = filter.slice(0);
        const newF: DetailedFilter = {
          fieldName: "*",
          type: "$term_highlight",
          value: term,
          minimised: true,
        };
        newGroupFilter = [...filter, newF];
        onFilterChange(newGroupFilter);
      }}
      onChange={(val) => {
        const { filter: gFilter, colName, columnValue, term } = val ?? {};

        if (!gFilter) {
          onFilterChange([...filter]);
          return;
        }

        const col = table.columns.find((c) => c.name === colName);

        if (!colName) throw "Unexpected: colName missing";

        let newGroupFilter = gFilter.slice(0);

        if (
          columnValue?.toString().length &&
          col &&
          (colIs(col, "_PG_date") || colIs(col, "_PG_numbers"))
        ) {
          const newF: DetailedFilter = {
            fieldName: colName,
            minimised: true,
            ...(colIs(col, "_PG_date") ?
              {
                type: "$term_highlight",
                value: term,
              }
            : {
                type: "=",
                value: columnValue,
              }),
          };
          newGroupFilter = [...filter, newF];
        }

        onFilterChange(newGroupFilter);
      }}
    />
  );
};

export const toggleAllFilters = (
  filters: DetailedFilter[],
  minimised?: boolean,
) => {
  const someFiltersExpanded = minimised ?? filters.some((f) => !f.minimised);

  return filters.map((f) => {
    if (isJoinedFilter(f)) {
      f.filter.minimised = someFiltersExpanded;
    }
    return {
      ...f,
      minimised: someFiltersExpanded,
    };
  });
};
