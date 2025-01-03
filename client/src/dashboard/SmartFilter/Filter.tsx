import { mdiCog, mdiFormatLetterMatches } from "@mdi/js";
import { omitKeys, isEqual, isDefined } from "prostgles-types";
import React from "react";
import type { SimpleFilter } from "../../../../commonTypes/filterUtils";
import {
  FTS_FILTER_TYPES,
  TEXT_FILTER_TYPES,
  getFinalFilter,
} from "../../../../commonTypes/filterUtils";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import { ContextDataSelector } from "../AccessControl/ContextDataSelector";
import RTComp from "../RTComp";
import SmartFormField from "../SmartForm/SmartFormField/SmartFormField";
import { colIs } from "../W_Table/ColumnMenu/ColumnSelect";
import { AgeFilter, AgeFilterTypes } from "./AgeFilter";
import { FilterWrapper, type FilterWrapperProps } from "./FilterWrapper";
import { GeoFilter, GeoFilterTypes } from "./GeoFilter";
import { ListFilter } from "./ListFilter/ListFilter";
import { NumberOrDateFilter } from "./NumberOrDateFilter";
import type { BaseFilterProps } from "./SmartFilter";
import { SmartSearch } from "./SmartSearch/SmartSearch";
import { getTableSelect } from "../W_Table/tableUtils/getTableSelect";

type FilterProps = BaseFilterProps &
  Pick<FilterWrapperProps, "rootFilter" | "selectedColumns"> & {
    hideToggle?: boolean;
    minimised?: boolean;
  };

const validateFilter = async (
  filter: SimpleFilter,
  {
    db,
    tableName,
    column,
    tables,
  }: Pick<BaseFilterProps, "db" | "tableName" | "column" | "tables">,
) => {
  try {
    const tableHandler = db[tableName];
    const finalFilter = getFinalFilter(filter);
    const isHaving =
      column.type === "computed" && column.computedConfig.funcDef.isAggregate;
    const select =
      column.type === "column" ?
        ""
      : (
          await getTableSelect(
            { table_name: tableName, columns: column.columns },
            tables,
            db,
            finalFilter ?? {},
          )
        ).select;
    await tableHandler?.find?.(isHaving ? {} : finalFilter, {
      select,
      having: isHaving ? finalFilter : undefined,
      limit: 0,
    });
    return {
      hasError: false,
      error: undefined,
    };
  } catch (error: any) {
    return {
      hasError: true,
      error,
    };
  }
};

export class Filter extends RTComp<FilterProps, { error?: any }> {
  /**
   * Disable invalid filters
   */
  onChangeWithValidation = async (_newFilter: SimpleFilter | undefined) => {
    const { db, tableName, column, tables } = this.props;

    let newFilter = _newFilter;
    let newError;
    if (newFilter) {
      const { hasError, error } = await validateFilter(newFilter, {
        db,
        tableName,
        column,
        tables,
      });
      newError = error;
      if (hasError) {
        newFilter = {
          ...newFilter,
          disabled: true,
        };
      }
    }
    if (!isEqual(this.state.error, newError)) {
      this.setState({ error: newError });
    }
    this.props.onChange(newFilter);
  };

