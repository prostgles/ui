import { FTS_FILTER_TYPES, TEXT_FILTER_TYPES } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { mdiCog, mdiFormatLetterMatches } from "@mdi/js";
import { includes, isDefined } from "prostgles-types";
import React, { useMemo } from "react";
import { AgeFilter, AgeFilterTypes } from "./DetailedFilterBaseTypes/AgeFilter";
import { type FilterWrapperProps } from "./FilterWrapper";
import { GeoFilter, GeoFilterTypes } from "./DetailedFilterBaseTypes/GeoFilter";
import { ListFilter } from "./DetailedFilterBaseTypes/ListFilter/ListFilter";
import { NumberOrDateFilter } from "./DetailedFilterBaseTypes/NumberOrDateFilter";
import type { BaseFilterProps } from "../SmartFilter/SmartFilter";
import { SmartSearch } from "../SmartFilter/SmartSearch/SmartSearch";
import { colIs, getInputType } from "../SmartForm/SmartFormField/fieldUtils";
import { FTS_LANGUAGES } from "./FTS_LANGUAGES";

export type FilterProps = BaseFilterProps &
  Pick<FilterWrapperProps, "rootFilter" | "selectedColumns" | "label"> & {
    hideToggle?: boolean;
    minimised?: boolean;
    error: unknown;
  };

export const DetailedFilterBaseControlRouter = (props: FilterProps) => {
  const {
    column,
    tables,
    onChange,
    db,
    tableName,
    extraFilters,
    filter: propsFilter,
    selectedColumns,
    error,
  } = props;

  const filter = useMemo(
    () => ({
      ...propsFilter,
      fieldName: propsFilter?.fieldName ?? column.name,
      type: propsFilter?.type ?? "=",
    }),
    [propsFilter, column.name],
  );

  if (
    propsFilter &&
    includes(GeoFilterTypes, propsFilter.type) &&
    colIs(column, "_PG_postgis")
  ) {
    return <GeoFilter filter={propsFilter} {...props} error={error} />;
  } else if (includes(AgeFilterTypes, propsFilter?.type)) {
    return <AgeFilter {...props} error={error} />;
  } else if (propsFilter?.type === "not null" || propsFilter?.type === "null") {
    return null;
  } else if (includes(ListFilter.TYPES, propsFilter?.type)) {
    return <ListFilter {...props} error={error} />;
  } else {
    const textFilterType =
      ["$ilike", "$like", "$nilike", "$nlike"].includes(filter.type) ? "text"
      : FTS_FILTER_TYPES.some((f) => f.key === filter.type) ? "fts"
      : undefined;
    /** Disable suggestions, allow text only */
    if (textFilterType) {
      return (
        <FormFieldDebounced
          className="m-p5"
          type="text"
          autoComplete="off"
          value={filter.value}
          onChange={(value) => {
            void onChange({
              ...filter,
              disabled: false,
              value: `${value}`,
            });
          }}
          rightIcons={
            textFilterType === "text" ? undefined : (
              <PopupMenu
                button={
                  <Btn
                    iconPath={
                      filter.ftsFilterOptions?.lang === "simple" ?
                        mdiFormatLetterMatches
                      : mdiCog
                    }
                    color={filter.ftsFilterOptions?.lang ? "action" : undefined}
                  />
                }
                title={"FTS options"}
                positioning="beneath-left"
                clickCatchStyle={{ opacity: 0 }}
                render={(pClose) => (
                  <FlexCol>
                    <Select
                      label={{
                        label: "Dictionary",
                        info: "Choose 'simple' for exact word matching. Dictionaries are used to eliminate words that should not be considered in a search (stop words), and to normalize words so that different derived forms of the same word will match. A successfully normalized word is called a lexeme.",
                      }}
                      options={FTS_LANGUAGES}
                      value={filter.ftsFilterOptions?.lang ?? "english"}
                      onChange={(lang) => {
                        void onChange({
                          ...filter,
                          ftsFilterOptions: {
                            ...filter.ftsFilterOptions,
                            lang,
                          },
                        });
                        pClose();
                      }}
                    />
                  </FlexCol>
                )}
              />
            )
          }
        />
      );
    } else if (filter.type === "$between") {
      return (
        <NumberOrDateFilter
          {...props}
          type={
            column.tsDataType.toLowerCase() === "number" ? "number" : "date"
          }
          inputType={getInputType(column)}
        />
      );

      /** Show suggestions */
    } else {
      const key = JSON.stringify(filter.value ?? "");

      const filterColumn = selectedColumns?.find(
        (c) => c.name === filter.fieldName,
      );
      return (
        <SmartSearch
          className=" "
          key={key}
          db={db}
          extraFilters={extraFilters}
          selectedColumns={selectedColumns}
          tableName={tableName}
          variant="search-no-shadow"
          tables={tables}
          defaultValue={filter.value}
          column={filterColumn ?? filter.fieldName}
          searchEmpty={true}
          noBorder={true}
          noResultsComponent={
            <FlexRow>
              <div className="text-0p75">No results</div>
              <div className="text-2">Press enter to confirm</div>
            </FlexRow>
          }
          onPressEnter={(term) => {
            const f = { ...filter };
            f.value = term;
            f.disabled = false;

            void onChange(f);
          }}
          onChange={(val) => {
            if (!isDefined(val)) {
              void onChange({
                ...filter,
                value: undefined,
                disabled: true,
              });
              return;
            }
            const { columnValue, term } = val;
            const f = { ...filter };
            f.value =
              includes([...TEXT_FILTER_TYPES, "$term_highlight"], f.type) ?
                val.columnTermValue
              : (columnValue ?? term);
            f.disabled = false;

            void onChange(f);
          }}
        />
      );
    }
  }
};
