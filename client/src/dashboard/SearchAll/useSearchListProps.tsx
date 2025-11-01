import { isObject } from "@common/publishUtils";
import { Icon } from "@components/Icon/Icon";
import type { SearchListProps } from "@components/SearchList/SearchList";
import { SvgIcon } from "@components/SvgIcon";
import {
  mdiChatQuestion,
  mdiFunction,
  mdiScriptTextPlay,
  mdiTable,
} from "@mdi/js";
import React from "react";
import type { ChartOptions } from "../Dashboard/dashboardUtils";
import type { SearchAllProps } from "./SearchAll";
import type { SearchAllState } from "./useSearchAllState";
import type { MethodFullDef } from "prostgles-types";
import type { useSearchAllRows } from "./useSearchAllRows";

export const useSearchAllListProps = ({
  mode,
  setMode,
  typesToSearch,
  tablesToSearch,
  tablesAndViews,
  queries,
  ...props
}: SearchAllState & SearchAllProps & ReturnType<typeof useSearchAllRows>) => {
  const placeholder = "Search...";

  let items: SearchListProps["items"],
    dontHighlight = false,
    onSearch: SearchListProps["onSearch"] = undefined;

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
            props.onClose();
            props.onOpenDBObject(suggestion);
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
            props.onClose();
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
        : Object.entries(props.methods as Record<string, MethodFullDef>)
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
                props.onClose();
                props.onOpenDBObject(undefined, methodKey);
              },
            })),
      );
  } else {
    onSearch = props.searchRows;
    dontHighlight = true;
    items = props.items;
  }

  return { items, onSearch, dontHighlight, placeholder };
};
