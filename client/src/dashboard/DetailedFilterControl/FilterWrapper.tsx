import type {
  DetailedFilterBase,
  DetailedJoinedFilter,
  FilterType,
} from "@common/filterUtils";
import "./FilterWrapper.css";
import {
  CORE_FILTER_TYPES,
  DATE_FILTER_TYPES,
  FTS_FILTER_TYPES,
  GEO_FILTER_TYPES,
  NUMERIC_FILTER_TYPES,
  TEXT_FILTER_TYPES,
} from "@common/filterUtils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { mdiCheckBold, mdiDelete } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { includes } from "prostgles-types";
import React from "react";
import { CONTEXT_FILTER_OPERANDS } from "../AccessControl/ContextFilter";
import RTComp from "../RTComp";
import { colIs } from "../SmartForm/SmartFormField/fieldUtils";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";
import { JOIN_FILTER_TYPES } from "../SmartFilter/AddJoinFilter";
import {
  AgeFilterTypes,
  getDefaultAgeFilter,
} from "./DetailedFilterBaseTypes/AgeFilter";
import {
  GeoFilterTypes,
  getDefaultGeoFilter,
} from "./DetailedFilterBaseTypes/GeoFilter";
import { MinimisedFilter } from "../SmartFilter/MinimisedFilter";
import {
  DEFAULT_VALIDATED_COLUMN_INFO,
  type FilterColumn,
} from "../SmartFilter/smartFilterUtils";

export type FilterWrapperProps = {
  db: DBHandlerClient;
  tableName: string;
  onChange: (filter?: DetailedFilterBase) => void;
  filter?: DetailedFilterBase;
  column: FilterColumn;
  selectedColumns: ColumnConfig[] | undefined;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  hideToggle?: boolean;
  variant?: "row";
  error?: unknown;
  children?: React.ReactNode;
  rootFilter:
    | {
        value: DetailedJoinedFilter;
        onChange: (value: DetailedJoinedFilter | undefined) => void;
      }
    | undefined;
};

type FilterWrapperState = {
  popupAnchor?: HTMLElement;
  defaultSearch?: string;
  options?: string[];
  searchTerm?: string;
  allOptionsCount?: number;
  error?: unknown;
};
export class FilterWrapper extends RTComp<
  FilterWrapperProps,
  FilterWrapperState
