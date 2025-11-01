import { isDefined } from "src/utils";
import type { SearchAllProps, SearchAllSuggestion } from "../SearchAll";
import { useMemo } from "react";

export const useTablesAndViewsSearchItems = ({
  tables,
  suggestions,
  db,
}: Pick<SearchAllProps, "tables" | "suggestions" | "db">) => {
  const tableMap: Map<number, (typeof tables)[number]> = useMemo(
    () => new Map(tables.map((t) => [t.info.oid, t])),
    [tables],
  );
  const searchItems: SearchAllSuggestion[] = useMemo(
    () =>
      suggestions
        ?.slice(0)
        .map((s) => {
          const { type, OID } = s;
          const isUserCreatedTable =
            (type === "table" || type === "view") &&
            s.schema &&
            !["information_schema"].includes(s.schema) &&
            !s.schema.startsWith("pg_");
          if (!isUserCreatedTable) return;
          const table = !OID ? undefined : tableMap.get(OID);
          return {
            name: s.name,
            schema: s.schema,
            type,
            icon: table?.icon,
            escapedIdentifier: s.escapedIdentifier,
            subLabel:
              table ? table.columns.map((c) => c.name).join(", ") : undefined,
          } satisfies SearchAllSuggestion;
        })
        .filter(isDefined) ??
      tables
        .map(({ name, icon }) => {
          const handler = db[name];
          if (handler && "find" in handler && handler.find) {
            return {
              name,
              type: "table",
              escapedIdentifier: JSON.stringify(name),
              icon,
              subLabel: "",
            } satisfies SearchAllSuggestion;
          }
        })
        .filter(isDefined),
    [db, suggestions, tableMap, tables],
  );
  return searchItems;
};
