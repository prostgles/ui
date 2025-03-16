import { quickClone } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type {
  AnyObject,
  ProstglesError,
  SubscriptionHandler,
  ValidatedColumnInfo,
} from "prostgles-types";
import { getKeys, isEmpty, isObject, omitKeys } from "prostgles-types";
import React from "react";
import {
  getSmartGroupFilter,
  type DetailedFilterBase,
  type SmartGroupFilter,
} from "../../../../commonTypes/filterUtils";
import type { Prgl } from "../../App";
import type { Command } from "../../Testing";
import { SuccessMessage } from "../../components/Animations";
import Checkbox from "../../components/Checkbox";
import ErrorComponent from "../../components/ErrorComponent";
import { classOverride } from "../../components/Flex";
import Loading from "../../components/Loading";
import { filterObj, ifEmpty, isDefined } from "../../utils";
import RTComp from "../RTComp";
import type { SmartColumnInfo } from "./SmartFormField/SmartFormField";
import { parseDefaultValue } from "./SmartFormField/fieldUtils";
import { SmartFormFieldList } from "./SmartFormFieldList";
import { SmartFormFooterButtons } from "./SmartFormFooterButtons";
import { SmartFormPopup } from "./SmartFormPopup/SmartFormPopup";
import { SmartFormUpperFooter } from "./SmartFormUpperFooter";
import type { Media } from "../../components/FileInput/FileInput";

export type getErrorsHook = (
  cb: (newRow: AnyObject) => SmartFormState["error"] | undefined,
) => void;

export type GetRefHooks = {
  /**
   * Show custom errors. Will first check against column is_nullable constraint
   */
  getErrors: getErrorsHook;
};

export type GetRefCB = (hooks: GetRefHooks) => void;

export type ColumnDisplayConfig = {
  sectionHeader?: string;
  onRender?: (value: any, setValue: (newValue: any) => void) => React.ReactNode;
};

export type SmartFormProps = Pick<Prgl, "db" | "tables" | "methods"> & {
  tableName: string;
  connection?: Prgl["connection"];

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
   * Used for i18n
   */
  lang?: string;

  /**
   *
   */
  getRef?: GetRefCB;

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
  jsonbSchemaWithControls?: boolean;

  /**
   * Fired after a successful update/insert
   */
  onSuccess?: (
    action: "insert" | "update" | "delete",
    newData?: AnyObject,
  ) => void;

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
  };

  noRealtime?: boolean;
  contentClassname?: string;

  /** If defined then this insert was triggered from a SmartForm tableName that references this table */
  isReferencedInsert?: {
    tableName: string;
    columnName: string;
    pkeyColumns: string[];
    row: AnyObject;
  };
} & (
    | {
        columns?: Record<string, 1 | ColumnDisplayConfig>;
        columnFilter?: never;
        //(string | { name: string; sectionHeader?: string })[];
      }
    | {
        columnFilter?: (c: ValidatedColumnInfo) => boolean;
        columns?: never;
      }
  );

export type Unpromise<T extends Promise<any>> =
  T extends Promise<infer U> ? U : never;

type FormActionCommon = {
  currentRow?: AnyObject;
  success?: string;
  dataItemLoaded?: boolean;
  loading?: boolean;
  /**
   * Used to indicate that getData can start
   */
  initialised: boolean;
};

export type FormAction = FormActionCommon &
  (
    | {
        type: "view";
      }
    | {
        type: "update";
        /**
         * New data
         */
        isMultiUpdate: boolean;
        data?: AnyObject;
      }
    | {
        type: "insert";
        data: AnyObject;
        clonedRow?: AnyObject;
      }
  );

export type ColumnData =
  | {
      type: "column";
      value: any;
    }
  | {
      /**
       * Added from the fkey column
       */
      type: "nested-column";
      value: AnyObject | undefined;
    }
  | {
      /**
       * References the file table
       */
      type: "nested-file-column";
      value: Media | undefined;
    }
  | {
      /**
       * Added from the JoinedRecords
       */
      type: "nested-table";
      value: AnyObject[];
    };

