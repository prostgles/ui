
import { mdiChevronLeft, mdiChevronRight, mdiClose } from "@mdi/js";
import { quickClone } from "prostgles-client/dist/SyncedTable";
import { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { AnyObject, ProstglesError, SubscriptionHandler, TableInfo, ValidatedColumnInfo, isObject } from "prostgles-types";
import React from "react";
import { DetailedFilterBase, SmartGroupFilter } from '../../../../commonTypes/filterUtils';
import { Prgl } from "../../App";
import { SuccessMessage } from "../../components/Animations";
import Btn from "../../components/Btn";
import Checkbox from "../../components/Checkbox";
import ErrorComponent from "../../components/ErrorComponent";
import FileInput from "../../components/FileInput/FileInput";
import { classOverride } from "../../components/Flex";
import Loading from "../../components/Loading";
import Popup, { PopupProps } from "../../components/Popup/Popup";
import { filterObj, ifEmpty, isDefined, isEmpty, omitKeys } from "../../utils";
import RTComp from "../RTComp";
import { getSmartGroupFilter, sliceText } from "../SmartFilter/SmartFilter";
import SmartFormField, { SmartColumnInfo, columnIsReadOnly } from "./SmartFormField/SmartFormField";
import { SmartFormFieldOptions } from "./SmartFormField/SmartFormFieldOptions";
import { parseDefaultValue } from "./SmartFormField/fieldUtils";
import { SmartFormFileSection } from "./SmartFormFileSection";
import { SmartFormFooterButtons } from "./SmartFormFooterButtons";
import { SmartFormUpperFooter } from "./SmartFormUpperFooter";

export type getErrorsHook = (cb: (newRow: AnyObject) => SmartFormState["error"] | undefined) => void;

export type GetRefHooks = {
  /**
   * Show custom errors. Will first check against column is_nullable constraint
   */
  getErrors: getErrorsHook
}

export type GetRefCB = (hooks: GetRefHooks) => void;


export type SmartFormProps = Pick<Prgl, "db" | "tables" | "methods" | "theme"> & {
  tableName: string; 

  label?: string;
  /**
   * Executed after the rowFilter data was fetched
   */
  onLoaded?: VoidFunction;
  onChange?: (newRow: AnyObject) => void;

  rowFilter?: DetailedFilterBase[];
  confirmUpdates?: boolean;
  showLocalChanges?: boolean;
  onClose?: (dataChanged: boolean) => void;

  /**
   * If true then will search and display similar values
   */
  showSuggestions?: boolean;

  /**
   * Used for i18n
   */
  lang?: string;

  /**
   * 
   */
  getRef?: GetRefCB;

  /**
   * True by default. If true then it will allow inserting media
   */
  includeMedia?: boolean;

  defaultData?: AnyObject;

  hideChangesOptions?: boolean;


  cannotBeNullMessage?: string;

  asPopup?: boolean;
  onValidate?: (row: AnyObject, cols: SmartColumnInfo[]) => any;
  onValidateValue?: (value: any, row: AnyObject, cols: SmartColumnInfo) => any;

  onInserted?: (newRow: AnyObject | AnyObject[]) => void;
  onBeforeInsert?: (newRow: AnyObject | AnyObject[]) => void;

  enableInsert?: boolean;
  insertBtnText?: string;
  hideNullBtn?: boolean;

  /**
   * Fired after a successful update/insert
   */
  onSuccess?: (action: "insert" | "update" | "delete", newData?: AnyObject) => void; 

  className?: string;

  showJoinedTables?: boolean;

  disabledActions?: ("update" | "delete" | "clone")[];

  hideNonUpdateableColumns?: boolean;

  /**
   * Data used in insert mode that the user can't overwrite
   */
  fixedData?: AnyObject;

  /**
   * Used to skip through records
   */
  onPrevOrNext?: (increment: -1 | 1) => void;

  /**
   * Used in activating the prev/next buttons 
   */
  prevNext?: {
    prev: boolean;
    next: boolean;
  }

  noRealtime?: boolean;
  contentClassname?: string;

  /** If defined then this insert was triggered from a SmartForm tableName that references this table */
  isReferencedInsert?: {
    tableName: string;
    columnName: string;
    pkeyColumns: string[];
    row: AnyObject;
  }

} & ({
  columns?: (string | { name: string; sectionHeader?: string })[];
} | {
  columnFilter?: (c: ValidatedColumnInfo) => boolean;
})

export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

type FormActionCommon = {
  currentRow?: AnyObject;
  success?: string;
  dataItemLoaded?: boolean;
  loading?: boolean;
  /**
   * Used to indicate that getData can start
   */
  initialised: boolean;
}

export type FormAction = FormActionCommon & ({
  type: "view";
} | {
  type: "update"; 
  /**
   * New data
   */
  isMultiUpdate: boolean;
  data?: AnyObject;
} | {
  type: "insert";
  data: AnyObject;
  clonedRow?: AnyObject;
}) & {
};

export type SmartFormState = {
  /**
   * If this table has dynamic rules and this is an update we will get the dynamic column info.
   *  tables.columns will be used otherwise
   */
  dynamicValidatedColumns?: ValidatedColumnInfo[];
  tableInfo?: TableInfo;
  error?: any;
  newRow?: AnyObject;
  rowFilter?: SmartGroupFilter;
  confirmUpdates?: boolean;
  showLocalChanges?: boolean;
  localChanges: { oldRow: AnyObject; newRow: AnyObject; }[];
  errors?: {
    [col_name: string]: string;
  }

  defaultColumnData?: AnyObject;

  /**
   * Referenced table insert
   */
  referencedInsert?: { col: SmartColumnInfo; data?: AnyObject; }

  nestedInsertTable?: string;
  searchReferencedRow?: { 
    tableName: string; 
    fcols: string[];
    col: ValidatedColumnInfo;
  }

  referencedInsertData?: Record<string, any>;

  action: FormAction;
}

export default class SmartForm extends RTComp<SmartFormProps, SmartFormState> {
  state: SmartFormState = {
    error: undefined,
    newRow: undefined,
    confirmUpdates: undefined,
    showLocalChanges: undefined,
    rowFilter: undefined,
    localChanges: [],
    errors: undefined,
    tableInfo: undefined,
    defaultColumnData: {},
    referencedInsert: undefined,
    action: {
      type: "view",
      dataItemLoaded: false,
      initialised: false,
    }
  }
 
  get table(){
    const { tableName, tables } = this.props;
    return tables.find(t => t.name === tableName)
  }

  rowSub?: SubscriptionHandler;
  rowSubFilterStr?: string;
  onMount = async () => {
    const { tableName, lang, rowFilter, db, tables } = this.props;

    const tableHandler = db[tableName];
    const table = tables.find(t => t.name === tableName)
    const tableInfo = table?.info;
    if (!tableHandler?.getInfo || !tableHandler.getColumns || !tableInfo) {
      this.setState({ error: "Table getInfo/getColumns hooks not available/published: " + tableName })
      return;
    }

    let action: FormAction = { type: "view", loading: true, dataItemLoaded: false, initialised: true }
    if ((rowFilter && (this.tableHandler.update || this.tableHandler.delete))) {
      if(this.props.fixedData){
        this.setState({ newRow: { ...this.props.fixedData } })
      }
      action = { 
        type: "update", isMultiUpdate: !rowFilter.length, loading: true, data: {}, dataItemLoaded: false, initialised: true
      };
    } else if (this.tableHandler.insert && (!rowFilter)) {
      action = { 
        type: "insert", data: {}, initialised: true
      };
    }

    let getColParams: Parameters<typeof tableHandler.getColumns>[1];
    if(action.type === "update"){
      getColParams = {
        rule: "update",
        filter: getSmartGroupFilter(rowFilter),
        data: { thisIsBad: 1 }
      }
    }
    const _columns = !getColParams? table.columns : (await tableHandler.getColumns(lang, getColParams));

    this.setState({ 
      action,
      dynamicValidatedColumns: _columns, 
      tableInfo,
      // dataItemLoaded: this.state.dataItemLoaded || Boolean(!rowFilter),
      error: "columns" in this.props && this.props.columns?.length && this.props.columns.some(c => !_columns.some(_c => _c.name === c))? "Some requested columns not found in the table" : undefined
    });
  }

  get defaultColumnData(){
    const { rowFilter } = this.props;
    const defaultColumnData = {};
    if (!rowFilter) {
      this.columns.forEach(c => {
        defaultColumnData[c.name] = parseDefaultValue(c, undefined, false)
      });
    }

    return defaultColumnData;
  }

  get mediaTableInfo(){
    const { includeMedia = true, tables } = this.props;

    const tableInfo = this.table?.info;
    if (tableInfo?.hasFiles && tableInfo.fileTableName && includeMedia ) {
      return tables.find(t => t.info.isFileTable)?.info;
    }
  }

  getErrors: getErrorsHook = async (cb) => {
    const { defaultData = {}, rowFilter, cannotBeNullMessage = "Must not be empty" } = this.props;
    const { newRow = {}, defaultColumnData = {}, tableInfo, referencedInsertData = {} } = this.state;
    let data = { ...defaultColumnData, ...defaultData, ...newRow, ...referencedInsertData };
    let _errors: AnyObject | undefined;

    const { columns } = this;
    
    this.getDisplayedColumns().filter(c => (c.insert || c.update)).forEach(c => {

      const val = data[c.name];

      /* Check against not null rules */
      if(!c.is_nullable) {

        const isNull = v => [undefined, null].includes(v);
      
        const willInsertMedia = (tableInfo?.hasFiles && tableInfo.fileTableName && c.references?.some(r => r.ftable === tableInfo.fileTableName) && data[tableInfo.fileTableName]?.length);
        if (
          /* If it's an insert then ensure all non nullable cols are filled */
          (!rowFilter && isNull(val) && !c.has_default && !willInsertMedia) ||
  
          /* If update then ensure not updating non nullable with null  */
          (val === null)
        ) {
          _errors ??= {};
          _errors[c.name] = cannotBeNullMessage;
        }
      }

      /** Ensure json fields are not string */
      if(c.udt_name.startsWith("json") && typeof val === "string"){

        try {
          data = {
            ...data,
            [c.name]: JSON.parse(val)
          }
        } catch(error) {
          _errors ??= {};
          _errors[c.name] = "Must be a valid json"
        }
      }

    });

    if (!_errors) {
      let verr;
      if (this.props.onValidateValue) {
        await Promise.all(columns.map(async c => {
          const err = await this.props.onValidateValue?.(data[c.name], data, c);
          if (err) {
            verr = verr || {};
            verr = { ...verr, [c.name]: err }
          }
        }))
      } else if (this.props.onValidate) {
        verr = await this.props.onValidate(data, columns);
      }
      const errors = verr || await cb(data);

      if (errors && !isEmpty(errors)) {
        this.setState({ errors });
      }

    } else {
      this.setState({ errors: _errors });
    }

  }

  onDelta = async (dP?: Partial<SmartFormProps>, dS?: Partial<SmartFormState>) => {
    const { tableName, db, getRef } = this.props;
    const { action } = this.state;
    
    if (getRef) {
      getRef({ getErrors: this.getErrors });
    }

    const rowFilter = this.getRowFilter();
    if (action.initialised && (action.type === "view" || action.type === "update") && (dS?.action || dP?.rowFilter || dS?.rowFilter) && this.rowSubFilterStr !== JSON.stringify(rowFilter || "")) {
      this.rowSubFilterStr = JSON.stringify(rowFilter || "");
      await this.rowSub?.unsubscribe();
      if(!this.props.rowFilter?.length || !rowFilter) {
        this.setState({
          action: {
            ...this.state.action,
            loading: false,
            dataItemLoaded: true
          }
        })
        return;
      }

      const tableHandler = db[tableName];

      const findAndSetRow = async () => {
        const currentRow = await tableHandler?.findOne?.(
          rowFilter,
          { select: await this.getSelect() }
        );
        const newAction = {
          ...this.state.action,
          loading: false,
          currentRow,
          dataItemLoaded: true
        };
        
        this.setState({
          action: newAction
        }, () => {
          this.props.onLoaded?.();
        })
      }

      if (tableHandler?.subscribeOne && !this.props.noRealtime) {
        try {
          const options = { select: await this.getSelect() };
          /** validate options */
          await findAndSetRow();
          this.rowSub = await tableHandler.subscribeOne(
            rowFilter,
            options,
            currentRow => {
              if (currentRow) {
                this.setState({ action: { ...this.state.action, loading: false, currentRow, dataItemLoaded: true } });
              }
            }
          );

        } catch (error) {
          console.error("Could not subscribe", { tableName, rowFilter, error, select: await this.getSelect() });
          findAndSetRow();
        }
      } else {
        findAndSetRow();
      }

    }
  }

  onUnmount = async () => {
    if (this.rowSub) await this.rowSub.unsubscribe();
    // throw "allow ctrl + z to undo"
  }

  getSelect = async () => {
    const { tableName, db, includeMedia = true } = this.props;
    const { tableInfo } = this.state;
    let ti = tableInfo;
    if (!tableInfo) {
      ti = await db[tableName]?.getInfo?.();
      this.setState({ tableInfo: ti })
    }

    const select = { $rowhash: 1, "*": 1 } as const;
    if (includeMedia && ti?.fileTableName && ti.fileTableName !== tableName && ti.hasFiles && db[ti.fileTableName]?.find) {
      select[ti.fileTableName] = "*"
    }
    return select;
  }

  getRowFilter = (): AnyObject | undefined => {
    const f = this.state.rowFilter || this.props.rowFilter;
    if(!f) return undefined;
    return getSmartGroupFilter(f);
  }

  getRow = async () => {
    const { tableName, db } = this.props;
    return db[tableName]?.find?.(this.getRowFilter(), { select: await this.getSelect() });
  }

  getValidatedRowFilter = async () => {

    const rowFilter = this.getRowFilter();
    // const f = { $rowhash: rowFilter.$rowhash };
    const rws = await this.getRow();

    // if(rws.length === 1 && !Object.keys(currentRow).find(key => currentRow[key] !== rws[0][key] ) ){
    return rowFilter;
    // } else {
    //     throw "Row has since changed. Could not update"
    // }
  }

  setReferencedInsertData = (column: Pick<ValidatedColumnInfo, "is_pkey" | "name">, newVal: any) => {
    const { referencedInsertData = {} } = this.state;
    this.setState({
      errors: undefined,
      error: undefined,
      referencedInsertData: {
        ...referencedInsertData,
        [column.name]: newVal
      } 
    })
  }

  setData = async (column: Pick<ValidatedColumnInfo, "is_pkey" | "name" | "tsDataType">, newVal: any) => {
    this.wasChanged = true;
    const {
      db, tableName, rowFilter, onChange, onSuccess
    } = this.props;
    
    const { localChanges,
      confirmUpdates = this.props.confirmUpdates ?? false,
      errors, action
    } = this.state;
    
    const { currentRow = {} } = action;

    const newRow = {
        // ...currentRow,
        ...(this.state.newRow || {}),
        [column.name]: newVal,
      };
    const oldRow = Object.keys(newRow)
        .reduce((a, key) => ({
          ...a,
          [key]: currentRow[key]
        }), {});
    let newState = {};

    if(action.type === "update"){
      getKeys(newRow).forEach(key => {
        /* Remove updates that change nothing */
        if(newRow[key] === currentRow[key] && key in currentRow){
          delete newRow[key];
        }
      })
    }

    /* Remove empty updates */
    if(newRow[column.name] === "" && column.tsDataType !== "string"){
      delete newRow[column.name];
    }

    if (!onChange && rowFilter && !confirmUpdates) {
      try {
        const f = await this.getValidatedRowFilter();
        if(!f) throw "No update filter provided";
        const newRow = await db[tableName]?.update?.(f, { [column.name]: newVal }, { returning: "*" });
        onSuccess?.("update", newRow as any);
      } catch (_e: any) {
        this.parseError(_e);
        return;
      }
    } else {
      newState = { ...newState, newRow }
    }
    /** Update rowFilter */
    if (!confirmUpdates && rowFilter && column.is_pkey) {
      newState = {
        ...newState,
        rowFilter: {
          ...(this.props.rowFilter || {}),
          [column.name]: newVal
        }
      }
    }
    onChange?.(newRow);


    let _errors;
    if (errors) {
      _errors = { ...errors };
      delete _errors[column.name];
      newState = {
        ...newState,
        errors: _errors
      }
    }

    this.setState({
      ...newState,
      error: undefined,
      localChanges: localChanges.slice(0)
        .concat([
          { oldRow, newRow }
        ])
    });

  }

  closed = false;
  wasChanged = false;
  onClose = () => {

    const { onClose, rowFilter } = this.props;
    onClose?.(true);
  }

  getThisRow = (): AnyObject => {
    const { newRow, defaultColumnData = {}, action } = this.state;
    const { defaultData = {}, fixedData } = this.props;
    
    return action.type === "insert" ? { ...this.defaultColumnData, ...defaultData, ...action.clonedRow, ...newRow, ...fixedData } : { ...action.currentRow, ...defaultColumnData, ...defaultData, ...(newRow), ...fixedData };
  }

  parseError = (error: ProstglesError) => {
    let errState: Partial<SmartFormState> = { 
      error: typeof error === "string"? error : ((error.table? `${error.table}: ` : "") + (error.message || error.txt || (error as any).detail)) 
    };
    if(isObject(error) && error.code === "23503" && error.table){
      errState = { error: `Table ${error.table} has rows that reference this record (foreign_key_violation)` }
    } else if (Object.keys(error).length && error.constraint) {
      let cols: string[] = [];
      const errors = {};
      if (error.columns) {
        cols = error.columns;
      } else if (error.column) {
        cols = [error.column];
      }
      cols.forEach(c => {
        if (this.columns.find(col => col.name === c)) {
          let message = error.constraint;
          if(error.code_info === "unique_violation"){
            message = "Value already exists. \nConstraint: " + error.constraint;
          }
          errors[c] = message;
        }
      });
      if (Object.keys(errors).length) {
        errState = { errors };
      }
    }

    this.setState({ ...(errState as any), action: { ...this.state.action, loading: false } });
  }

  get tableHandler(): Partial<TableHandlerClient<AnyObject, void>> {
    const { db, tableName } = this.props;
    const tableHandler = db[tableName];
    if(!tableHandler) throw `${tableName} handler missing`;
    return tableHandler;
  }

  get columns(): (ValidatedColumnInfo & {sectionHeader?: string})[]{
    const { fixedData } = this.props;
    let validatedCols = quickClone((this.state.dynamicValidatedColumns || this.table?.columns || []));
    if(fixedData){
      const fixedFields = getKeys(fixedData);
      validatedCols = validatedCols.map(c => ({ 
        ...c, 
        insert: fixedFields.includes(c.name)? false : c.insert
      }));
    }
    let displayedCols = validatedCols as SmartColumnInfo[];

    if("columns" in this.props){
      const { columns } = this.props;

      /** Add headers */
      if (columns) {
        displayedCols = columns.map(cc => {
  
          if (typeof cc === "string") {
            return validatedCols.find(c => c.name === cc)
          } else {
            const ec = validatedCols.find(c => c.name === cc.name);
            if(!ec) return undefined;
  
            if (cc.sectionHeader) {
              return { ...ec, ...cc }
            }
            return { ...ec }
          }
        }).filter(isDefined);
      }
    }

    if("columnFilter" in this.props && this.props.columnFilter){
      const { columnFilter } = this.props;
      displayedCols = displayedCols.filter(columnFilter)
    }

    if(this.state.action.type === "update" && this.state.action.isMultiUpdate){
      displayedCols = displayedCols.filter(c => c.update);
    }

    return displayedCols;
  }

  getDisplayedColumns = () => {
    const { tableInfo, action } = this.state;
    const { hideNonUpdateableColumns = false } = this.props;
    if(tableInfo?.isFileTable && action.type === "insert"){
      return []
    }

    const validatedCols = this.columns.slice(0)
    const displayedCols = validatedCols;

    return displayedCols
      .filter(c =>  
         action.type === "view" && c.select || 
        (action.type === "update" && (c.update || (!hideNonUpdateableColumns && c.select))) || 
        (action.type === "insert" && c.insert)
      )
  }

  render() {
    const { tableName,
      onChange, showSuggestions, label,
      hideChangesOptions = false,
      includeMedia = true, asPopup, enableInsert = true, 
      db, tables, methods , className = "", onPrevOrNext, prevNext, contentClassname, theme
    } = this.props;

    const { error, errors = {}, tableInfo,
      confirmUpdates = this.props.confirmUpdates ?? false,
      showLocalChanges = this.props.showLocalChanges ?? true,
      action
    } = this.state;

    const hideNullBtn = action.type === "view" || this.props.hideNullBtn;

    const row = this.getThisRow();

    let fileManager: React.ReactNode = null;
    let fileManagerTop: React.ReactNode = null;
    let fileManagerBottom: React.ReactNode = null;
    if (this.table && tableInfo?.isFileTable && includeMedia && tableInfo?.fileTableName ) {
      fileManager = <SmartFormFileSection 
        { ...this.props} 
        table={this.table}
        setNewRow={newRow => this.setState({ newRow })}
        row={row}
        action={action}
        getThisRow={this.getThisRow} 
        setData={this.setData} 
        mediaTableInfo={this.mediaTableInfo} 
        mediaTableName={tableInfo.fileTableName} 
      />
      if(tableInfo.isFileTable){
        fileManagerTop = fileManager;
      } else {
        fileManagerBottom = fileManager;
      }
    }

    const maxWidth = "max-w-650" as const;

    if(!tableInfo) return null;

    const rowFilter = this.getRowFilter();
    const filterKeys = rowFilter && "$and" in rowFilter? rowFilter.$and.flatMap(f => getKeys(f)) : getKeys(rowFilter ?? {});
    /** Do not show subTitle rowFilter if it's primary key and shows in columns */
    const knownJoinColumns = this.getDisplayedColumns().filter(c => c.is_pkey || c.references).map(c => c.name);
    const titleEnd = rowFilter? filterKeys.every(col => knownJoinColumns.includes(col) )? undefined : 
      sliceText( " (" + Object.keys(rowFilter).map(k => `${k}: ${JSON.stringify(rowFilter[k])}`).join(" AND ") + ")", 100) : "";
    
    const headerText = label ?? (((action.type === "insert" && action.clonedRow)? "[Cloned row] " : "") + (tableInfo.comment || tableName) );
      
    const formHeader = asPopup ? null : (!label && "label" in this.props) ? null : headerText ? <h4 className="font-24" style={{ margin: 0, padding: "1em", paddingBottom: ".5em" }}>{headerText}</h4> : null;

    if(action.dataItemLoaded === false) {
      return null;// <div className="bg-0 w-full f-1"></div>
    }
    
    const renderResult = <div  
      className={classOverride("SMARTFORM " + 
        (asPopup? "" : maxWidth ) + 
        " fade-in flex-col f-1 min-h-0 relative " + 
        (action.loading ? " no-pointer-events noselect " : " "),
        className)
      } 
    >
      {action.loading && <Loading variant="cover" />}

      {formHeader}
      <div className={classOverride("SMARTFORM_CONTENT flex-col f-1 o-auto min-h-0 min-w-0 p-1 gap-1 " + (window.isMobileDevice? "" : " px-2 "), contentClassname)} style={{ paddingTop: 0 }}>
        {fileManagerTop}
        {this.getDisplayedColumns()
          .map((c, i) => {

            const rawValue = row[c.name];

            const formFieldStyle: React.CSSProperties = !c.sectionHeader ? {} : { marginTop: "1em" }

            const refInsertData = this.state.referencedInsertData?.[c.name];
            if(refInsertData){
              if(c.file){
                return <FileInput
                  key={i}
                  className={"mt-p5 f-0 " + (tableInfo.isFileTable? "mt-2" : "")}
                  label={c.label}
                  media={[refInsertData]}
                  minSize={470}
                  maxFileCount={1}
                  onAdd={files => {
                    this.setReferencedInsertData(c, files[0])
                  }}
                  onDelete={async media => {
                    this.setReferencedInsertData(c, undefined)
                  }}
                />
              }
              return <div key={i} className="form-field flex-col min-w-0 mt-1" style={formFieldStyle}>
                <label className=" main-label ta-left noselect text-1p5  pointer " style={{ flex: `0.5 1 0%` }}>{c.label}</label>
                <div className={"flex-row gap-1 ai-center  f-1"}>
                  <Btn className="mr-auto  bg-0" variant="outline" color="action" title="View insert data" onClick={() => {
                    this.setState({ referencedInsert: { col: c, data: refInsertData } })
                  }}>New data</Btn>
                  <Btn title="Remove nested insert" iconPath={mdiClose} onClick={() => {
                    this.setReferencedInsertData(c, undefined)
                  }}/>
                </div>
              </div>
            }

            return (<SmartFormField
              key={i}
              theme={theme}
              tableInfo={tableInfo}
              tables={tables}
              db={db}
              methods={methods}
              tableName={tableName}
              action={action.type}
              column={c}
              value={rawValue|| ""}
              rawValue={rawValue}
              row={row}
              onChange={newVal => this.setData(c, newVal)}
              showSuggestions={showSuggestions}
              error={errors[c.name] ?? (isObject(error) && error.column === c.name? error : undefined)}
              rightContentAlwaysShow={false}
              rightContent={columnIsReadOnly(action.type, c)? undefined : (
                <SmartFormFieldOptions 
                  {...this.props}
                  action={action.type}
                  row={row}
                  column={c}  
                  tableInfo={tableInfo}  
                  enableInsert={enableInsert} 
                  hideNullBtn={hideNullBtn} 
                  referencedInsertData={this.state.referencedInsertData} 
                  setData={this.setData}
                  setReferencedInsertData={this.setReferencedInsertData}
                />
              )}
              hideNullBtn={hideNullBtn}
              sectionHeader={c.sectionHeader}
              style={formFieldStyle}
              variant="column"
            />)
          })
        }
        {fileManagerBottom}
      </div>

      {(hideChangesOptions || action.type === "view") ? null : <>
        {(onChange || action.type === "insert") ? null : <Checkbox label={"Confirm updates"} checked={confirmUpdates} onChange={({ currentTarget }) => { this.setState({ confirmUpdates: currentTarget.checked }) }} />}
        {onChange ? null : <Checkbox label={"Show local changes"} checked={showLocalChanges} onChange={({ currentTarget }) => { this.setState({ showLocalChanges: currentTarget.checked }) }} />}
      </>}


      <SmartFormUpperFooter {...this.props}
        columns={this.columns}
        onSetNestedInsertData={nestedData => {
          this.setState({
            newRow: {
              ...this.state.newRow,
              ...nestedData,
            }
          })
        }}
        row={row}
        state={this.state}
        onRemoveUpdate={(key) => {
          this.setState({
            newRow: filterObj({ ...this.state.newRow }, undefined, [key])
          })
        }}
      />

      <ErrorComponent className="f-0 b rounded" style={{ flex: "none", padding: "1em" }} withIcon={true}
        error={error || ifEmpty(omitKeys(errors, this.getDisplayedColumns().map(c => c.name)), undefined)} // .map(k => `${k}: ${JSON.stringify(errors[k])}`).join("\n")
      />
      {(action.success && !error) ? 
        <SuccessMessage 
          message={`${action.success}!`}
          duration={{
            millis: 2e3,
            onEnd: () => {
              this.props.onClose?.(true);
              this.setState({ 
                action: {
                  ...this.state.action,
                  success: undefined,
                } 
              })
            }
          }}
          className="w-full h-full bg-0" 
          style={{ position: "absolute", zIndex: 222 }} 
        /> : 
      null}

      <SmartFormFooterButtons 
        state={this.state} 
        props={this.props} 
        action={action.type} 
        columns={this.columns} 
        getThisRow={this.getThisRow} 
        getErrors={this.getErrors}
        parseError={this.parseError}
        getRowFilter={this.getRowFilter}
        getValidatedRowFilter={this.getValidatedRowFilter}
        setError={error => {
          this.setState({ error })
        }}
        setAction={newAction => {
          this.setState({ action: newAction });
          if(newAction.success){
            this.setState({ newRow: undefined })
          }
        }}
      />
    </div>

    if (asPopup) {
      const prevNextClass = "smartformprevnext"

      const extraProps: Pick<PopupProps, "onKeyDown" | "headerRightContent"> = !onPrevOrNext? {} : {
        onKeyDown: (e, section)=> {
          if(section !== "header") return;
          
          if(e.key === "ArrowLeft"){
            onPrevOrNext(-1);
          }
          if(e.key === "ArrowRight"){
            onPrevOrNext(1)
          }
        },
        headerRightContent: (<div className={"flex-row mx-1 " + prevNextClass}>
          <Btn iconPath={mdiChevronLeft} disabledInfo={prevNext?.prev === false? "Reached end" : undefined} onClick={({ currentTarget }) => { currentTarget.focus(); onPrevOrNext(-1)}}/>
          <Btn iconPath={mdiChevronRight} disabledInfo={prevNext?.next === false? "Reached end" : undefined} onClick={({ currentTarget }) => { currentTarget.focus(); onPrevOrNext(1) }} />
        </div>)
      }

      return <Popup
        title={headerText}
        subTitle={titleEnd} 
        autoFocusFirst={onPrevOrNext? "header" : "content"}
        {...extraProps}
        // rootStyle={rootPopupStyle}
        contentClassName={`${maxWidth} pt-1`}
        positioning="right-panel"
        onClose={this.onClose}
        clickCatchStyle={{ opacity: .2 }}
        showFullscreenToggle={{
          getStyle: fullscreen => (fullscreen? {} : { maxWidth: "600px" })
        }}
      >
        {renderResult}
      </Popup>
    }

    return renderResult
  }
}

export const getKeys = Object.keys as <T extends object>(obj: T) => Array<keyof T>