  render() {
    const {
      column,
      tables,
      onChange: _onChange,
      db,
      tableName,
      contextData,
      extraFilters,
    } = this.props;
    const { error } = this.state;

    const onChange = this.onChangeWithValidation;

    const filter = {
      ...this.props.filter,
      fieldName: this.props.filter?.fieldName ?? column.name,
      type: this.props.filter?.type ?? "=",
    };

    /** There is a change the options */
    const propsFilter = this.props.filter;

    const withContextFilter = (filterNode: React.ReactNode) => {
      if (contextData) {
        const ctxCols = contextData.flatMap((t) =>
          t.columns
            .filter((c) => c.tsDataType === column.tsDataType)
            .map((c) => ({
              id: t.name + "." + c.name,
              tableName: t.name,
              ...c,
            })),
        );
        if (ctxCols.length && ["=", "!=", "<>"].includes(filter.type)) {
          return (
            <FlexRow className={"gap-p5"}>
              {!propsFilter?.contextValue ? filterNode : null}
              <ContextDataSelector
                className=""
                value={propsFilter?.contextValue}
                column={column}
                contextData={contextData}
                onChange={(contextValue) => {
                  if (!contextValue) {
                    onChange(
                      omitKeys(
                        {
                          ...filter,
                          disabled: true,
                        },
                        ["contextValue"],
                      ),
                    );
                  } else {
                    onChange({
                      ...filter,
                      disabled: false,
                      contextValue,
                    });
                  }
                }}
              />
            </FlexRow>
          );
        }
      }

      return filterNode;
    };

    let content: React.ReactNode;

    const filterProps = {
      ...this.props,
      onChange,
    };

    if (
      propsFilter &&
      GeoFilterTypes.includes(propsFilter.type as any) &&
      colIs(column, "_PG_postgis")
    ) {
      content = (
        <GeoFilter filter={propsFilter} {...filterProps} error={error} />
      );
    } else if (AgeFilterTypes.includes(propsFilter?.type as any)) {
      content = <AgeFilter {...filterProps} error={error} />;
    } else if (
      propsFilter?.type === "not null" ||
      propsFilter?.type === "null"
    ) {
      content = null;
    } else if (ListFilter.TYPES.includes(propsFilter?.type as any)) {
      content = <ListFilter {...filterProps} error={error} />;
    } else {
      const textFilterType =
        ["$ilike", "$like", "$nilike", "$nlike"].includes(filter.type) ? "text"
        : FTS_FILTER_TYPES.some((f) => f.key === filter.type) ? "fts"
        : undefined;
      /** Disable suggestions, allow text only */
      if (textFilterType) {
        content = (
          <FormFieldDebounced
            asColumn={true}
            className="m-p5"
            type="text"
            autoComplete="off"
            value={filter.value}
            onChange={(value) => {
              onChange({
                //  !_value.length? undefined :
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
                      color={
                        filter.ftsFilterOptions?.lang ? "action" : undefined
                      }
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
                          onChange({
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
        content = (
          <NumberOrDateFilter
            {...filterProps}
            type={column.tsDataType.toLowerCase() as any}
            inputType={SmartFormField.getInputType(column)}
          />
        );

        /** Show suggestions */
      } else {
        const key = JSON.stringify(filter.value ?? "");

        const filterItem = this.props.selectedColumns?.find(
          (c) => c.name === filter.fieldName,
        );
        content = (
          <SmartSearch
            className=" "
            key={key}
            db={db}
            extraFilters={extraFilters}
            selectedColumns={this.props.selectedColumns}
            tableName={tableName}
            variant="search-no-shadow"
            tables={tables}
            defaultValue={filter.value}
            column={filterItem ?? filter.fieldName}
            searchEmpty={true}
            wrapperStyle={{
              borderRadius: 0,
              borderTop: "unset",
              borderBottom: "unset",
            }}
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

              onChange(f);
            }}
            onChange={(val) => {
              if (!isDefined(val)) {
                onChange({
                  ...filter,
                  value: undefined,
                  disabled: true,
                });
                return;
              }
              const { columnValue, term } = val;
              const f = { ...filter };
              f.value =
                (
                  TEXT_FILTER_TYPES.map((ft) => ft.key as string)
                    .concat(["$term_highlight"])
                    .includes(f.type)
                ) ?
                  val.columnTermValue
                : (columnValue ?? term); // f.type === "$term_highlight"? term : columnValue
              f.disabled = false;

              onChange(f);
            }}
          />
        );
      }
    }

    return (
      <FilterWrapper error={error} {...filterProps} filter={filter}>
        {withContextFilter(content)}
      </FilterWrapper>
    );
  }
}

/**
  SELECT cfgname
  FROM pg_catalog.pg_ts_config
 */
const FTS_LANGUAGES = [
  "simple",
  "arabic",
  "armenian",
  "basque",
  "catalan",
  "danish",
  "dutch",
  "english",
  "finnish",
  "french",
  "german",
  "greek",
  "hindi",
  "hungarian",
  "indonesian",
  "irish",
  "italian",
  "lithuanian",
  "nepali",
  "norwegian",
  "portuguese",
  "romanian",
  "russian",
  "serbian",
  "spanish",
  "swedish",
  "tamil",
  "turkish",
  "yiddish",
] as const;