export type SmartFormState = {
  /**
   * If this table has dynamic rules and this is an update we will get the dynamic column info.
   *  tables.columns will be used otherwise
   */
  dynamicValidatedColumns?: ValidatedColumnInfo[];
  error?: any;
  newRowData?: Record<string, ColumnData>;
  rowFilter?: SmartGroupFilter;
  confirmUpdates?: boolean;
  showLocalChanges?: boolean;
  localChanges: { oldRow: AnyObject; newRow: AnyObject }[];
  errors?: {
    [col_name: string]: string;
  };

  defaultColumnData?: AnyObject;

  /**
   * Records added from JoinedRecords
   */
  // nestedInsertData?: Record<string, AnyObject[]>;

  nestedInsertTable?: string;
  searchReferencedRow?: {
    tableName: string;
    fcols: string[];
    col: ValidatedColumnInfo;
  };

  referencedInsertShowFormForColumn?: string;
  action: FormAction;
};

export default class SmartForm extends RTComp<SmartFormProps, SmartFormState> {
  state: SmartFormState = {
    error: undefined,
    confirmUpdates: undefined,
    showLocalChanges: undefined,
    rowFilter: undefined,
    localChanges: [],
    errors: undefined,
    defaultColumnData: {},
    action: {
      type: "view",
      dataItemLoaded: false,
      initialised: false,
    },
  };

  get table() {
    const { tableName, tables } = this.props;
    return tables.find((t) => t.name === tableName);
  }

  rowSub?: SubscriptionHandler;
  rowSubFilterStr?: string;
  onMount = async () => {
    const { tableName, lang, rowFilter, db, fixedData } = this.props;

    const tableHandler = db[tableName];
    const table = this.table;
    const tableInfo = table?.info;
    if (!tableHandler?.getInfo || !tableHandler.getColumns || !tableInfo) {
      this.setState({
        error:
          "Table getInfo/getColumns hooks not available/published: " +
          tableName,
      });
      return;
    }

    let action: FormAction = {
      type: "view",
      loading: true,
      dataItemLoaded: false,
      initialised: true,
    };
    if (rowFilter && (this.tableHandler.update || this.tableHandler.delete)) {
      if (this.props.fixedData) {
        // this.setState({ newRow: { ...this.props.fixedData } });
        this.setState({
          newRowData: Object.fromEntries(
            Object.entries(fixedData ?? {}).map(([key, value]) => [
              key,
              { type: "column", value },
            ]),
          ),
        });
      }
      action = {
        type: "update",
        isMultiUpdate: !rowFilter.length,
        loading: true,
        data: {},
        dataItemLoaded: false,
        initialised: true,
      };
    } else if (this.tableHandler.insert && !rowFilter) {
      action = {
        type: "insert",
        data: {},
        initialised: true,
      };
    }

    let getColParams: Parameters<TableHandlerClient["getColumns"]>[1];
    if (action.type === "update") {
      getColParams = {
        rule: "update",
        filter: getSmartGroupFilter(rowFilter),
      };
    }
    const _columns =
      !getColParams ?
        table.columns
      : await tableHandler.getColumns(lang, getColParams);

    const invalidColumns =
      this.props.columns &&
      Object.keys(this.props.columns).filter(
        (colName) => !_columns.some((_c) => _c.name === colName),
      );
    this.setState({
      action,
      dynamicValidatedColumns: _columns,
      error:
        invalidColumns?.length ?
          "Some requested columns not found in the table: " +
          JSON.stringify(invalidColumns)
        : undefined,
    });
  };

  get defaultColumnData() {
    const { rowFilter } = this.props;
    const defaultColumnData = {};
    if (!rowFilter) {
      this.columns.forEach((c) => {
        defaultColumnData[c.name] = parseDefaultValue(c, undefined, false);
      });
    }

    return defaultColumnData;
  }

  get newRow() {
    return Object.fromEntries(
      Object.entries(this.state.newRowData ?? {}).map(([key, { value }]) => [
        key,
        value,
      ]),
    );
  }

