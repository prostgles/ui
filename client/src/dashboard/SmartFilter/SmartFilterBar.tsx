import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiDelete,
  mdiPencilOutline,
  mdiSortReverseVariant,
  mdiSortVariant, mdiUnfoldLessHorizontal, mdiUnfoldMoreHorizontal
} from "@mdi/js";
import { AnyObject } from "prostgles-types";
import React from "react";
import { SimpleFilter, SmartGroupFilter, getFinalFilterInfo, isJoinedFilter } from '../../../../commonTypes/filterUtils';
import { PrglCore, Theme } from "../../App";
import Btn from "../../components/Btn";
import { ExpandSection } from "../../components/ExpandSection";
import { classOverride } from "../../components/Flex";
import { Footer } from "../../components/Popup/Popup";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import { pluralise } from "../../pages/Connections/Connection";
import { CodeConfirmation } from "../Backup/CodeConfirmation";
import { IsTable, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { InsertButton } from "../SmartForm/InsertButton";
import SmartForm from "../SmartForm/SmartForm";
import { ColumnConfig, ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";
import { colIs } from "../W_Table/ColumnMenu/ColumnSelect";
import SmartAddFilter from "./SmartAddFilter";
import SmartFilter, { getSmartGroupFilter } from "./SmartFilter";
import SmartSearch from "./SmartSearch";


type P = PrglCore & {
  theme: Theme;
  className?: string;
  innerClassname?: string;
  style?: React.CSSProperties;

  filterFields?: string[];

  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showInsertUpdateDelete?: {
    onSuccess?: VoidFunction;
    showinsert?: boolean;
    showupdate?: boolean;
    showdelete?: boolean;
  }
  rowCount: number;
  hideSort?: boolean;
  extraFilters?:  AnyObject[];
  fixedData?: AnyObject;
} & (
  {
    w: WindowSyncItem<"table"> | WindowSyncItem<"card">
  } | {
    filter?: SmartGroupFilter;
    table_name: string;
    onChange: (newFilter: SmartGroupFilter) => any;
    onSortChange?: (newSort: ColumnSort | undefined) => any;
    sort?: ColumnSort;
    /**
     * Used for sorting
     */
    columns?: ColumnConfig[];
  }
)

type S = {
  orderByKey?: string;
  orderAsc?: boolean;
  updateAllRow?: AnyObject;
}

export default class SmartFilterBar extends React.Component<P ,S> {

  state: S = {
  }

  render(){
    const { db, tables, leftContent, filterFields, style, className, innerClassname, rightContent, 
      hideSort, showInsertUpdateDelete = {}, rowCount, methods: dbMethods, theme,
      fixedData,
    } = this.props;

    const { filter: _fltr = [] } = (("w" in this.props)? this.props.w : this.props),

      { table_name, columns } = ("w" in this.props)? this.props.w : this.props,
      onFilterChange = ("w" in this.props)? (filter) => {  
        "w" in this.props && this.props.w.$update({ filter }, { deepMerge: true });
      } : this.props.onChange;
    const w: WindowSyncItem<"table"> | WindowSyncItem<"card"> | undefined = "w" in this.props? this.props.w : undefined;

    const { updateAllRow } = this.state;

    const table = tables.find(t => t.name === table_name);

    const filter: SmartGroupFilter = _fltr.map(f => ({ ...f }));
    const finalFilter = getSmartGroupFilter(filter);
    
    if(!table_name || !table) return null;
    const someFiltersExpanded = filter.some(f => !f.minimised);

    let SortButton: React.ReactNode = null;
    if(!hideSort){
      const setSort = (orderByKey: string | undefined, orderAsc = true) => {
        const newSort: ColumnSort | undefined = !orderByKey? undefined : {
          key: orderByKey, 
          asc: orderAsc
        }
        if("w" in this.props){
          w && w.$update({ sort: newSort && [newSort] })
        } else if(this.props.onSortChange) {
          this.setState({ orderByKey, orderAsc })
          this.props.onSortChange(newSort)
        }
      }
      const orderableFields = columns ?? table.columns.filter(c => c.filter);
      let orderByKey: string | undefined;
      let orderAsc = true;
      if("w" in this.props){
        orderByKey = w?.sort?.[0]?.key as string;
        orderAsc = w?.sort?.[0]?.asc ?? true;
      } else if(typeof this.props.sort?.key === "string"){
        orderByKey = this.props.sort.key;
        orderAsc = this.props.sort.asc ?? true;
      }

      SortButton = <div className={" flex-row min-h-0 f-0 relative ai-center "}>
        <Select
          id="orderbycomp"
          buttonClassName="shadow bg-0"
          style={{
            background: "white" 
          }}
          emptyLabel="Sort by..."
          asRow={true}
          value={orderByKey}
          fullOptions={orderableFields.map(f => ({
            key: f.name,
            label: f.label || f.name,
          }))}
          onChange={(orderByKey) => {
            setSort(orderByKey, orderAsc);
          }}
          optional={true}
        />
        {orderByKey && <Btn color="action" iconPath={orderAsc ? mdiSortReverseVariant : mdiSortVariant} 
          onClick={() => { 
            setSort(orderByKey, !orderAsc);
          }} 
        />}
      </div>
    }

    const commonBtnProps = {
      variant: "outline",
      // size: "small",
      className: "shadow w-fit h-fit bg-0",
    } as const;
      
    const tableHandler = db[table_name];
    const filterAsString = filter.map(f => getFinalFilterInfo(f));

    const { showdelete = true, showinsert = true, showupdate = true} = showInsertUpdateDelete;
    const hideUpdateDelete = [showdelete, showupdate].every(v => v === false)
    const canUpdateOrDelete = !hideUpdateDelete && (tableHandler?.delete || tableHandler?.update);
    const renderedFilters = !!filter.length && <div className={"flex-row-wrap min-h-0 f-0 relative ai-start px-1 my-p5"} >
      <SmartFilter
        filterClassName={"shadow"}
        className="mr-1 mt-p5"
        tables={tables}
        db={db}
        tableName={table_name}
        detailedFilter={filter}
        onChange={onFilterChange} 
        operand={IsTable(w) && w.options.filterOperand === "OR"? "OR" : "AND"}
        onOperandChange={!w?.$update? undefined : filterOperand => {
          w.$update({ options: { filterOperand } }, { deepMerge: true }); 
        }}
      />
    </div>

    return (
      <div
        className={"SmartFilterBar flex-col min-h-0 min-w-0 relative  " + className}
        style={style}
      >
        {leftContent}
        
        <div className={classOverride("flex-row-wrap min-h-0 f-0 relative ai-center px-1 gap-p5", innerClassname)} >
          <SmartAddFilter
            tableName={table_name}
            filterFields={filterFields} 
            db={db} 
            tables={tables} 
            detailedFilter={filter}
            onChange={onFilterChange}
          />
          {Boolean(filter.length) && <Btn
            title="Expand/Collapse filters"
            iconPath={window.isMobileDevice? (!someFiltersExpanded? mdiUnfoldMoreHorizontal : mdiUnfoldLessHorizontal) : undefined}
            onClick={() => {
              const newFilters = toggleAllFilters(filter);
              
              onFilterChange(newFilters)
            }}
          >{window.isMobileDevice? null : `${!someFiltersExpanded? "Expand" : "Collapse"} filters`}</Btn>}
          <div className={"flex-row f-1 mx-p5 jc-center mr-p5 ai-center"} >
            <SmartSearch
              tables={tables}
              db={db}
              style={{ 
                alignSelf: "center",
                width: "500px",
                maxWidth: "80vw",
                // marginRight: ".5em"
              }}
              className="m-auto"
              tableName={table_name}
              detailedFilter={filter}
              extraFilters={this.props.extraFilters}
              onPressEnter={(term) => {
                let newGroupFilter = filter.slice(0);
                const newF: SimpleFilter = {
                  fieldName: "*",
                  type: "$term_highlight",
                  value: term,
                  minimised: true,
                }
                newGroupFilter = [
                  ...filter,
                  newF
                ]
                onFilterChange(newGroupFilter)
              }}
              onChange={(val) => { //gFilter: SmartGroupFilter, 
                const { filter: gFilter, colName, columnValue, term } = val ?? {}; 

                if(!gFilter){

                  onFilterChange([ ...filter ]);
                  return;
                }

                const col = table.columns.find(c => c.name === colName);
                
                if(!colName) throw "Unexpected: colName missing"

                let newGroupFilter = gFilter.slice(0);

                if(columnValue?.toString().length && col &&  (colIs(col, "_PG_date") || colIs(col, "_PG_numbers"))){
                  const newF: SimpleFilter = {
                    fieldName: colName,
                    minimised: true,
                    ...(colIs(col, "_PG_date")? { 
                      type: "$term_highlight",
                      value: term
                    } : {
                      type: "=",
                      value: columnValue,
                    })
                  } 
                  newGroupFilter = [
                    ...filter,
                    newF
                  ]
                }
                
                onFilterChange(newGroupFilter);
              }
            } 
            />
            {Boolean(SortButton || rightContent || showInsertUpdateDelete) && <div className="ml-auto pl-1 flex-row ai-center">
              {SortButton}
              {rightContent}

              <div className="flex-row ai-center gap-p5 ml-1">

                {!!canUpdateOrDelete && 
                <ExpandSection 
                  label={""} 
                  className="" 
                  iconPath={collapsed => collapsed? mdiChevronLeft : mdiChevronRight} 
                  buttonProps={{
                    "data-command": "SmartFilterBar.rightOptions.show",
                  }}
                  collapsible={true}
                >

                  {!!tableHandler.delete && showdelete && <CodeConfirmation 
                    positioning="beneath-right"
                    button={(
                      <Btn 
                        iconPath={mdiDelete} 
                        title="Delete rows..."
                        {...commonBtnProps} 
                        color="danger"
                        data-command="SmartFilterBar.rightOptions.delete"
                      >
                        Delete
                      </Btn>
                    )}  
                    message={async () => {
                      const count = await tableHandler.count?.(finalFilter)
                      return <div className="flex-col gap-1" style={{ maxWidth: "100%" }}>
                        <div className="font-20 bold ">Delete {count?.toLocaleString()} {pluralise(count ?? 0, "record")} {filterAsString.length? "matching the current filter" : ""}</div>
                         
                      </div>
                    }}
                    confirmButton={pCLose => (
                      <Btn 
                        iconPath={mdiDelete} 
                        {...commonBtnProps}
                        color="danger"
                        title="Delete rows" 
                        onClickPromise={async () => {
                          await tableHandler.delete!(finalFilter);
                          showInsertUpdateDelete.onSuccess?.();
                          pCLose();
                        }} 
                      >
                        Delete rows
                      </Btn>
                    )}
                  />}


                  {!!tableHandler.update && showupdate && <PopupMenu
                    positioning="right-panel"
                    button={(
                      <Btn {...commonBtnProps}
                        iconPath={mdiPencilOutline} 
                        title="Update rows"
                        color="action"
                        data-command="SmartFilterBar.rightOptions.update"
                      >
                        Update
                      </Btn>
                    )} 
                    contentStyle={{
                      padding: 0
                    }}
                    render={pClose => (<>
                        <SmartForm 
                          theme={theme}
                          label={`Update ${rowCount} rows`}
                          db={db} 
                          rowFilter={[]}
                          tableName={table_name} 
                          tables={tables}
                          methods={this.props.methods}
                          onChange={updateAllRow => {
                            this.setState({ updateAllRow })
                          }}
                          fixedData={fixedData}
                          showJoinedTables={false}
                          columnFilter={c => !c.is_pkey && !(!c.is_nullable && c.references?.length)}
                        />
                        {updateAllRow && <Footer>
                          <Btn onClick={() => { this.setState({ updateAllRow: undefined }) }}>Cancel</Btn>
                          <Btn color="action" variant="filled" onClickPromise={async() => { 
                              await tableHandler.update!(finalFilter, updateAllRow);
                              this.setState({ updateAllRow: undefined });
                              showInsertUpdateDelete.onSuccess?.();
                          }}>Update</Btn>
                          {/* <ConfirmationDialog 
                            onClose={() => {

                            }}
                            onAccept={async () => {
                              await tableHandler.update!(finalFilter, updateAllRow);
                              this.setState({ updateAllRow: undefined });
                              showInsertUpdateDelete?.onSuccess?.();
                            }} 
                            message="Update rows?" 
                            acceptBtn={{ text: "Update", color: "action" }}
                          >

                          </ConfirmationDialog> */}
                        </Footer>}
                      </>
                    )} 
                  />}

                </ExpandSection>}

                {showinsert && <InsertButton
                  theme={theme}
                  buttonProps={commonBtnProps}
                  db={db}
                  methods={dbMethods}
                  tables={tables}
                  tableName={table_name}
                  onSuccess={showInsertUpdateDelete.onSuccess}
                />}
                {/* <PopupMenu 
                  button={(
                    <Btn iconPath={mdiPlus}
                      {...commonBtnProps}
                      title="Insert row"
                      color="action"
                      variant="filled"
                    />
                  )}
                  render={pClose => (
                    <SmartForm
                      asPopup={true}
                      confirmUpdates={true}
                      hideChangesOptions={true}
                      db={db}
                      tables={tables}
                      tableName={table_name}
                      onSuccess={showInsertUpdateDelete.onSuccess}
                      onClose={pClose}
                    />
                  )}
                /> */}

              </div>
            </div>}
          </div>
          
        </div>
        {renderedFilters}
      </div>
    )
  }
}


export const toggleAllFilters = (filters: (SimpleFilter)[], minimised?: boolean) => {
  const someFiltersExpanded = minimised ?? filters.some(f => !f.minimised);

  return filters.map(f => {
    if(isJoinedFilter(f)){
      f.filter.minimised = someFiltersExpanded;
    }
    return {
      ...f,
      minimised: someFiltersExpanded 
    }
  });
   
}