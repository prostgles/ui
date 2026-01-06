import { useState } from "react";
import type { SearchAllProps } from "../SearchAll";
import { useTablesAndViewsSearchItems } from "./useTablesAndViewsSearchItems";

export const useSearchAllState = ({
  db,
  suggestions,
  tables,
  searchType,
}: SearchAllProps) => {
  const [typesToSearch, setTypesToSearch] = useState<
    ("tables" | "queries" | "actions")[]
  >(["tables", "queries", "actions"]);
  const [mode, setMode] = useState<"views and queries" | "rows">(
    searchType ?? "rows",
  );
  const tablesAndViews = useTablesAndViewsSearchItems({
    db,
    suggestions,
    tables,
  });
  const [tablesToSearch, setTablesToSearch] = useState(
    tablesAndViews.map((t) => t.name),
  );
  const [matchCase, setMatchCase] = useState(false);
  const [loading, setLoading] = useState(false);
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
  };
};

export type SearchAllState = ReturnType<typeof useSearchAllState>;
