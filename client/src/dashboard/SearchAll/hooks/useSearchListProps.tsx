import type { DetailedFilter } from "@common/filterUtils";
import { Icon } from "@components/Icon/Icon";
import type {
  SearchListItem,
  SearchListProps,
  SvgIconName,
} from "@components/SearchList/SearchList";
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
import { SearchMatchRow } from "../SearchMatchRow";
import type { SearchAllState } from "./useSearchAllState";
import type { useSearchTables } from "./useSearchTables";
import type { F } from "react-router/dist/development/routeModules-CA7kSxJJ";

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
    items = (typesToSearch.includes("tables") ? tablesAndViews : [])
      .map((suggestion) => {
        const { name, type, subLabel, icon } = suggestion;
        return {
          key: name,
          label: name,
          subLabel,
          iconLeft: {
            type: "SvgIcon",
            pathName:
              (icon as SvgIconName | undefined) ??
              (type === "table" ? "Table"
              : type === "function" ? "Function"
              : "ChatQuestion"),
          },
          onPress: (e, term) => {
            onClose();
            onOpenDBObject(suggestion);
          },
        } satisfies SearchListItem;
      })
      .concat(
        (typesToSearch.includes("queries") ? (queries ?? []) : []).map((q) => ({
          key: q.id,
          label: q.name,
          subLabel: q.sql || "", // sliceText(q.sql || "", 200) ,
          iconLeft: {
            type: "SvgIcon",
            pathName: "ScriptTextPlay",
          },
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

              extra = { options: { ...q.options, cursorPosition } };
            }
            q.$update?.({ closed: false, ...extra }, { deepMerge: true });
          },
        })),
      )
      .concat(
        !typesToSearch.includes("actions") ?
          []
        : Object.entries(methods).map(([methodKey, method]) => ({
            key: methodKey,
            label: methodKey,
            subLabel: Object.keys(method.input ?? {}).join(", "),
            iconLeft: {
              type: "SvgIcon",
              pathName: "Function",
            },
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
        key: `${m.$rowhash + i}`,
        label: m.table,
        styles: {
          rowInner: {
            gap: ".25em",
          },
        },
        iconLeft: {
          type: "SvgIcon",
          pathName:
            icon ? (icon as SvgIconName)
            : db[m.table]?.insert ? "TableEdit"
            : "Table",
        },
        title: "Open table",
        contentBottom: (
          <div className="f-1 flex-row ai-start">
            {/* <div className="flex-col ai-start f-0 text-1 ">
              {icon ?
                <SvgIcon icon={icon} />
              : <Icon path={db[m.table]?.insert ? mdiTableEdit : mdiTable} />}
            </div> */}
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
          const filter: DetailedFilter[] = [];
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
