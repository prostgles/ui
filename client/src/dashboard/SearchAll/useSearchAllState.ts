import { useMemo, useState } from "react";
import { getTablesAndViews } from "./getTablesAndViews";
import type { SearchAllProps } from "./SearchAll";
import type { SearchListProps } from "@components/SearchList/SearchList";

export const useSearchAllState = ({
  db,
  suggestions,
  tables,
}: SearchAllProps) => {
  const [typesToSearch, setTypesToSearch] = useState<
    ("tables" | "queries" | "actions")[]
  >(["tables", "queries", "actions"]);
  const [mode, setMode] = useState<"views and queries" | "rows">("rows");
  const tablesAndViews = useMemo(
    () => getTablesAndViews({ db, suggestions, tables }),
    [db, suggestions, tables],
  );
  const [tablesToSearch, setTablesToSearch] = useState<string[]>(
    tablesAndViews.map((t) => t.name),
  );
  const [matchCase, setMatchCase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchListProps["items"]>();
  const [currentSearchedTable, setCurrentSearchedTable] = useState<string>();
  return {
    tablesAndViews,
    tablesToSearch,
    setTablesToSearch,
    typesToSearch,
    setTypesToSearch,
    mode,
    setMode,
    matchCase,
    setMatchCase,
    loading,
    setLoading,
    currentSearchedTable,
    setCurrentSearchedTable,
    items,
    setItems,
  };
};

export type SearchAllState = ReturnType<typeof useSearchAllState>;
