import type { DetailedFilter } from "@common/filterUtils";
import { Footer } from "@components/Popup/Footer";
import type { SearchListProps } from "@components/SearchList/SearchList";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import React from "react";
import type { Prgl } from "../../App";
import type { WindowData } from "@common/ColumnConfig/WindowData";
import type { SQLSuggestion } from "../SQLEditor/W_SQLEditor";
import { SearchAllContent } from "./SearchAllContent";
import { SearchAllHeader } from "./SearchAllHeader";
import { useSearchAllState } from "./hooks/useSearchAllState";

export const SEARCH_TYPES = [
  { key: "views and queries", label: "Views" },
  { key: "rows", label: "Data" },
] as const;

export type DBObject = {
  name: string;
  info: string;
  type: "table" | "view" | "function" | "index" | "type";
  schema: string;
};

export type SearchAllSuggestion = Pick<
  SQLSuggestion,
  "schema" | "subLabel" | "name" | "escapedIdentifier" | "definition"
> & {
  type: "table" | "function" | "view" | "mview";
  icon?: string;
};

export type SearchAllProps = Pick<Prgl, "db" | "methods" | "tables" | "sql"> & {
  suggestions: SQLSuggestion[] | undefined;
  onClose: () => void;
  onOpen: (arg: { table: string; filter: DetailedFilter[] }) => void;
  onOpenDBObject: (
    suggestion: SearchAllSuggestion | undefined,
    method_name?: string,
  ) => void;
  style?: object;
  className?: string;
  searchType?: (typeof SEARCH_TYPES)[number]["key"];
  defaultTerm?: string;
  leftContent: React.ReactNode;
  onType: NonNullable<SearchListProps["onType"]>;
  queries?: SyncDataItem<WindowData<"sql">, { handlesOnData: true }>[];
};

export const SearchAll = (props: SearchAllProps) => {
  const state = useSearchAllState(props);
  return (
    <div className="flex-col min-h-0 gap-1" data-command="SearchAll.Popup">
      <SearchAllContent {...state} {...props} />
      <Footer className="f-0 px-0 pt-p5">
        <SearchAllHeader {...state} />
      </Footer>
    </div>
  );
};
