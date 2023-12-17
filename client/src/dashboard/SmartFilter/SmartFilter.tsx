import { DBHandlerClient, TableHandlerClient } from "prostgles-client/dist/prostgles";
import { AnyObject, ValidatedColumnInfo, pickKeys } from "prostgles-types";
import React from 'react';
import { DetailedFilterBase, JoinedFilter, SimpleFilter, SmartGroupFilter, getFinalFilter, isDetailedFilter, isJoinedFilter } from '../../../../commonTypes/filterUtils';
import Btn from '../../components/Btn';
import { FlexRow, classOverride } from '../../components/Flex';
import { SearchListProps } from '../../components/SearchList';
import { isDefined } from '../../utils';
import { ContextDataSchema } from "../AccessControl/OptionControllers/FilterControl";
import { CommonWindowProps } from '../Dashboard/Dashboard';
import RTComp from '../RTComp';
import { ColumnConfigWInfo } from '../W_Table/W_Table';
import { simplifyFilter } from "../W_Table/tableUtils/tableUtils";
import { Filter } from "./Filter";
import { FilterWrapperProps } from "./FilterWrapper";
import SmartAddFilter from "./SmartAddFilter";

// const isCategorical = (col: ValidatedColumnInfo, f: SimpleFilter) => Boolean(
//   ["$ilike", "$like", "$term_highlight"].includes(f?.type!) || 
//   col?.references?.length || 
//   col?.is_pkey || 
//   !["number", "Date"].includes(col?.tsDataType)
// );

export const testFilter = (f: SimpleFilter, tableHandler: TableHandlerClient, cb: (err: any, ok?: true) => any) => {
  return tableHandler.findOne(getFinalFilter(f)).then(() => cb(undefined, true)).catch(err => cb(err))
}



export const getSmartGroupFilter = (detailedFilter: SmartGroupFilter = [], extraFilters?: { detailed?: SmartGroupFilter; filters?: AnyObject[] }, operand?: "and" | "or"): AnyObject => {
  let input = detailedFilter;
  if(extraFilters?.detailed){
    input = [
      ...detailedFilter,
      ...extraFilters.detailed
    ];
  }
  let output = input.map(f => getFinalFilter(f));
  if(extraFilters?.filters){
    output = output.concat(extraFilters.filters);
  }
  const result = simplifyFilter({ 
    [`$${operand || "and"}`]: output.filter(isDefined) 
  });

  return result ?? {};
}
type Operand = "AND" | "OR";
export type SmartFilterProps = Pick<FilterWrapperProps, "variant"> & {
  db: DBHandlerClient;
  tableName: string;
  tables: CommonWindowProps["tables"];
  // columns: ValidatedColumnInfo[];
  onChange: (filter: SmartGroupFilter) => void;
  detailedFilter?: SmartGroupFilter;
  operand?: Operand;
  onOperandChange?: (operand: Operand) => any;
  className?: string;
  style?: React.CSSProperties;
  filterClassName?: string;
  filterStyle?: React.CSSProperties;
  contextData?: ContextDataSchema;
  hideToggle?: boolean;
  minimised?: boolean;
  showAddFilter?: boolean;
};

type SmartFilterState = {
  popupAnchor?: HTMLElement;
  defaultSearch?: string;
  searchTerm?: string;
  options?: string[];
  addFilter?: {
    fieldName?: string;
    type?: SimpleFilter["type"];
    path?: string[]
  };
  searchItems?: SearchListProps["items"];
}

export default class SmartFilter extends RTComp<SmartFilterProps, SmartFilterState> {
  state: SmartFilterState = {
    searchTerm: "",
  }

  /** undefined value means filter is disabled (gray col name text) */
  static getDefaultFilter = async (col: ColumnConfigWInfo ): Promise<SimpleFilter> => {
    const isNumeric = ["number", "Date"].includes(col.info?.tsDataType || col.computedConfig?.funcDef.tsDataTypeCol as any);
    const nf: SimpleFilter = { 
      fieldName: col.name,
      type: isNumeric?  "$between" : "$in",
    }

    return nf;
  }

  onChange: SmartFilterProps["onChange"] = async (filter) => {
    
    /**
     * Ensure invalid filters are disabled
     */
    this.props.onChange(await Promise.all(filter.map(async f => {
      try {

        const finalFilter = getSmartGroupFilter([f]);
        await this.props.db[this.props.tableName]?.find?.(finalFilter, { limit: 0 })
        return {
          ...f,
          // disabled: false
        };
      } catch(e){
        console.warn(e);
        return {
          ...f,
          disabled: true
        }
      }
    })));
  }

