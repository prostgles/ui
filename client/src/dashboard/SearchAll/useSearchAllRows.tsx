import type { SimpleFilter } from "@common/filterUtils";
import { Icon } from "@components/Icon/Icon";
import type { SearchListItem } from "@components/SearchList/SearchList";
import { SvgIcon } from "@components/SvgIcon";
import { mdiTable, mdiTableEdit } from "@mdi/js";
import React, { useCallback } from "react";
import { useIsMounted } from "../BackupAndRestore/CredentialSelector";
import type { SearchAllProps } from "./SearchAll";
import { SearchMatchRow } from "./SearchMatchRow";
import type { SearchAllState } from "./useSearchAllState";

export const useSearchAllRows = (props: SearchAllProps & SearchAllState) => {
  const {
    db,
    mode,
    onOpen,
    onClose,
    tables,
    setLoading,
    tablesToSearch,
    matchCase,
    setCurrentSearchedTable,
    setItems,
  } = props;

  const searchingRef = React.useRef<{
    timeout: ReturnType<typeof setTimeout> | null;
    term: string;
    mode: "views and queries" | "rows";
    abortController: AbortController | null;
  }>();
  const getIsMounted = useIsMounted();
  const searchRows = useCallback(
    (searchTerm = "") => {
      searchingRef.current = searchingRef.current || {
        term: searchTerm,
        mode,
        timeout: null,
        abortController: null,
      };
      searchingRef.current.term = searchTerm;
      searchingRef.current.mode = mode;

      if (searchingRef.current.abortController) {
        searchingRef.current.abortController.abort();
      }
      if (searchingRef.current.timeout) {
        clearTimeout(searchingRef.current.timeout);
      }

      searchingRef.current.timeout = setTimeout(async () => {
        const term = searchingRef.current?.term ?? searchTerm;
        const abortController = new AbortController();
        if (searchingRef.current) {
          searchingRef.current.abortController = abortController;
        }

        if (mode === "rows" && db.sql) {
          setLoading(true);

          // let matches = [];
          setItems(undefined);

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
                  const tableHash = new Map(tables.map((t) => [t.name, t]));
                  const items: SearchListItem[] = _matches.map((m, i) => {
                    const icon = tableHash.get(m.table)?.icon;
                    return {
                      ...m,
                      key: m.$rowhash + i,
                      label: m.table,
                      content: (
                        <div
                          className="f-1 flex-row ai-start"
                          title="Open table"
                        >
                          <div className="flex-col ai-start f-0 mr-p5 text-1">
                            {icon ?
                              <SvgIcon icon={icon} />
                            : <Icon
                                path={
                                  db[m.table]?.insert ? mdiTableEdit : mdiTable
                                }
                              />
                            }
                          </div>
                          <div className="flex-col ai-start f-1">
                            <div className="font-18">{m.table}</div>
                            <div
                              style={{
                                fontSize: "16px",
                                opacity: 0.7,
                                textAlign: "left",
                                width: "100%",
                                marginTop: ".25em",
                              }}
                              // className={!mode ? "text-2" : ""}
                            >
                              <SearchMatchRow key={i} matchRow={m.match} />
                            </div>
                          </div>
                        </div>
                      ),
                      onPress: () => {
                        const filter: SimpleFilter[] = [];
                        if (m.colName) {
                          filter.push({
                            fieldName: m.colName,
                            type: "$term_highlight",
                            value: term,
                          });
                        }
                        onOpen({
                          table: m.table,
                          filter,
                        });
                        onClose();
                      },
                    };
                  });
                  if (items.length) {
                    setItems((prev) => [...(prev || []), ...items]);
                  }
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
            setItems((prev) => [...(prev || [])]);
            searchingRef.current = undefined;
          }
        } else console.error("Unexpected option");
      }, 600);
    },
    [
      db,
      getIsMounted,
      matchCase,
      mode,
      setCurrentSearchedTable,
      setItems,
      setLoading,
      tables,
      tablesToSearch,
      onOpen,
      onClose,
    ],
  );

  return { searchRows };
};
