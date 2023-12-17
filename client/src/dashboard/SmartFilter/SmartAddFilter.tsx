import { mdiFilterPlus, mdiSetCenter } from "@mdi/js";
import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { ValidatedColumnInfo } from "prostgles-types";
import React from 'react';
import { FilterType, JoinedFilter, SimpleFilter, SmartGroupFilter } from '../../../../commonTypes/filterUtils';
import Btn, { BtnProps } from '../../components/Btn';
import Popup from '../../components/Popup/Popup';
import SearchList, { SearchListProps } from '../../components/SearchList';
import Select from "../../components/Select/Select";
import { CommonWindowProps } from '../Dashboard/Dashboard';
import RTComp from '../RTComp';
import { getColumnDataColor } from "../SmartForm/SmartFormField/SmartFormField";
import JoinPathSelector from '../W_Table/JoinPathSelector';
import { getFilterableCols } from "./SmartSearch";

export type SmartAddFilterProps = {
  db: DBHandlerClient;
  tableName: string;
  tables: CommonWindowProps["tables"];
  // columns: ValidatedColumnInfo[];
  onChange?: (filter: SmartGroupFilter) => void;
  detailedFilter?: SmartGroupFilter;
  className?: string;
  style?: React.CSSProperties;
  filterFields?: string[];
  variant?: "full";
  defaultType?: FilterType;
  btnProps?: BtnProps;
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
  existsFilterType: JoinedFilter["type"];
  searchItems?: SearchListProps["items"];
}

export default class SmartAddFilter extends RTComp<SmartAddFilterProps, SmartFilterState> {

  state: SmartFilterState = {
    searchTerm: "",
    existsFilterType: "$existsJoined"
  }

  render(){
    const { addFilter, existsFilterType, popupAnchor } = this.state;
    const {
      tableName,
      onChange, 
      detailedFilter: df,
      className = "",
      style = {},
      tables,
      filterFields,
      defaultType,
      btnProps,
    } = this.props;
    const detailedFilter = df || [];

    const columns = getFilterableCols(tables.find(t => t.name === tableName)?.columns ?? []).filter(c => !filterFields || filterFields.includes(c.name));
    const isCategorical = (col: ValidatedColumnInfo) => Boolean(col.references?.length || !["number", "Date"].includes(col.tsDataType));

    const hasJoins = JoinPathSelector.hasJoins(tableName, tables);

    let lastTable;
    if(addFilter?.path?.length){
      lastTable = addFilter.path[addFilter.path.length-1]
    }
    const newFilterCols = (addFilter?.path?  (addFilter.path.length? tables.find(t => t.name === lastTable)?.columns : []) : columns) ?? [];

    const joinableTables = tables.filter(t => getFilterableCols(t.columns).length)

    if(!columns.length && !joinableTables.length){
      return null;
    }

    let popup;
    if(addFilter){
      popup = <Popup 
          positioning="beneath-left"
          clickCatchStyle={{ opacity: 0 }}
          anchorEl={popupAnchor}
          onClose={() => {
            this.setState({
              addFilter: undefined
            })
          }}
          contentStyle={{ padding: 0 }}
        >
          {!hasJoins? null : 
          <Btn title={(addFilter.path? "Disable" : "Enable") + " Join filter"}
            className="w-full"
            style={{ width: "100%" }}
            iconPath={mdiSetCenter}
            color={addFilter.path? "action" : undefined}
            onClick={() => {
              this.setState({
                addFilter: { 
                  ...addFilter, 
                  path: addFilter.path? undefined : []
                }
              })
            }}
          >
            {(addFilter.path? "Disable" : "Enable") + " Join filter"}
          </Btn>}
          {addFilter.path && <Select
            className="my-p5 m-auto"
            title="Filter type"
            fullOptions={[
              { key: "$existsJoined", label: "Exists"}, 
              { key: "$notExistsJoined",  label: "Not Exists"}
            ]} 
            value={existsFilterType} 
            onChange={existsFilterType => {
              this.setState({ existsFilterType })
            }} 
          />}
          <div 
            className={"min-s-0 " + 
              (window.isMobileDevice? " flex-col " : " flex-row " ) + 
              "  bt b-gray-200"
            } 
            style={{ maxHeight: "90vh"}}
          >
            {!!hasJoins && !!addFilter.path && <div className="flex-col f-1 o-auto br b-gray-200">
              <JoinPathSelector 
                tables={joinableTables} 
                tableName={tableName} 
                onSelect={(path) => {
                  this.setState({ addFilter: { ...addFilter, path } })
                }}
              />
            </div>}
            {!newFilterCols.length? null : <SearchList 
              // label={
              //   <div className="pl-p5 pt-p5">
              //     Choose column {(lastTable? ` (${lastTable})` : "")}
              //   </div> 
              // }
              className="search-list-cols f-1"
              style={{ maxHeight: "unset"}}
              rowStyleVariant="row-wrap"
              autoFocus={true}
              items={newFilterCols.filter(c => c.filter).map(c => ({ 
                key: c.name, 
                label: c.name,
                subLabel: c.data_type,
                styles: {
                  subLabel: {
                    color: getColumnDataColor(c),
                    fontWeight: 300,
                  }
                },
                onPress: () => {
                  const fieldName = c.name;
                  const col = newFilterCols.find(c => c.name === fieldName);
                  if(!col) return;

                  const isGeo = col.udt_name.startsWith("geo")
                  const innerFilter: SmartGroupFilter[number]  = {
                    fieldName,
                    type: isGeo? "$ST_DWithin" : defaultType ?? (addFilter.path? "not null" : isCategorical(col)? "$in" : "$between"),
                    value: [],
                    // disabled: isGeo
                    disabled: true,
                  };
                  const newFilter = addFilter.path? {
                    type: existsFilterType,
                    path: addFilter.path,
                    filter: innerFilter,
                    disabled: true
                  } : innerFilter;

                  onChange?.([
                    ...detailedFilter,
                    newFilter,
                  ]);

                  this.setState({ addFilter: undefined })
                }
              }))}
            />}
          </div>
        </Popup>

    }

    return <>
      <Btn title="Add filter"
        className={"shadow bg-0 " + className}
        style={{  borderRadius: "6px", ...style }} // backgroundColor: "white",
        color="action"
        iconPath={mdiFilterPlus} 
        onClick={(e) => {
          this.setState({
            addFilter: {},
            popupAnchor: e.currentTarget
          })
        }}
        children={this.props.variant === "full"? "Add filter" : undefined}
        data-command={"SmartAddFilter"}
        {...btnProps}
      />
      {popup}
    </>
  }
}

