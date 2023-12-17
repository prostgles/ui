import { DBHandlerClient } from 'prostgles-client/dist/prostgles';
import React from 'react';
import RTComp from '../RTComp';
import { ValidatedColumnInfo } from "prostgles-types";
import Btn from '../../components/Btn';
import Select from '../../components/Select/Select';
import Checkbox from "../../components/Checkbox";
import { mdiCheckBold, mdiDelete } from "@mdi/js";
import ErrorComponent from "../../components/ErrorComponent";
import { 
  CORE_FILTER_TYPES, DATE_FILTER_TYPES, DetailedFilterBase, FilterType, FTS_FILTER_TYPES, 
  GEO_FILTER_TYPES, getFinalFilter, NUMERIC_FILTER_TYPES, TEXT_FILTER_TYPES 
} from '../../../../commonTypes/filterUtils'; 
import { CONTEXT_FILTER_OPERANDS } from "../AccessControl/ContextFilter";
import { MinimisedFilter } from "./MinimisedFilter";
import { colIs } from "../W_Table/ColumnMenu/ColumnSelect";
import { FlexCol, FlexRow, FlexRowWrap } from "../../components/Flex";
import { GeoFilterTypes, getDefaultGeoFilter } from "./GeoFilter";
import { AgeFilterTypes, getDefaultAgeFilter } from "./AgeFilter";

export type FilterWrapperProps = {
  db: DBHandlerClient;
  tableName: string;
  onChange: (filter?: DetailedFilterBase) => void;
  filter?: DetailedFilterBase;
  column: ValidatedColumnInfo;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  hideToggle?: boolean;
  variant?: "row";
}

type FilterWrapperState = {
  popupAnchor?: HTMLElement;
  defaultSearch?: string;
  options?: string[];
  searchTerm?: string;
  allOptionsCount?: number;
  error?: any;
}
export class FilterWrapper extends RTComp<FilterWrapperProps, FilterWrapperState> {

  state: FilterWrapperState = {
    searchTerm: "",
  }

  validatedFilterStr?: string;
  validateFilter = () => {
    const {
      filter,
      db,
      tableName,
    } = this.props;

    const tableHandler = db[tableName];
    const validatedFilterStr = JSON.stringify(filter);
    if (filter && tableHandler?.find && "fieldName" in filter && filter.value !== undefined && this.validatedFilterStr !== validatedFilterStr) {
      this.validatedFilterStr = validatedFilterStr;
      const finalFilter = getFinalFilter(filter);
      tableHandler.find(finalFilter, { limit: 0 })
        .then(() => {
          this.setState({ error: undefined })
        })
        .catch(error => {
          this.setState({ error })
        })
    }
  }