  getErrors: getErrorsHook = async (cb) => {
    const {
      defaultData = {},
      rowFilter,
      cannotBeNullMessage = "Must not be empty",
    } = this.props;
    const {
      // newRow = {},
      defaultColumnData = {},
    } = this.state;
    let data = {
      ...defaultColumnData,
      ...defaultData,
      ...this.newRow,
    };
    let _errors: AnyObject | undefined;

    const { columns, table } = this;
    const tableInfo = table?.info;

    this.getDisplayedColumns()
      .filter((c) => c.insert || c.update)
      .forEach((c) => {
        const val = data[c.name];

        /* Check against not null rules */
        if (!c.is_nullable) {
          const isNull = (v) => [undefined, null].includes(v);

          const willInsertMedia =
            tableInfo?.hasFiles &&
            tableInfo.fileTableName &&
            c.references?.some((r) => r.ftable === tableInfo.fileTableName) &&
            data[tableInfo.fileTableName]?.length;
          if (
            /* If it's an insert then ensure all non nullable cols are filled */
            (!rowFilter && isNull(val) && !c.has_default && !willInsertMedia) ||
            /* If update then ensure not updating non nullable with null  */
            val === null
          ) {
            _errors ??= {};
            _errors[c.name] = cannotBeNullMessage;
          }
        }

        /** Ensure json fields are not string */
        if (c.udt_name.startsWith("json") && typeof val === "string") {
          try {
            data = {
              ...data,
              [c.name]: JSON.parse(val),
            };
          } catch (error) {
            _errors ??= {};
            _errors[c.name] = "Must be a valid json";
          }
        }
      });

    if (!_errors) {
      let verr;
      if (this.props.onValidateValue) {
        await Promise.all(
          columns.map(async (c) => {
            const err = await this.props.onValidateValue?.(
              data[c.name],
              data,
              c,
            );
            if (err) {
              verr = verr || {};
              verr = { ...verr, [c.name]: err };
            }
          }),
        );
      } else if (this.props.onValidate) {
        verr = await this.props.onValidate(data, columns);
      }
      const errors = verr || (await cb(data));

      if (errors && !isEmpty(errors)) {
        this.setState({ errors });
      }
    } else {
      this.setState({ errors: _errors });
    }
  };

  onDelta = async (
    dP?: Partial<SmartFormProps>,
    dS?: Partial<SmartFormState>,
  ) => {
    const { tableName, db, getRef } = this.props;
    const { action } = this.state;

    if (getRef) {
      getRef({ getErrors: this.getErrors });
    }

    const rowFilter = this.getRowFilter();
    if (
      action.initialised &&
      (action.type === "view" || action.type === "update") &&
      (dS?.action || dP?.rowFilter || dS?.rowFilter) &&
      this.rowSubFilterStr !== JSON.stringify(rowFilter || "")
    ) {
      this.rowSubFilterStr = JSON.stringify(rowFilter || "");
      await this.rowSub?.unsubscribe();
      if (!this.props.rowFilter?.length || !rowFilter) {
        this.setState({
          action: {
            ...this.state.action,
            loading: false,
            dataItemLoaded: true,
          },
        });
        return;
      }

      const tableHandler = db[tableName];

      const findAndSetRow = async () => {
        const select = await this.getSelect();
        const currentRow = await tableHandler?.findOne?.(rowFilter, { select });
        const newAction = {
          ...this.state.action,
          loading: false,
          currentRow,
          dataItemLoaded: true,
        };

        this.setState(
          {
            action: newAction,
          },
          () => {
            this.props.onLoaded?.();
          },
        );
      };

      if (tableHandler?.subscribeOne && !this.props.noRealtime) {
        try {
          const findParams = { select: await this.getSelect() };
          /** validate find args */
          await findAndSetRow();
          this.rowSub = await tableHandler.subscribeOne(
            rowFilter,
            findParams,
            (currentRow) => {
              if (currentRow) {
                this.setState({
                  action: {
                    ...this.state.action,
                    loading: false,
                    currentRow,
                    dataItemLoaded: true,
                  },
                });
              }
            },
          );
        } catch (error) {
          console.error("Could not subscribe", {
            tableName,
            rowFilter,
            error,
            select: await this.getSelect(),
          });
          findAndSetRow();
        }
      } else {
        findAndSetRow();
      }
    }
  };

  onUnmount = async () => {
    if (this.rowSub) await this.rowSub.unsubscribe();
  };

