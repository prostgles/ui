import type { Primitive } from "d3";
import { type AnyObject } from "prostgles-types";
import React from "react";
import type { TestSelectors } from "../../Testing";
import "../List.css";
import type { OptionKey } from "../Select/Select";
import type { SearchInputProps } from "./SearchInput";
import "./SearchList.css";
import { SearchListContent } from "./SearchListContent";

export type SearchListItemContent = {
  content?: React.ReactNode;
  contentLeft?: React.ReactNode;
  contentRight?: React.ReactNode;
  contentBottom?: React.ReactNode;
  contentTop?: React.ReactNode;
};
export type SearchListItem = TestSelectors & {
  key: OptionKey;
  label?: string | React.ReactNode;
  /**
   * Parent labels are used to group items in the search list.
   */
  parentLabels?: string[];
  rowStyle?: React.CSSProperties;
  rowClassname?: string;
  title?: string;
  subLabel?: string;
  ranking?: number | ((searchTerm: string) => number);
  checked?: boolean;
  selected?: boolean;
  onPress?: (
    e:
      | React.MouseEvent<HTMLLIElement, globalThis.MouseEvent>
      | React.KeyboardEvent<HTMLLIElement>,
    term?: string,
  ) => void;
  style?: React.CSSProperties;
  styles?: {
    rowInner?: React.CSSProperties;
    labelWrapper?: React.CSSProperties;
    label?: React.CSSProperties;
    subLabel?: React.CSSProperties;
    labelRootWrapperStyle?: React.CSSProperties;
  };
  data?: AnyObject | Primitive | null;
  disabledInfo?: string;
} & SearchListItemContent;

export type ParsedListItem = SearchListItem & {
  node?: React.ReactNode;
  rank?: number;
};

export type SearchListProps<M extends boolean = false> = TestSelectors & {
  defaultSearch?: string;
  defaultValue?: string;

  onChange?: (val: M extends true ? OptionKey[] : OptionKey, e: any) => void;
  onSearch?: (term: string, e: any) => void;
  onSearchItems?: (
    term: string,
    opts?: { matchCase?: boolean },
    onPartialResult?: (
      searchItems: SearchListItem[],
      finished: boolean,
      cancel: Function,
    ) => any,
  ) => Promise<SearchListItem[]>;
  onType?: (term: string, setTerm: (newTerm: string) => void) => void;
  items?: SearchListItem[];
  onReorder?: (newItems: SearchListItem[]) => void;
  style?: React.CSSProperties;
  className?: string;
  /**
   * The id is used for the header checkbox to ensure it works
   */
  id?: string;

  inputID?: string;
  checkboxed?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  inputProps?: Pick<
    SearchInputProps,
    "type" | "leftContent" | keyof TestSelectors | "autoFocus"
  >;

  leftContent?: React.ReactNode;

  /**
   * If provided then allows toggling all values
   */
  onMultiToggle?: (
    items: SearchListItem[],
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  inputEl?: HTMLElement;
  dontHighlight?: boolean;
  label?: React.ReactNode;
  variant?: "search" | "search-no-shadow";
  noBorder?: boolean;
  selectedKey?: OptionKey;
  rootStyle?: React.CSSProperties;

  /**
   * Number of rows to slice from result
   */
  limit?: number;

  /**
   * If number of items is below this value then hide search bar
   */
  noSearchLimit?: number;

  /**
   * If specified then pressing Enter will trigger this instead of the first result UNLESS arrow keys have been moved
   */
  onPressEnter?: (term: string) => any;

  matchCase?:
    | {
        hide?: undefined;
        value?: boolean;
        onChange: (matchCase: boolean) => any;
      }
    | {
        hide: true;
        value?: undefined;
        onChange?: undefined;
      };

  searchStyle?: React.CSSProperties;
  searchEmpty?: boolean;

  /* Used to identify when to refresh the data */
  dataSignature?: string;

  inputStyle?: React.CSSProperties;

  noResultsContent?: React.ReactNode;
  endOfResultsContent?: React.ReactNode;

  rowStyleVariant?: "row-wrap";
};

export const SearchList = <M extends boolean = false>(
  props: SearchListProps<M>,
) => {
  return <SearchListContent {...props} />;
};