  onDelta = (dp) => {
    if (dp?.filter) {
      this.validateFilter();
    }
  }

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
    } = this.props;
    const { error } = this.state;
    let variant: typeof this.props.variant = this.props.variant ?? "row";
    if(filter?.type === "$in" || filter?.type === "$nin" || window.isLowWidthScreen){
      variant = undefined;
    }

    const minimised = !!filter?.minimised;

    const fieldName = filter?.fieldName ?? column.name;

    const toggle = () => {
      onChange({
        ...filter,
        fieldName,
        minimised: !minimised
      });
    };

    const rowVariant = variant === "row";


    const allowedTypes = [
      ...CORE_FILTER_TYPES, 
      ...(colIs(column, "_PG_date")? [ ...DATE_FILTER_TYPES, ...NUMERIC_FILTER_TYPES ] : []),
      ...(colIs(column, "_PG_postgis")? GEO_FILTER_TYPES : []),
      ...(colIs(column, "_PG_numbers")? NUMERIC_FILTER_TYPES : []),
      ...(colIs(column, "_PG_strings")? [ ...TEXT_FILTER_TYPES, ...FTS_FILTER_TYPES ] : []),
    ];

    const isSearchAll = filter?.type === '$term_highlight' && fieldName === "*";
    const allowedFilterTypes =  ((
      // colIs(column, "_PG_geometric")? GEO_FILTER_TYPES : 
      // (column.udt_name.startsWith("time") || colIs(column, "_PG_date"))? [...NUMERIC_FILTER_TYPES, ...DATE_FILTER_TYPES] : 
      // isSearchAll? [CORE_FILTER_TYPES.find(f =>  f.key === "$term_highlight")] :  
      // [...CORE_FILTER_TYPES, ...allowedTypes]
      allowedTypes
    ) as {
      key: FilterType,
      label: string;
      subLabel?: string;
    }[]).filter((v, i, arr) => !arr.some((_v, _i) => v.key === _v.key && i !== _i));

    const disabledToggleMinimised = !hideToggle && filter && <Checkbox
      title={(filter.disabled? "Enable" : "Disable") + " filter"}
      checked={!filter.disabled}
      className={`FILTERTOGGLE bg-0`}
      inputClassname={`${minimised? "" : "rounded-l bg-blue-50"}`}
      variant={minimised? "minimal" : "button"}
      onChange={e => {
        onChange({ ...filter, disabled: !e.target.checked });
      }}
    />

    const disabledToggle = minimised? disabledToggleMinimised : !hideToggle && filter &&  
      <Btn title={(filter.disabled? "Enable" : "Disable") + " filter"}
        iconPath={mdiCheckBold} 
        className="DisableEnableToggle rounded-l"
        onClick={() => 
          onChange({ ...filter, disabled: !filter.disabled })
        }
        color={filter.disabled? undefined : "action"}
        variant="faded"
      />;

    const toggleTitle = "Click to expand/collapse";
    if(minimised){
      const filterTypeLabel = allowedFilterTypes.find(t => t.key === filter.type)?.label ?? filter.type;
      return <MinimisedFilter { ...this.props } 
        label={label}
        toggle={toggle} 
        toggleTitle={toggleTitle} 
        filterTypeLabel={filterTypeLabel} 
        disabledToggle={disabledToggle} 
      />
    }

    const FilterTypeSelector = !allowedFilterTypes? null : <Select 
      className="FilterWrapper_Type"
      title="Choose filter type"
      fullOptions={allowedFilterTypes.map(ft => ({ ...ft }))}
      value={filter?.type || ""}
      onChange={(type) => {
        let newF: DetailedFilterBase = {
          ...filter,
          type: type as FilterType,
          fieldName,
        };

        if(AgeFilterTypes.includes(type as any)){
          newF = getDefaultAgeFilter(fieldName, type as any);
        }

        if(GeoFilterTypes.includes(type as any)){
          newF = getDefaultGeoFilter(fieldName);
        
        } else if (
          colIs(column, "_PG_date") ||
          Array.isArray(filter?.value) && type !== "$between" && type !== "$in" && type !== "$nin" ||
          (type === "$between" || type === "$in" || type === "$nin") && !Array.isArray(filter?.value)
        ) {
          delete newF.value;
          newF.disabled = true;
        } else if (typeof newF.value !== "string" && TEXT_FILTER_TYPES.some(t => t.key === type)) {
          newF.value = (newF.value ?? "") + ""
          newF.disabled = true;
        }

        if(newF.contextValue && !CONTEXT_FILTER_OPERANDS.includes(newF.type as any)){
          delete newF.contextValue;
          newF.value ??= "";
        }

        if(type === "not null" || type === "null"){
          newF.disabled = false;
        }

        onChange(newF);
      }}
    />;

    const filterHasValue = filter?.value !== undefined || !!filter?.contextValue;
    const filterNeedsValue = !filter?.type?.endsWith("null");
    const filterValueContent = filterNeedsValue? 
      <div 
        className="FilterWrapper_Children flex-col min-h-0 gap-p5" 
        style={{ 
          minWidth: "200px",
        }}
      >
        {children}
      </div> 
      : null;

    const filterContentNode = (rowVariant && children && filterNeedsValue)? filterValueContent : null;
    const isWithoutControls = !filterContentNode;

    return <FlexCol className={"FilterWrapper p-p5 bg-0 relative gap-p5 " + className}
      data-command="FilterWrapper"
      style={{
        maxWidth: rowVariant? undefined : "400px",
        maxHeight: "50vh",
        opacity: filter?.disabled? ".8" : "1",
        ...style, 
      }}>
        <FlexRow className={"gap-p5 " + (isWithoutControls? "p-pp5" : rowVariant? " ai-center pl-pp5 " : " ai-start mx-pp5 mt-p5 ")}>
          <FlexRowWrap 
            title={toggleTitle} 
            style={rowVariant? { flex: "none" } : {}}
            className="gap-p5 f-1 font-medium noselect pointer noselect  ai-center"
          >
            <FlexRow style={{ gap: 0 }}>              
              {disabledToggle}
              <Btn className={`FilterWrapper_Field ${!hideToggle? "rounded-r" : ""} flex-row `}
                onClick={toggle}
                variant="faded"
                style={{ 
                  color: (filterHasValue || !filterNeedsValue) ? "var(--blue-800)" : "var(--gray-400)",
                  fontSize: "18px",
                }}
                color={filter?.disabled? undefined : "action"}
              >
                {label}
              </Btn>
              
            </FlexRow>
            {FilterTypeSelector}
          </FlexRowWrap>

          {filterContentNode}

          <Btn iconPath={mdiDelete}
            title="Delete filter" 
            onClick={() => {
              onChange()
            }}
          />
        </FlexRow>

      {rowVariant? null : filterValueContent}
      <ErrorComponent error={error} />
    </FlexCol>
  }
}