  getSelect = async () => {
    const { tableName, db } = this.props;
    const tableInfo = this.table?.info;
    const select = { $rowhash: 1, "*": 1 } as const;

    if (
      tableInfo?.fileTableName &&
      tableInfo.fileTableName !== tableName &&
      tableInfo.hasFiles &&
      db[tableInfo.fileTableName]?.find
    ) {
      select[tableInfo.fileTableName] = "*";
    }
    return select;
  };

  getRowFilter = (): AnyObject | undefined => {
    const f = this.state.rowFilter || this.props.rowFilter;
    if (!f) return undefined;
    return getSmartGroupFilter(f);
  };

  getRow = async () => {
    const { tableName, db } = this.props;
    return db[tableName]?.find?.(this.getRowFilter(), {
      select: await this.getSelect(),
    });
  };

  getValidatedRowFilter = async () => {
    const rowFilter = this.getRowFilter();
    // const f = { $rowhash: rowFilter.$rowhash };
    const rws = await this.getRow();

    // if(rws.length === 1 && !Object.keys(currentRow).find(key => currentRow[key] !== rws[0][key] ) ){
    return rowFilter;
    // } else {
    //     throw "Row has since changed. Could not update"
    // }
  };

  setColumnData = async (
    column: Pick<ValidatedColumnInfo, "is_pkey" | "name" | "tsDataType">,
    newColumnData: ColumnData,
  ) => {
    const { db, tableName, rowFilter, onChange, onSuccess } = this.props;

    const {
      localChanges,
      confirmUpdates = this.props.confirmUpdates ?? false,
      errors,
      action,
    } = this.state;

    const { currentRow = {} } = action;

    const newRowData = {
      ...this.state.newRowData,
      [column.name]: newColumnData,
    };
    const oldRow = Object.keys(newRowData)
      .filter((key) => newRowData[key]?.type === "column")
      .reduce(
        (a, key) => ({
          ...a,
          [key]: currentRow[key],
        }),
        {},
      );
    let newState: Pick<SmartFormState, "rowFilter" | "newRowData" | "errors"> =
      {};

    if (action.type === "update") {
      getKeys(newRowData).forEach((key) => {
        /* Remove updates that change nothing */
        if (
          newRowData[key]?.type === "column" &&
          newRowData[key].value === currentRow[key] &&
          key in currentRow
        ) {
          delete newRowData[key];
        }
      });
    }

    /* Remove empty updates */
    if (
      newRowData[column.name]?.type === "column" &&
      newRowData[column.name]?.value === "" &&
      column.tsDataType !== "string"
    ) {
      delete newRowData[column.name];
    }

    if (!onChange && rowFilter && !confirmUpdates) {
      try {
        const f = await this.getValidatedRowFilter();
        if (!f) throw "No update filter provided";
        if (newColumnData.type !== "column") {
          throw "Cannot update nested data";
        }
        const newRow = await db[tableName]?.update?.(
          f,
          { [column.name]: newColumnData.value },
          { returning: "*" },
        );
        onSuccess?.("update", newRow as any);
      } catch (_e: any) {
        this.parseError(_e);
        return;
      }
    } else {
      newState = { ...newState, newRowData };
    }

    /** Update rowFilter to ensure the record does not dissapear after updating */
    if (
      !confirmUpdates &&
      rowFilter &&
      column.is_pkey &&
      rowFilter.find((f) => f.fieldName === column.name)
    ) {
      newState = {
        ...newState,
        rowFilter: rowFilter.map((f) =>
          f.fieldName === column.name ?
            { ...f, value: newColumnData.value }
          : f,
        ),
      };
    }
    onChange?.(getNewRow(newRowData));

    let _errors;
    if (errors) {
      _errors = { ...errors };
      delete _errors[column.name];
      newState = {
        ...newState,
        errors: _errors,
      };
    }

    this.setState({
      ...newState,
      error: undefined,
      localChanges: localChanges
        .slice(0)
        .concat([{ oldRow, newRow: getNewRow(newRowData) }]),
    });
  };

  closed = false;
  onClose = () => {
    const { onClose } = this.props;
    onClose?.(true);
  };

  getThisRow = (): AnyObject => {
    const { defaultColumnData = {}, action } = this.state;
    const { defaultData = {}, fixedData } = this.props;

    return action.type === "insert" ?
        {
          ...this.defaultColumnData,
          ...defaultData,
          ...action.clonedRow,
          ...this.newRow,
          ...fixedData,
        }
      : {
          ...action.currentRow,
          ...defaultColumnData,
          ...defaultData,
          ...this.newRow,
          ...fixedData,
        };
  };

