import React, { useCallback, useState } from "react";
import { useIsMounted } from "../../BackupAndRestore/CredentialSelector";
import type { SearchAllProps } from "../SearchAll";
import { type SearchMatch } from "../SearchMatchRow";
import type { SearchAllState } from "./useSearchAllState";

export const useSearchTables = (props: SearchAllProps & SearchAllState) => {
  const {
    db,
    mode,
    tables,
    setLoading,
    tablesToSearch,
    matchCase,
    setCurrentSearchedTable,
  } = props;

  const [matchedRows, setMatchedRows] = useState<
    (SearchMatch & {
      $rowhash: any;
      colName: string;
    })[]
  >();

  const [searchTerm, setSearchTerm] = useState("");

  const searchingRef = React.useRef<{
    timeout: ReturnType<typeof setTimeout> | null;
    term: string;
    mode: "views and queries" | "rows";
    abortController: AbortController;
  }>();
  const getIsMounted = useIsMounted();
  const searchRows = useCallback(
    (searchTerm = "") => {
      setSearchTerm(searchTerm);
      if (searchingRef.current) {
        const { timeout, abortController } = searchingRef.current;
        timeout && clearTimeout(timeout);
        abortController.abort();
      }
      const abortController = new AbortController();
      searchingRef.current = {
        term: searchTerm,
        mode,
        timeout: null,
        abortController,
      };

      searchingRef.current.timeout = setTimeout(async () => {
        const term = searchingRef.current?.term ?? searchTerm;

        if (mode === "rows" && db.sql) {
          setLoading(true);

          // setItems(undefined);
          setMatchedRows(undefined);

          try {
            for (const k of tablesToSearch) {
              /** Exclude numeric and timestamp columns when term contains characters  */
              let colsToSearch: "*" | string[] = "*";
              const cols = tables.find((t) => t.name === k)?.columns;
              if (cols) {
                colsToSearch = cols
                  .filter(
                    (c) =>
                      c.select &&
                      c.filter &&
                      c.udt_name !== "geography" &&
                      c.udt_name !== "geometry" &&
                      (!/[a-z]/i.test(term) || c.tsDataType !== "number"),
                  )
                  .map((c) => c.name);
              }

              const tableHandler = db[k];
              if (
                tableHandler?.find &&
                getIsMounted() &&
                colsToSearch.length &&
                term === searchingRef.current?.term &&
                !abortController.signal.aborted
              ) {
                setCurrentSearchedTable(k);
                const s = {
                    $term_highlight: [
                      colsToSearch,
                      term,
                      { edgeTruncate: 30, matchCase, returnType: "object" },
                    ],
                  },
                  filter = {
                    $term_highlight: [
                      colsToSearch,
                      term,
                      { matchCase, returnType: "boolean" },
                    ],
                  },
                  res = await tableHandler.find(filter, {
                    select: { $rowhash: 1, s },
                    limit: 3,
                  }); /** Search top 3 records per table */

                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (abortController.signal.aborted) break;

                const _matches = res
                  .filter((r) => r.s)
                  .map((r) => {
                    const colName = Object.keys(r.s)[0]!;
                    return {
                      $rowhash: r.$rowhash,
                      table: k,
                      colName,
                      match: r.s[colName].map((v, i) =>
                        !i ? `${colName}: ${v}` : v,
                      ),
                    };
                  });

                if (
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  searchingRef.current &&
                  term === searchingRef.current.term &&
                  searchingRef.current.mode === "rows"
                ) {
                  // if (items.length) {
                  //   setItems((prev) => [...(prev || []), ...items]);
                  // }
                  setMatchedRows((prev) => [...(prev || []), ..._matches]);
                } else {
                  setLoading(false);
                }
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name !== "AbortError") {
              throw error;
            }
          } finally {
            setLoading(false);
            setMatchedRows((prev) => prev);
            // setItems((prev) => [...(prev || [])]);
          }
        } else console.error("Unexpected option");
      }, 600);
    },
    [
      mode,
      db,
      setLoading,
      tablesToSearch,
      tables,
      getIsMounted,
      setCurrentSearchedTable,
      matchCase,
    ],
  );

  return { searchRows, matchedRows, searchTerm };
};