  render(){

    const { 
      db,
      tableName,
      detailedFilter = [],
      className = "",
      style = {},
      tables,
      operand = "AND",
      onOperandChange,
      contextData,
      hideToggle,
      variant,
      showAddFilter = false,
    } = this.props;
    const onChange = this.onChange;
    
    const columns = tables.find(t => t.name === tableName)?.columns;

    const wrapperClassName = classOverride(
      // `SmartFilter min-w-0 min-h-0 gap-p5 ${(variant === "row" && !window.isLowWidthScreen)? "flex-col ai-start" : "flex-row-wrap ai-center"}`, 
      `SmartFilter min-w-0 min-h-0 gap-p5 flex-row-wrap ai-center`, 
      className
    );
    const Filters = (!columns?.length? null : 
      <div  key={"o" }  
        style={{ 
          zIndex: 1,// Needed to dropdown is above table 
          ...style
        }}
        className={wrapperClassName} 
      >
        {detailedFilter.map((df, di)=> {
          
          let col: ValidatedColumnInfo | undefined, fieldName, label, tName = tableName;
          if(isJoinedFilter(df)){
            ({ fieldName } = df.filter);
            const lastTable = df.path[df.path.length  -1];
            if(!lastTable) return <>Filter path {lastTable} missing</>
            tName = lastTable;
            col = tables.find(t => t.name === lastTable)?.columns.find(c => c.name === fieldName);
            label = df.path.join(" > ") + "." + fieldName;
          } else {
            ({ fieldName } = df);
            col = columns.find(c => c.name === fieldName);
          }

          /**
           * Maybe add computed columns to dbo schema?!!
           */
          if(!col){
            col = { 
              ...DEFAULT_VALIDATED_COLUMN_INFO,
              name: fieldName,
              label: fieldName,
            };
          }
          const otherFilters: (SimpleFilter | JoinedFilter | DetailedFilterBase)[] = this.props.detailedFilter?.filter((f, i)=> i !== di) ?? [];
          const props = {
            className: `${this.props.filterClassName ?? ""} min-w-0 min-h-0`,
            style: this.props.filterStyle,
            key: di + fieldName,
            db,
            label,
            tableName: tName,
            column: col,
            variant,
            tables,
            contextData,
            hideToggle,
            filter: isJoinedFilter(df)? df.filter : df,
            otherFilters: isJoinedFilter(df)? otherFilters.filter(isDetailedFilter)
              .map((f: DetailedFilterBase)=> {
                const res: JoinedFilter = {
                  type: df.type,
                  path: [...df.path.slice(0).reverse().slice(1), this.props.tableName],
                  filter: f
                }
                return res;
              }) : 
              otherFilters,
            onChange: (f: typeof df | undefined)=> { 
              let newDF = [ ...detailedFilter ];
              if(f){
                if(isJoinedFilter(df)){
                  if(isJoinedFilter(f)) throw "Not possible";

                  (newDF[di] as JoinedFilter).filter = { ...f };
                  (newDF[di] as JoinedFilter).disabled = f.disabled;
                  (newDF[di] as JoinedFilter).minimised = f.minimised;

                } else {
                  newDF[di] = { ...f }
                }
              } else {
                newDF = newDF.filter((_, i) => i !== di)
              }

              onChange(newDF);
            }
          }
          const fNode = <Filter {...props} filter={{ ...props.filter, minimised: this.props.minimised ?? props.filter.minimised }} tables={tables} />

          if(detailedFilter.length > 1 && di < detailedFilter.length - 1){
          
            return <React.Fragment key={"o" + di}>
              {fNode}
              <Btn className="OPERAND text-active hover"
                title={onOperandChange? "Press to toggle" : "Operand"}
                onClick={!onOperandChange? undefined : () => {
                  onOperandChange(operand === "AND"? "OR" : "AND")
                }}
              >
                {operand}
              </Btn>
            </React.Fragment>
          }

          return fNode;
        })}
        {showAddFilter && 
          <FlexRow className="w-full mt-1">
            <SmartAddFilter 
              {...pickKeys(this.props, ["db", "tableName", "tables"])}
              defaultType="="
              style={{ 
                boxShadow: "unset"
              }}
              className=" text-active"
              variant="full"
              onChange={newF => {
                onChange([ ...detailedFilter, ...newF ]);
              }}
              btnProps={{
                variant: "faded",
              }}
            /> 
          </FlexRow>
        }
    </div>);

    return Filters
  }
}