  parseError = (error: ProstglesError) => {
    let errState: Pick<SmartFormState, "error" | "errors"> = {
      error:
        typeof error === "string" ? error : (
          (error.table ? `${error.table}: ` : "") +
          (error.message || error.txt || (error as any).detail)
        ),
    };
    if (isObject(error) && error.code === "23503" && error.table) {
      console.log(error);
      errState = {
        error:
          error.detail ||
          `Table ${error.table} has rows that reference this record (foreign_key_violation)\n\n${error.message || ""}`,
      };
    } else if (Object.keys(error).length && error.constraint) {
      let cols: string[] = [];
      const errors = {};
      if (error.columns) {
        cols = error.columns;
      } else if (error.column) {
        cols = [error.column];
      }
      cols.forEach((c) => {
        if (this.columns.find((col) => col.name === c)) {
          let message = error.constraint;
          if (error.code_info === "unique_violation") {
            message = "Value already exists. \nConstraint: " + error.constraint;
          }
          errors[c] = message;
        }
      });
      if (Object.keys(errors).length) {
        errState = { errors, error: error.message || error.detail };
      }
    }

    this.setState({
      ...(errState as any),
      action: { ...this.state.action, loading: false },
    });
  };

  get tableHandler(): Partial<TableHandlerClient<AnyObject, void>> {
    const { db, tableName } = this.props;
    const tableHandler = db[tableName];
    if (!tableHandler) throw `${tableName} handler missing`;
    return tableHandler;
  }

  get columns(): (ValidatedColumnInfo & ColumnDisplayConfig)[] {
    const { fixedData } = this.props;
    let validatedCols = quickClone(
      this.state.dynamicValidatedColumns || this.table?.columns || [],
    );
    if (fixedData) {
      const fixedFields = getKeys(fixedData);
      validatedCols = validatedCols.map((c) => ({
        ...c,
        insert: fixedFields.includes(c.name) ? false : c.insert,
      }));
    }
    let displayedCols = validatedCols as SmartColumnInfo[];

    if (this.props.columns) {
      const { columns } = this.props;

      /** Add headers */
      displayedCols = Object.entries(columns)
        .map(([colName, colConf]) => {
          if (colConf === 1) {
            return validatedCols.find((c) => c.name === colName);
          } else {
            const ec = validatedCols.find((c) => c.name === colName);
            if (!ec) return undefined;

            return { ...ec, ...colConf };
          }
        })
        .filter(isDefined);
    } else if (this.props.columnFilter) {
      const { columnFilter } = this.props;
      displayedCols = displayedCols.filter(columnFilter);
    }

    if (
      this.state.action.type === "update" &&
      this.state.action.isMultiUpdate
    ) {
      displayedCols = displayedCols.filter((c) => c.update);
    }

    return displayedCols;
  }

  getDisplayedColumns = () => {
    const { action } = this.state;
    const { hideNonUpdateableColumns = false } = this.props;
    if (this.table?.info.isFileTable && action.type === "insert") {
      return [];
    }

    const validatedCols = this.columns.slice(0);
    const displayedCols = validatedCols;

    return displayedCols.filter(
      (c) =>
        (action.type === "view" && c.select) ||
        (action.type === "update" &&
          (c.update || (!hideNonUpdateableColumns && c.select))) ||
        (action.type === "insert" && c.insert),
    );
  };

