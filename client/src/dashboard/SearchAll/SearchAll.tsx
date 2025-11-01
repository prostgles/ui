import type { SimpleFilter } from "@common/filterUtils";
import Popup from "@components/Popup/Popup";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import React from "react";
import type { Prgl } from "../../App";
import type { _Dashboard } from "../Dashboard/Dashboard";
import type { WindowData } from "../Dashboard/dashboardUtils";
import type { SQLSuggestion } from "../SQLEditor/W_SQLEditor";
import { SearchAllContent } from "./SearchAllContent";
import { SearchAllHeader } from "./SearchAllHeader";
import { useSearchAllState } from "./hooks/useSearchAllState";

export const SEARCH_TYPES = [
  { key: "views and queries", label: "Tables/Queries" },
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

export type SearchAllProps = Pick<Prgl, "db" | "methods" | "tables"> & {
  suggestions: SQLSuggestion[] | undefined;
  onClose: () => void;
  onOpen: (arg: { table: string; filter: SimpleFilter[] }) => void;
  onOpenDBObject: (
    suggestion: SearchAllSuggestion | undefined,
    method_name?: string,
  ) => void;
  style?: object;
  className?: string;
  searchType?: (typeof SEARCH_TYPES)[number]["key"];
  defaultTerm?: string;
  queries?: SyncDataItem<WindowData<"sql">>[];
  loadTable: _Dashboard["loadTable"];
};

export const SearchAll = (props: SearchAllProps) => {
  const state = useSearchAllState(props);
  const { isLowWidthScreen } = window;
  const margin = isLowWidthScreen ? 0 : "2em";
  return (
    <Popup
      anchorXY={{ x: 20, y: 20 }}
      positioning="inside-top-center"
      title={<SearchAllHeader {...state} {...props} />}
      contentClassName=" p-1"
      clickCatchStyle={{ opacity: 1 }}
      contentStyle={{ overflow: "unset", paddingTop: "1em" }}
      data-command="SearchAll.Popup"
      rootStyle={{
        minHeight: "50vh",
        top: margin,
        right: margin,
        left: margin,
        maxHeight: `calc(100vh - 4em)`,
      }}
      onClose={props.onClose}
      focusTrap={true}
      autoFocusFirst={{
        selector: "input",
      }}
    >
      <SearchAllContent {...state} {...props} />
    </Popup>
  );
};
