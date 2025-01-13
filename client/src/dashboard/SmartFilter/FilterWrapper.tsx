import { mdiCheckBold, mdiDelete } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import type {
  DetailedFilterBase,
  FilterType,
  JoinedFilter,
} from "../../../../commonTypes/filterUtils";
import {
  CORE_FILTER_TYPES,
  DATE_FILTER_TYPES,
  FTS_FILTER_TYPES,
  GEO_FILTER_TYPES,
  NUMERIC_FILTER_TYPES,
  TEXT_FILTER_TYPES,
  getFinalFilter,
} from "../../../../commonTypes/filterUtils";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRow, FlexRowWrap } from "../../components/Flex";
import Select from "../../components/Select/Select";
import { CONTEXT_FILTER_OPERANDS } from "../AccessControl/ContextFilter";
import RTComp from "../RTComp";
import { colIs } from "../W_Table/ColumnMenu/ColumnSelect";
import { JOIN_FILTER_TYPES } from "./AddJoinFilter";
import { AgeFilterTypes, getDefaultAgeFilter } from "./AgeFilter";
import { GeoFilterTypes, getDefaultGeoFilter } from "./GeoFilter";
import { MinimisedFilter } from "./MinimisedFilter";
import {
  DEFAULT_VALIDATED_COLUMN_INFO,
  type FilterColumn,
} from "./smartFilterUtils";
import "./FilterWrapper.css";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";

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
  error?: any;
  children?: React.ReactNode;
  rootFilter:
    | {
        value: JoinedFilter;
        onChange: (value: JoinedFilter | undefined) => void;
      }
    | undefined;
};

type FilterWrapperState = {
  popupAnchor?: HTMLElement;
  defaultSearch?: string;
  options?: string[];
  searchTerm?: string;
  allOptionsCount?: number;
  error?: any;
};
export class FilterWrapper extends RTComp<
  FilterWrapperProps,
  FilterWrapperState
> {
  state: FilterWrapperState = {
    searchTerm: "",
  };

  validatedFilterStr?: string;
  // validateFilter = () => {
  //   const {
  //     filter,
  //     db,
  //     tableName,
  //   } = this.props;

  //   const tableHandler = db[tableName];
  //   const validatedFilterStr = JSON.stringify(filter);
  //   if (filter && tableHandler?.find && "fieldName" in filter && filter.value !== undefined && this.validatedFilterStr !== validatedFilterStr) {
  //     this.validatedFilterStr = validatedFilterStr;
  //     const finalFilter = getFinalFilter(filter);
  //     tableHandler.find(finalFilter, { limit: 0 })
  //       .then(() => {
  //         this.setState({ error: undefined })
  //       })
  //       .catch(error => {
  //         this.setState({ error })
  //       })
  //   }
  // }

  // onDelta = (dp) => {
  //   if (dp?.filter) {
  //     // this.validateFilter();
  //   }
  // }

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
            type: type as FilterType,
            fieldName,
          };

          if (AgeFilterTypes.includes(type as any)) {
            newF = getDefaultAgeFilter(fieldName, type as any);
          }

          if (GeoFilterTypes.includes(type as any)) {
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
            !CONTEXT_FILTER_OPERANDS.includes(newF.type as any)
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

    const filterHasValue =
      filter?.value !== undefined || !!filter?.contextValue;
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
            className="FilterWrapper__TypeLabelContainer gap-dp5 f-1 font-medium noselect pointer noselect  ai-center"
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
                // style={{
                //   color: (filterHasValue || !filterNeedsValue) ? "var(--blue-800)" : "var(--gray-400)",
                //   fontSize: "18px",
                // }}
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