  render() {
    const {
      tableName,
      onChange,
      label,
      hideChangesOptions = false,
      asPopup,
      className = "",
    } = this.props;

    const {
      error,
      errors = {},
      confirmUpdates = this.props.confirmUpdates ?? false,
      showLocalChanges = this.props.showLocalChanges ?? true,
      action,
    } = this.state;

    const row = this.getThisRow();
    const tableInfo = this.table?.info;

    if (!tableInfo) {
      return <>Table {tableName} not found.</>;
    }
    if (action.dataItemLoaded === false) {
      return null;
    }

    const headerText =
      label ??
      (action.type === "insert" && action.clonedRow ? "[Cloned row] " : "") +
        (tableInfo.comment || tableName);

    const formHeader =
      asPopup ? null
      : !label && "label" in this.props ? null
      : headerText ?
        <h4
          className="font-24"
          style={{ margin: 0, padding: "1em", paddingBottom: ".5em" }}
        >
          {headerText}
        </h4>
      : null;

    const maxWidth = "max-w-650" as const;
    const renderResult = (
      <div
        data-command={"SmartForm" satisfies Command}
        data-key={tableName}
        style={asPopup ? { minWidth: "350px" } : {}}
        className={classOverride(
          "SmartForm " +
            (asPopup ? "" : maxWidth) +
            " fade-in flex-col f-1 min-h-0 relative " +
            (action.loading ? " no-pointer-events noselect " : " "),
          className,
        )}
      >
        {action.loading && <Loading variant="cover" />}

        {formHeader}
        <SmartFormFieldList
          {...this.props}
          displayedColumns={this.getDisplayedColumns()}
          action={action}
          row={row}
          table={this.table}
          setColumnData={this.setColumnData}
          errors={errors}
          error={error}
          newRowData={this.state.newRowData}
          setNewRowData={(newRowData) => {
            this.setState({ newRowData });
          }}
        />

        {hideChangesOptions || action.type === "view" ? null : (
          <>
            {/* {onChange || action.type === "insert" ? null : (
              <Checkbox
                label={"Confirm updates"}
                checked={confirmUpdates}
                onChange={({ currentTarget }) => {
                  this.setState({ confirmUpdates: currentTarget.checked });
                }}
              />
            )} */}
            {onChange ? null : (
              <Checkbox
                label={"Show local changes"}
                checked={showLocalChanges}
                onChange={({ currentTarget }) => {
                  this.setState({ showLocalChanges: currentTarget.checked });
                }}
              />
            )}
          </>
        )}

        <SmartFormUpperFooter
          {...this.props}
          columns={this.columns}
          onSetNestedInsertData={(tableName, newData) => {
            const newRowData = omitKeys(this.state.newRowData ?? {}, [
              tableName,
            ]);
            this.setState({
              newRowData: {
                ...newRowData,
                [tableName]: { type: "nested-table", value: newData },
              },
            });
          }}
          row={row}
          state={this.state}
          table={this.table}
          onRemoveUpdate={(key) => {
            this.setState({
              newRowData: filterObj({ ...this.state.newRowData }, undefined, [
                key,
              ]),
            });
          }}
        />

        <ErrorComponent
          className="f-0 b rounded"
          style={{ flex: "none", padding: "1em" }}
          withIcon={true}
          error={
            error ||
            ifEmpty(
              omitKeys(
                errors,
                this.getDisplayedColumns().map((c) => c.name),
              ),
              undefined,
            )
          }
        />
        {action.success && !error ?
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
                  },
                });
              },
            }}
            className="w-full h-full bg-color-0"
            style={{ position: "absolute", zIndex: 222 }}
          />
        : null}

        <SmartFormFooterButtons
          tableInfo={tableInfo}
          state={this.state}
          props={this.props}
          action={action.type}
          columns={this.columns}
          getThisRow={this.getThisRow}
          getErrors={this.getErrors}
          parseError={this.parseError}
          getRowFilter={this.getRowFilter}
          getValidatedRowFilter={this.getValidatedRowFilter}
          setError={(error) => {
            this.setState({ error });
          }}
          setAction={(newAction) => {
            this.setState({ action: newAction });
            if (newAction.success) {
              this.setState({ newRowData: undefined });
            }
          }}
        />
      </div>
    );

    if (asPopup) {
      return (
        <SmartFormPopup
          {...this.props}
          onClose={this.onClose}
          maxWidth={maxWidth}
          displayedColumns={this.getDisplayedColumns()}
          headerText={headerText}
          rowFilterObj={this.getRowFilter()}
        >
          {renderResult}
        </SmartFormPopup>
      );
    }

    return renderResult;
  }
}

export const getNewRow = <
  NewRowData extends SmartFormState["newRowData"] | undefined,
>(
  newRowData: NewRowData,
): NewRowData extends AnyObject ? AnyObject : undefined =>
  newRowData &&
  (Object.fromEntries(
    Object.entries(newRowData).map(([key, { value }]) => [key, value]),
  ) as any);
