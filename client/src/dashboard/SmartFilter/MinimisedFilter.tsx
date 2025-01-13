import React from "react";
import {
  getFinalFilterInfo,
  type JoinedFilter,
  TEXT_FILTER_TYPES,
} from "../../../../commonTypes/filterUtils";
import type { FilterWrapperProps } from "./FilterWrapper";
import { sliceText } from "../../../../commonTypes/utils";
import "./MinimisedFilter.css";
import { Icon } from "../../components/Icon/Icon";
import { mdiSetCenter } from "@mdi/js";

type P = FilterWrapperProps &
  Pick<FilterWrapperProps, "rootFilter"> & {
    toggle: VoidFunction;
    toggleTitle: string;
    disabledToggle: false | JSX.Element | undefined;
    filterTypeLabel: string | undefined;
  };

export const MinimisedFilter = ({
  filter,
  label,
  column,
  style,
  toggle,
  toggleTitle,
  disabledToggle,
  className,
  filterTypeLabel,
  rootFilter,
}: P) => {
  if (!filter) return null;

  const maxLen = 26;
  const getValueForDisplay = <AsText extends boolean>(
    v,
    asFullText: AsText,
  ): AsText extends true ? string : React.ReactNode => {
    if (filter.contextValue) {
      return `{{${filter.contextValue.objectName}.${filter.contextValue.objectPropertyName}}}`;
    }
    if (Array.isArray(v)) {
      if (filter.type === "$between") {
        if (asFullText) {
          return [
            getValueForDisplay(filter.value[0], asFullText),
            "AND",
            getValueForDisplay(filter.value[1], asFullText),
          ].join(" ");
        }
        return (
          <>
            {getValueForDisplay(filter.value[0], asFullText)}
            <span className="ws-pre text-1p5 font-normal font-14"> AND </span>
            {getValueForDisplay(filter.value[1], asFullText)}
          </>
        ) as any;
      } else {
        if (asFullText) {
          return "(\n" + v.map((v) => JSON.stringify(v)).join(", \n") + "\n)";
        }
        const willEllipse = v.join().length > maxLen;
        if (willEllipse && v.length < 5) {
          return `( ${v.map((v) => JSON.stringify(sliceText(v, 10))).join(", ")} ) `;
        }

        return (
          <>
            ( {sliceText(JSON.stringify(v).slice(1, -1), maxLen, "...")} )
            {v.length > 2 && (
              <div
                className="min-w-0 min-h-0 o-hidden text-1p5 ml-p5 flex-row ai-center "
                style={{ fontWeight: 600 }}
              >
                {" "}
                ({v.length})
              </div>
            )}
          </>
        ) as any;
      }
    }

    if (!v && ["$in", "$nin"].includes(filter.type as any)) {
      return `( )`;
    }

    const isStringDate =
      !TEXT_FILTER_TYPES.some(({ key }) => filter.type === key) &&
      column.udt_name === "date" &&
      typeof v === "string" &&
      v;
    if (
      (v && v instanceof Date && (v as any).toLocaleDateString) ||
      isStringDate
    ) {
      const date = new Date(v);
      if (
        column.udt_name === "date" ||
        date.toISOString().endsWith("00:00:00.000Z")
      ) {
        return date.toISOString().split("T")[0] ?? "";
      }
      return date.toLocaleDateString();
    }
    if (filter.type === "$ST_DWithin") {
      return getFinalFilterInfo(filter);
    }

    return JSON.stringify(v || "");
  };
  const { disabled, value } = filter;

  const filterValue = getValueForDisplay(filter.value, false);
  const filterValueText = getValueForDisplay(filter.value, true);

  let comparatorNode: React.ReactNode = null;
  if (filter.complexFilter) {
    comparatorNode = (
      //@ts-ignore
      <div className="p-p25">{filter.complexFilter.comparator}</div>
    );
  }
  return (
    <div
      className={
        "FilterWrapper_MinimisedRoot flex-row ai-center noselect pointer relative o-hidden " +
        className
      }
      style={{
        opacity: filter.disabled ? ".8" : 1,
        ...style,
        borderRadius: "1em",
        padding: window.isMobileDevice ? "2px 6px" : "6px 12px",
      }}
    >
      {disabledToggle}
      {rootFilter && (
        <Icon
          title={
            rootFilter.value.type === "$existsJoined" ? "Exists" : "Not exists"
          }
          path={mdiSetCenter}
          size={1}
          className="text-0"
        />
      )}
      <button
        className={disabledToggle ? "ml-p5 " : ""}
        style={{
          background: "transparent",
          opacity: value === undefined || disabled ? 0.75 : 1,
          padding: "0",
        }}
        title={toggleTitle}
        onClick={toggle}
      >
        <div
          className={"flex-row ai-center noselect pointer relative o-hidden "}
        >
          <div
            className={"FilterWrapper_FieldName  font-18 mr-p25 "}
            style={{ fontWeight: 600 }}
          >
            {label}
          </div>
          <div
            className="FilterWrapper_Type mr-p25 font-14 "
            style={{
              textTransform: "uppercase",
              height: "18px",
            }}
          >
            {filterTypeLabel}
          </div>
          {comparatorNode}
          {filter.type !== "not null" && filter.type !== "null" && (
            <>
              <div
                className="min-w-0 min-h-0 o-hidden font-16 flex-row ai-center "
                title={filterValueText}
                style={{
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                  color:
                    disabled ? "var(--text-2)"
                    : column.tsDataType === "string" ? "var(--color-text)"
                    : column.udt_name === "date" ? "#0000ad"
                    : column.tsDataType === "number" ? "var(--color-number)"
                    : "black",
                }}
              >
                {filterValue}
              </div>
            </>
          )}
        </div>
      </button>
    </div>
  );
};