export type BaseFilterProps = Pick<FilterWrapperProps, "variant"> & {
  db: DBHandlerClient;
  tableName: string;
  onChange: (filter?: SimpleFilter) => void;
  tables: CommonWindowProps["tables"];
  column: ValidatedColumnInfo;// Pick<ValidatedColumnInfo, "name" | "references" | "is_nullable" | "label">;
  otherFilters: SmartGroupFilter;
  error?: any;
  filter?: DetailedFilterBase;
  className?: string;
  style?: React.CSSProperties;
  contextData?: ContextDataSchema;
}



export function sliceText(v: string | undefined, maxLen: number, ellipseText = "...", midEllipse = false){
  if(isDefined(v) && v.length > maxLen){ 
    if(!midEllipse) return `${v.slice(0, maxLen)}${ellipseText}`;
    return `${v.slice(0, maxLen/2)}${ellipseText}${v.slice(v.length - (maxLen/2) + 3)}`;
  }

  return v;
}


export type JoinTree = {
  table: string;
  on: [string, string][];
  joins?: JoinTree[];
}
export const getJoinTree = (args: {
  // label: string; 
  tableName: string; 
  excludeTables?: string[]; 
  tables: CommonWindowProps["tables"];
}): JoinTree[] => {

  const { tables, tableName, excludeTables = [] } = args;
  const table = tables.find(t => t.name === tableName);
  if(!table) throw "Table info not found";
  const res: JoinTree[] = [];

  /** This is to ensure no duplicates are added in cases where groups of columns are referenced (c.references?.fcols.length > 1) */
  const addJT = (jt: JoinTree) => {
    if(
      !excludeTables.includes(jt.table) && 
      !res.find(r => r.table === jt.table && JSON.stringify(r.on) === JSON.stringify(jt.on) )
    ){
      res.push(jt)
    }
  }

  table.columns.forEach(c => {
    c.references?.forEach(r => {
      const jt: JoinTree = {
        table: r.ftable,
        on: r.cols.map((col, i) => [col!, r!.fcols[i]!])
      };
      addJT(jt);

    });
  });

  tables.forEach(t => {
    if(t.name !== tableName){
      t.columns.forEach(c => {
        c.references?.forEach(r => {
          if(r.ftable === tableName){
            const jt: JoinTree = {
              table: t.name,
              on: r.fcols.map((fcol, i) => [fcol!, r.cols[i]!])
            }
            addJT(jt);
          }
        });
      });
    }
  });

  let result = res.map(r => ({
    ...r,
    joins: getJoinTree({
      // label: "",
      tableName: r.table, 
      tables, 

      /** Need to only exclude tables from the current join path */
      // excludeTables: [ tableName, ...excludeTables, ...res.map(r => r.table) ] 
      excludeTables: [ tableName, ...excludeTables, r.table ] 
    })
  }));

  result = result.map(r => ({
    ...r,
    // label: 
  }))

  return result;
}

const DEFAULT_VALIDATED_COLUMN_INFO = {
  comment: "",
  data_type: "text",
  delete: false,
  element_type: "",
  element_udt_name: "",
  filter: true,
  has_default: false,
  insert: false,
  udt_name: "text",
  is_nullable: true,
  is_pkey: false,
  ordinal_position: -1,
  select: true,
  orderBy: true,
  tsDataType: "string",
  update: true,
  is_updatable: true,
} as const;

type ColumnStyle = { 
  chipColor?: "string"; 
  chipBorderColor?: "string"; 
  textColor?: "string"; 
  cellColor?: "string";
}
type BarchartColumnStyle = { 
  textColor: "string"; 
  cellColor: "string";
}

type ColStyleDef = {
  "string": 
    | "default" 
    | "base64image" 
    | "html" 
    | { content_type_field: string; allowed_content_types?: string[] }
    | ColumnStyle;
  "number": 
    | "default" 
    | BarchartColumnStyle
    | ColumnStyle;
  "Date":
    | "default" 
    | BarchartColumnStyle
    | ColumnStyle;
}
