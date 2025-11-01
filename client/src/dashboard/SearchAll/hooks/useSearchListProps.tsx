import { isObject } from "@common/publishUtils";
import { Icon } from "@components/Icon/Icon";
import type { SearchListProps } from "@components/SearchList/SearchList";
import { SvgIcon } from "@components/SvgIcon";
import {
  mdiChatQuestion,
  mdiFunction,
  mdiScriptTextPlay,
  mdiTable,
  mdiTableEdit,
} from "@mdi/js";
import React, { useMemo } from "react";
import type { ChartOptions } from "../../Dashboard/dashboardUtils";
import type { SearchAllProps } from "../SearchAll";
import type { SearchAllState } from "./useSearchAllState";
import type { MethodFullDef } from "prostgles-types";
import type { useSearchTables } from "./useSearchTables";
import { SearchMatchRow } from "../SearchMatchRow";
import type { SimpleFilter } from "@common/filterUtils";

export const useSearchAllListProps = ({
  mode,
  searchRows,
  typesToSearch,
  methods,
  tablesAndViews,
  queries,
  tables,
  db,
  onOpen,
  onClose,
  onOpenDBObject,
  matchedRows,
  searchTerm,
}: SearchAllState & SearchAllProps & ReturnType<typeof useSearchTables>) => {
  const placeholder = "Search...";

  let items: SearchListProps["items"],
    dontHighlight = false,
    onSearch: SearchListProps["onSearch"] = undefined;

  const tableHash = useMemo(
    () => new Map(tables.map((t) => [t.name, t])),
    [tables],
  );

  if (mode === "views and queries") {
    /** Prioritise public schema */
    items = tablesAndViews
      .filter((s) => s.type === "table" && typesToSearch.includes("tables"))
      .map((suggestion) => {
        const { name, type, subLabel, icon } = suggestion;
        return {
          key: name,
          label: name,
          subLabel,
          contentLeft: (
            <div className="f-0">
              {icon ?
                <SvgIcon icon={icon} className="text-1p5 p-p25" />
              : <Icon
                  className="text-1p5 p-p25"
                  path={
                    type === "table" ? mdiTable
                    : type === "function" ?
                      mdiFunction
                    : mdiChatQuestion
                  }
                />
              }
            </div>
          ),
          onPress: (e, term) => {
            onClose();
            onOpenDBObject(suggestion);
          },
        };
      })
      .concat(
        (typesToSearch.includes("queries") ? (queries ?? []) : []).map((q) => ({
          key: q.id,
          label: q.name,
          subLabel: q.sql || "", // sliceText(q.sql || "", 200) ,
          contentLeft: (
            <div className="f-0">
              <Icon className="text-1p5 p-p25" path={mdiScriptTextPlay} />
            </div>
          ),
          onPress: (e, term) => {
            onClose();
            let extra = {};
            if (
              q.sql &&
              term &&
              q.sql.toLowerCase().includes(term.toLowerCase())
            ) {
              const lines = q.sql.split("\n").map((l) => l.toLowerCase());
              const lineNumber = lines.findIndex((s) =>
                s.includes(term.toLowerCase()),
              );
              const cursorPosition: ChartOptions<"sql">["cursorPosition"] = {
                column: lines[lineNumber]!.indexOf(term.toLowerCase()) + 1,
                lineNumber: lineNumber + 1,
              };

              extra = { options: { ...(q.options || {}), cursorPosition } };
            }
            q.$update?.({ closed: false, ...extra }, { deepMerge: true });
          },
        })),
      )
      .concat(
        !typesToSearch.includes("actions") ?
          []
        : Object.entries(methods as Record<string, MethodFullDef>)
            .filter(([k, v]) => isObject(v) && (v as any).run)
            .map(([methodKey, method]) => ({
              key: methodKey,
              label: methodKey,
              subLabel: Object.keys(method.input).join(", "),
              contentLeft: (
                <div className="f-0">
                  <Icon className="text-1p5 p-p25" path={mdiFunction} />
                </div>
              ),
              onPress: (e, term) => {
                onClose();
                onOpenDBObject(undefined, methodKey);
              },
            })),
      );
  } else {
    onSearch = searchRows;
    dontHighlight = true;
    items = matchedRows?.map((m, i) => {
      const icon = tableHash.get(m.table)?.icon;
      return {
        ...m,
        key: m.$rowhash + i,
        label: m.table,
        content: (
          <div className="f-1 flex-row ai-start" title="Open table">
            <div className="flex-col ai-start f-0 mr-p5 text-1">
              {icon ?
                <SvgIcon icon={icon} />
              : <Icon path={db[m.table]?.insert ? mdiTableEdit : mdiTable} />}
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
              value: searchTerm,
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
  }

  return { items, onSearch, dontHighlight, placeholder };
};
