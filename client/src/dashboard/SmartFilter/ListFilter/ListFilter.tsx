import React from "react";
import RTComp from "../../RTComp";
import type { SearchListItem } from "../../../components/SearchList/SearchList";
import SearchList from "../../../components/SearchList/SearchList";
import Loading from "../../../components/Loading";
import type { BaseFilterProps } from "../SmartFilter";
import { getSmartGroupFilter } from "../SmartFilter";
import type { FilterType } from "../../../../../commonTypes/filterUtils";
import type { AnyObject } from "prostgles-types";
import { isObject } from "prostgles-types";
import type { Primitive } from "d3";
import { getSuggestions } from "../../SmartForm/SmartFormField/fieldUtils";
import { FlexRow } from "../../../components/Flex";
import { fetchListFilterOptions } from "./fetchListFilterOptions";

type ListFilterProps = BaseFilterProps;

type ListFilterState = {
  searchTerm?: string;

  popupAnchor?: HTMLElement;
  defaultSearch?: string;
  options?: any[];
  allOptionsCount?: number;
  searchingItems?: boolean;
  error?: any;
};

export class ListFilter extends RTComp<ListFilterProps, ListFilterState> {
  static TYPES: FilterType[] = ["$in", "$nin"];
  state: ListFilterState = {
    searchTerm: "",
  };

  searching?: {
    term: string;
    timeout: any;
  };

  setTerm = async (term: string) => {
    if (this.searching) {
      if (this.searching.term === term) {
        return;
      } else {
        clearTimeout(this.searching.timeout);
      }
    }

    if (typeof term !== "string") {
      this.setState({ searchingItems: false });
    } else {
      if (!this.state.searchingItems) {
        this.setState({ searchingItems: true });
      }

      this.searching = {
        term,
        timeout: setTimeout(async () => {
          this.setState({ searchingItems: true });
          // const matchCase = this.props.matchCase?.value ?? this.state.matchCase;

          try {
            const { db, column, tableName, tables, otherFilters } = this.props;

            const { options = [] } = await fetchListFilterOptions({
              db,
              column,
              tableName,
              tables,
              otherFilters,
              term,
            });

            let newState: Partial<ListFilterState> = {
              options,
              searchingItems: false,
              error: undefined,
            };
            if (!this.state.options) {
              newState = {
                ...newState,
                allOptionsCount: options.length,
              };
            }

            if (term === this.searching?.term) {
              this.setState(newState as any);
              this.searching = undefined;
            } else {
              this.setState({ searchingItems: false, error: undefined });
            }
          } catch (error) {
            this.setState({ error });
          }
        }, 400),
      };
    }
  };

  onDelta = async (dP, dS = {}, dD) => {
    const { searchTerm = "" } = this.state;

    if (!this.state.options || "searchTerm" in dS) {
      this.setTerm(searchTerm);
    }
  };

  getParsedOption = (
    v: AnyObject | Primitive | null | undefined,
  ): Pick<SearchListItem, "key" | "label" | "title" | "data" | "checked"> => {
    const { filter, column } = this.props;
    const parseKey = (key: typeof v) => {
      if (key && isObject(key) && !(key instanceof Date)) {
        return JSON.stringify(key);
      }
      return key;
    };
    if (column.udt_name === "interval") {
    }

    const checkedValues = (
      filter?.value && Array.isArray(filter.value) ?
        filter.value
      : []).map(parseKey);
    const key = parseKey(v);

    return {
      key,
      title: key === null ? "NULL" : key?.toString(),
      data: v as any,
      checked: checkedValues.includes(key),
    };
  };

  render(): React.ReactNode {
    const { filter, onChange, column } = this.props;
    const { options, searchTerm, searchingItems } = this.state;

    if (!filter)
      return <>Something went wrong. Could not find column {column.name}</>;

    if (!options) {
      return (
        <div className="p-1 relative f-1">
          <Loading delay={200} />
        </div>
      );
    }

    const searchedItems = options.map(this.getParsedOption);
    let filterExtraItems: SearchListItem[] = [];
    let filterItems: SearchListItem[] = [];
    if (Array.isArray(filter.value) && filter.value.length) {
      filterItems = filter.value.map(this.getParsedOption);
      filterExtraItems = filterItems.filter(
        (v) => !searchedItems.map((o) => o.key).includes(v.key),
      );
    }

    const renderedItems = [
      /** Need to ensure that the selected values are displayed (even if missing in the suggestions) */
      ...filterExtraItems,
      ...searchedItems,
    ];
    const items = renderedItems.map((item) => {
      return {
        ...item,
        style:
          item.data === null ?
            {
              fontStyle: "italic",
              opacity: 0.7,
            }
          : undefined,
        onPress: () => {
          let newSelectedKeys = filterItems.map((d) => d.key);

          if (!newSelectedKeys.includes(item.key)) {
            newSelectedKeys.push(item.key);
          } else {
            newSelectedKeys = newSelectedKeys.filter((v) => v !== item.key);
          }
          const newValue = renderedItems
            .filter((d) => newSelectedKeys.includes(d.key))
            .map((d) => d.data);

          onChange({
            ...filter,
            disabled: !newValue.length,
            value: newValue,
          });
        },
      };
    });

    return (
      <>
        {searchingItems && <Loading variant="cover" />}
        <SearchList
          onSearch={(searchTerm) => {
            this.setState({ searchTerm });
          }}
          noSearchLimit={0}
          id="values"
          items={items}
          onMultiToggle={(items) => {
            const vals = items.filter((d) => d.checked);
            onChange({
              ...filter,
              value: !vals.length ? undefined : vals.map((v) => v.key),
            });
          }}
          onNoResultsContent={() => (
            <FlexRow>
              <div className="text-0p75">No matches</div>
              <div className="text-2">Press enter to add</div>
            </FlexRow>
          )}
          onPressEnter={(term) => {
            const currentValues =
              Array.isArray(filter.value) ? filter.value : [];
            onChange({
              ...filter,
              value: currentValues.concat([searchTerm]),
            });
            this.setState({ searchTerm: "" });
          }}
          onChange={
            ((_value: string[]) => {
              onChange({
                ...filter,
                value: !_value.length ? undefined : _value,
              });
            }) as any
          }
        />
      </>
    );
  }
}
