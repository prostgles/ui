import { mdiCheckBold, mdiSetCenter, mdiSetNone } from "@mdi/js";
import { includes } from "prostgles-types";
import React, { type ReactNode } from "react";
import {
  DATE_FILTER_TYPES,
  getFinalFilterInfo,
  TEXT_FILTER_TYPES,
} from "@common/filterUtils";
import { sliceText } from "@common/utils";
import { Icon } from "@components/Icon/Icon";
import type { FilterWrapperProps } from "../DetailedFilterControl/FilterWrapper";
import "./MinimisedFilter.css";

type P = FilterWrapperProps &
  Pick<FilterWrapperProps, "rootFilter"> & {
    toggle: VoidFunction;
    toggleTitle: string;
    filterTypeLabel: string | undefined;
  };

export const MinimisedFilter = ({
  filter,
  label,
  column,
  style,
  toggle,
  toggleTitle,
  hideToggle,
  className,
  filterTypeLabel,
  rootFilter,
}: P) => {
  if (!filter) return null;

  const maxLen = 26;
  const getValueForDisplay = <AsText extends boolean>(
    filterValue: unknown,
    asFullText: AsText,
  ): AsText extends true ? string : React.ReactNode => {
    if (filter.contextValue) {
      return `{{${filter.contextValue.objectName}.${filter.contextValue.objectPropertyName}}}`;
    }
    if (Array.isArray(filterValue)) {
      if (filter.type === "$between") {
        if (asFullText) {
          return [
            getValueForDisplay(filterValue[0], asFullText),
            "and",
            getValueForDisplay(filterValue[1], asFullText),
          ].join(" ");
        }
        return (
          <>
            {getValueForDisplay(filterValue[0], asFullText)}
            <span className="ws-pre text-1p5 font-normal font-14"> and </span>
            {getValueForDisplay(filterValue[1], asFullText)}
          </>
        ) as AsText extends true ? string : ReactNode;
      } else {
        if (asFullText) {
          return (
            "(\n" +
            filterValue.map((v) => JSON.stringify(v)).join(", \n") +
            "\n)"
          );
        }
        const willEllipse = filterValue.join().length > maxLen;
        if (willEllipse && filterValue.length < 5) {
          return `( ${filterValue.map((v) => JSON.stringify(sliceText(v, 10))).join(", ")} ) `;
        }

        return (
          <>
            ({" "}
            {sliceText(JSON.stringify(filterValue).slice(1, -1), maxLen, "...")}{" "}
            )
            {filterValue.length > 2 && (
              <span className="text-1p5 ml-p5" style={{ fontWeight: 600 }}>
                {" "}
                ({filterValue.length})
              </span>
            )}
          </>
        ) as AsText extends true ? string : ReactNode;
      }
    }

    if (!filterValue && includes(["$in", "$nin"], filter.type)) {
      return `( )`;
    }

    const isStringDate =
      ![...TEXT_FILTER_TYPES, ...DATE_FILTER_TYPES].some(
        ({ key }) => filter.type === key,
      ) &&
      column.udt_name === "date" &&
      typeof filterValue === "string" &&
      filterValue;
    if (
      (filterValue &&
        filterValue instanceof Date &&
        (filterValue as any).toLocaleDateString) ||
      isStringDate
    ) {
      const date = new Date(filterValue);
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

    return JSON.stringify(filterValue || "");
  };
  const { disabled, value } = filter;

  const filterValue = getValueForDisplay(filter.value, false);
  const filterValueText = getValueForDisplay(filter.value, true);

  return (
    <button
      type="button"
      className={
        "FilterWrapper_MinimisedRoot flex-row ai-center noselect pointer relative gap-p25 b w-fit max-w-full min-w-0 " +
        className
      }
      data-filter-disabled={disabled || value === undefined || undefined}
      style={{
        fontSize: "inherit",
        ...style,
        borderRadius: "1em",
        padding: window.isMobileDevice ? "2px 6px" : "4px 8px",
      }}
      title={toggleTitle}
      onClick={toggle}
    >
      {!hideToggle && (
        <Icon
          path={mdiCheckBold}
          sizeName="small"
          className={disabled ? "text-2" : "text-action"}
        />
      )}
      {rootFilter && (
        <Icon
          title={
            rootFilter.value.type === "$existsJoined" ? "exists" : "not exists"
          }
          path={
            rootFilter.value.type === "$existsJoined" ?
              mdiSetCenter
            : mdiSetNone
          }
          sizeName="small"
          className="FilterWrapper_MinimisedContent text-1"
        />
      )}
      <span className="FilterWrapper_MinimisedContent flex-row ai-center min-w-0 o-hidden">
        <span
          data-command="FilterWrapper_FieldName"
          className="FilterWrapper_FieldName font-16 font-medium mr-p25"
        >
          {label}
        </span>
        <span className="FilterWrapper_Type mr-p25 font-14">
          {filterTypeLabel}
        </span>
        {filter.type !== "not null" && filter.type !== "null" && (
          <span
            className="min-w-0 min-h-0 text-ellipsis font-16 font-normal"
            title={filterValueText}
            style={{
              maxWidth: "300px",
              whiteSpace: "nowrap",
              color:
                disabled ? "var(--text-2)"
                : column.tsDataType === "string" ? "var(--color-text)"
                : column.udt_name === "date" ? "#0000ad"
                : column.tsDataType === "number" ? "var(--color-number)"
                : "black",
            }}
          >
            {filterValue}
          </span>
        )}
      </span>
    </button>
  );
};