> {
  state: FilterWrapperState = {
    searchTerm: "",
  };

  validatedFilterStr?: string;

  render() {
    const {
      onChange,
      filter,
      column,
      children,
      className = "",
      style = {},
      label = column.name,
      hideToggle = false,
      rootFilter,
    } = this.props;
    const error = this.state.error ?? this.props.error;
    let variant: typeof this.props.variant = this.props.variant ?? "row";
    if (
      filter?.type === "$in" ||
      filter?.type === "$nin" ||
      window.isLowWidthScreen
    ) {
      variant = undefined;
    }

    const minimised = !!filter?.minimised;

    const fieldName = filter?.fieldName ?? column.name;

    const toggle = () => {
      onChange({
        ...filter,
        fieldName,
        minimised: !minimised,
      });
    };

    const rowVariant = variant === "row";

    const isSearchAll =
      column.type === "column" &&
      fieldName === "*" &&
      column.ordinal_position ===
        DEFAULT_VALIDATED_COLUMN_INFO.ordinal_position;
    const allowedTypes: {
      key: FilterType;
      label: string;
      subLabel?: string;
    }[] =
      isSearchAll ?
        CORE_FILTER_TYPES.filter((t) => t.key === "$term_highlight")
      : [
          ...CORE_FILTER_TYPES,
          ...(colIs(column, "_PG_date") ?
            [...DATE_FILTER_TYPES, ...NUMERIC_FILTER_TYPES]
          : []),
          ...(colIs(column, "_PG_postgis") ? GEO_FILTER_TYPES : []),
          ...(colIs(column, "_PG_numbers") ? NUMERIC_FILTER_TYPES : []),
          ...(colIs(column, "_PG_strings") ?
            [...TEXT_FILTER_TYPES, ...FTS_FILTER_TYPES]
          : []),
        ].filter(
          (v, i, arr) => !arr.some((_v, _i) => v.key === _v.key && i !== _i),
        );

    const btnColor = filter?.disabled ? undefined : "action";
    const disabledToggle = !hideToggle && filter && (
      <Btn
        title={(filter.disabled ? "Enable" : "Disable") + " filter"}
        iconPath={mdiCheckBold}
        className={`DisableEnableToggle ${minimised ? "round" : "rounded-l"}`}
        style={{
          ...(minimised && {
            background: "transparent",
            padding: 0,
          }),
        }}
        onClick={() => onChange({ ...filter, disabled: !filter.disabled })}
        color={btnColor}
      />
    );

    const toggleTitle = "Click to expand/collapse";
    if (minimised) {
      const filterTypeLabel =
        allowedTypes.find((t) => t.key === filter.type)?.label ?? filter.type;
      return (
        <MinimisedFilter
          {...this.props}
          label={label}
          toggle={toggle}
          toggleTitle={toggleTitle}
          filterTypeLabel={filterTypeLabel}
          disabledToggle={disabledToggle}
        />
      );
    }

    const FilterTypeSelector = (
      <Select
        className="FilterWrapper_Type"
        data-command="FilterWrapper.typeSelect"
        title="Choose filter type"
        iconPath=""
        fullOptions={allowedTypes.map((ft) => ({ ...ft }))}
        value={filter?.type || ""}
        btnProps={{
          style: { borderRadius: 0 },
          color: "default",
          variant: "default",
        }}
        onChange={(type) => {
          let newF: DetailedFilterBase = {
            ...filter,
            type: type,
            fieldName,
          };

          if (includes(AgeFilterTypes, type)) {
            newF = getDefaultAgeFilter(fieldName, type);
          }

          if (includes(GeoFilterTypes, type)) {
            newF = getDefaultGeoFilter(fieldName);
          } else if (
            colIs(column, "_PG_date") ||
            (Array.isArray(filter?.value) &&
              type !== "$between" &&
              type !== "$in" &&
              type !== "$nin") ||
            ((type === "$between" || type === "$in" || type === "$nin") &&
              !Array.isArray(filter?.value))
          ) {
            delete newF.value;
            newF.disabled = true;
          } else if (
            typeof newF.value !== "string" &&
            TEXT_FILTER_TYPES.some((t) => t.key === type)
          ) {
            newF.value = (newF.value ?? "") + "";
            newF.disabled = true;
          }

          if (
            newF.contextValue &&
            !includes(CONTEXT_FILTER_OPERANDS, newF.type)
          ) {
            delete newF.contextValue;
            newF.value ??= "";
          }

          if (type === "not null" || type === "null") {
            newF.disabled = false;
          }

          onChange(newF);
        }}
      />
    );

    const filterNeedsValue = !filter?.type?.endsWith("null");
    const filterValueContent =
      filterNeedsValue ?
        <div
          className="FilterWrapper_Children flex-col min-h-0 gap-p5"
          style={{
            minWidth: "200px",
          }}
        >
          {children}
        </div>
      : null;

    const filterContentNode =
      rowVariant && children && filterNeedsValue ? filterValueContent : null;
    const isWithoutControls = !filterContentNode;

    return (
      <FlexCol
        className={`FilterWrapper variant-${variant ?? ""} filter-bg relative gap-0 ${error ? "b-danger" : ""} ${className}`}
        data-command="FilterWrapper"
        data-key={filter?.fieldName}
        style={{
          maxWidth: rowVariant ? undefined : "400px",
          maxHeight: "50vh",
          borderColor: error ? "var(--danger)" : undefined,
          ...style,
        }}
      >
        <FlexRow
          className={`gap-0 ${
            isWithoutControls ? " "
            : rowVariant ? " ai-center"
            : " ai-start mt-p5 "
          }`}
        >
          <FlexRowWrap
            style={rowVariant ? { flex: "none" } : {}}
            className="FilterWrapper__TypeLabelContainer gap-0 f-1 font-medium noselect pointer noselect  ai-center"
          >
            <FlexRow className="FilterWrapper__LabelContainer gap-0">
              {disabledToggle}
              {rootFilter && (
                <Select
                  fullOptions={JOIN_FILTER_TYPES}
                  value={rootFilter.value.type}
                  btnProps={{
                    color: btnColor,
                    variant: "default",
                  }}
                  showIconOnly={true}
                  onChange={(type) => {
                    rootFilter.onChange({
                      ...rootFilter.value,
                      type,
                    });
                  }}
                />
              )}
              <Btn
                className={`FilterWrapper_Field ${!hideToggle || rootFilter ? "rounded-r" : ""} flex-row `}
                onClick={toggle}
                variant="default"
                title={toggleTitle}
                color={btnColor}
              >
                {label}
              </Btn>
            </FlexRow>
            {FilterTypeSelector}
          </FlexRowWrap>

          {filterContentNode}

          <Btn
            iconPath={mdiDelete}
            title="Delete filter"
            onClick={() => {
              onChange();
            }}
          />
        </FlexRow>

        {rowVariant ? null : filterValueContent}
        <ErrorComponent
          className="FilterWrapper_Error bt b-danger p-p5"
          error={error}
          findMsg={true}
        />
      </FlexCol>
    );
  }
}
