import { mdiChevronLeft, mdiChevronRight, mdiClose } from "@mdi/js";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import { isObject, omitKeys } from "prostgles-types";
import React from "react";
import type {
  DetailedFilterBase,
  SmartGroupFilter,
} from "../../../../commonTypes/filterUtils";
import { sliceText } from "../../../../commonTypes/utils";
import type { Prgl } from "../../App";
import type { Command } from "../../Testing";
import { SuccessMessage } from "../../components/Animations";
import Btn from "../../components/Btn";
import Checkbox from "../../components/Checkbox";
import ErrorComponent from "../../components/ErrorComponent";
import FileInput from "../../components/FileInput/FileInput";
import { classOverride, FlexCol, FlexRow } from "../../components/Flex";
import { Label } from "../../components/Label";
import Loading from "../../components/Loading";
import type { PopupProps } from "../../components/Popup/Popup";
import Popup from "../../components/Popup/Popup";
import { SvgIcon } from "../../components/SvgIcon";
import { filterObj, ifEmpty } from "../../utils";
import type { SmartColumnInfo } from "./SmartFormField/SmartFormField";
import {
  SmartFormField,
  columnIsReadOnly,
} from "./SmartFormField/SmartFormField";
import { SmartFormFieldOptions } from "./SmartFormField/SmartFormFieldOptions";
import { SmartFormFileSection } from "./SmartFormFileSection";
import { SmartFormFooterButtonsV2 } from "./SmartFormFooterButtonsV2";
import { SmartFormUpperFooter } from "./SmartFormUpperFooter";
import { useSmartForm } from "./useSmartForm";

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

export type SmartFormProps = Pick<
  Prgl,
  "db" | "tables" | "methods" | "theme"
> & {
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

export type SmartFormState = {
  /**
   * If this table has dynamic rules and this is an update we will get the dynamic column info.
   *  tables.columns will be used otherwise
   */
  dynamicValidatedColumns?: ValidatedColumnInfo[];
  error?: any;
  newRow?: AnyObject;
  rowFilter?: SmartGroupFilter;
  confirmUpdates?: boolean;
  showLocalChanges?: boolean;
  localChanges: { oldRow: AnyObject; newRow: AnyObject }[];
  errors?: {
    [col_name: string]: string;
  };

  defaultColumnData?: AnyObject;

  /**
   * Referenced table insert
   */
  referencedInsert?: { col: SmartColumnInfo; data?: AnyObject };

  nestedInsertTable?: string;
  searchReferencedRow?: {
    tableName: string;
    fcols: string[];
    col: ValidatedColumnInfo;
  };

  referencedInsertData?: Record<string, any>;

  action: FormAction;
};

export const SmartForm = (props: SmartFormProps) => {
  // export default class SmartForm extends RTComp<SmartFormProps, SmartFormState> {
  // state: SmartFormState = {
  //   error: undefined,
  //   newRow: undefined,
  //   confirmUpdates: undefined,
  //   showLocalChanges: undefined,
  //   rowFilter: undefined,
  //   localChanges: [],
  //   errors: undefined,
  //   defaultColumnData: {},
  //   referencedInsert: undefined,
  //   action: {
  //     type: "view",
  //     dataItemLoaded: false,
  //     initialised: false,
  //   },
  // };

  // get table() {
  //   const { tableName, tables } = this.props;
  //   return tables.find((t) => t.name === tableName);
  // }

  // rowSub?: SubscriptionHandler;
  // rowSubFilterStr?: string;
  // onMount = async () => {
  //   const { tableName, lang, rowFilter, db, tables } = this.props;

  //   const tableHandler = db[tableName];
  //   const table = this.table;
  //   const tableInfo = table?.info;
  //   if (!tableHandler?.getInfo || !tableHandler.getColumns || !tableInfo) {
  //     this.setState({
  //       error:
  //         "Table getInfo/getColumns hooks not available/published: " +
  //         tableName,
  //     });
  //     return;
  //   }

  //   let action: FormAction = {
  //     type: "view",
  //     loading: true,
  //     dataItemLoaded: false,
  //     initialised: true,
  //   };
  //   if (rowFilter && (this.tableHandler.update || this.tableHandler.delete)) {
  //     if (this.props.fixedData) {
  //       this.setState({ newRow: { ...this.props.fixedData } });
  //     }
  //     action = {
  //       type: "update",
  //       isMultiUpdate: !rowFilter.length,
  //       loading: true,
  //       data: {},
  //       dataItemLoaded: false,
  //       initialised: true,
  //     };
  //   } else if (this.tableHandler.insert && !rowFilter) {
  //     action = {
  //       type: "insert",
  //       data: {},
  //       initialised: true,
  //     };
  //   }

  //   let getColParams: Parameters<TableHandlerClient["getColumns"]>[1];
  //   if (action.type === "update") {
  //     getColParams = {
  //       rule: "update",
  //       filter: getSmartGroupFilter(rowFilter),
  //     };
  //   }
  //   const _columns =
  //     !getColParams ?
  //       table.columns
  //     : await tableHandler.getColumns(lang, getColParams);

  //   const invalidColumns =
  //     this.props.columns &&
  //     Object.keys(this.props.columns).filter(
  //       (colName) => !_columns.some((_c) => _c.name === colName),
  //     );
  //   this.setState({
  //     action,
  //     dynamicValidatedColumns: _columns,
  //     error:
  //       invalidColumns?.length ?
  //         "Some requested columns not found in the table: " +
  //         JSON.stringify(invalidColumns)
  //       : undefined,
  //   });
  // };

  // get mediaTableInfo() {
  //   const { includeMedia = true, tables } = this.props;

  //   const tableInfo = this.table?.info;
  //   if (tableInfo?.hasFiles && tableInfo.fileTableName && includeMedia) {
  //     return tables.find((t) => t.info.isFileTable)?.info;
  //   }
  // }

  // onUnmount = async () => {
  //   if (this.rowSub) await this.rowSub.unsubscribe();
  //   // throw "allow ctrl + z to undo"
  // };

  // setReferencedInsertData = (
  //   column: Pick<ValidatedColumnInfo, "is_pkey" | "name">,
  //   newVal: any,
  // ) => {
  //   const { referencedInsertData = {} } = this.state;
  //   this.setState({
  //     errors: undefined,
  //     error: undefined,
  //     referencedInsertData: {
  //       ...referencedInsertData,
  //       [column.name]: newVal,
  //     },
  //   });
  // };

  // closed = false;

  // get tableHandler(): Partial<TableHandlerClient<AnyObject, void>> {
  //   const { db, tableName } = this.props;
  //   const tableHandler = db[tableName];
  //   if (!tableHandler) throw `${tableName} handler missing`;
  //   return tableHandler;
  // }

  // getDisplayedColumns = () => {
  //   const { action } = this.state;
  //   const { hideNonUpdateableColumns = false } = this.props;
  //   if (this.table?.info.isFileTable && action.type === "insert") {
  //     return [];
  //   }

  //   const validatedCols = this.columns.slice(0);
  //   const displayedCols = validatedCols;

  //   return displayedCols.filter(
  //     (c) =>
  //       (action.type === "view" && c.select) ||
  //       (action.type === "update" &&
  //         (c.update || (!hideNonUpdateableColumns && c.select))) ||
  //       (action.type === "insert" && c.insert),
  //   );
  // };

  // render() {
  const {
    tableName,
    onChange,
    label,
    hideChangesOptions = false,
    jsonbSchemaWithControls,
    includeMedia = true,
    asPopup,
    enableInsert = true,
    db,
    tables,
    methods,
    className = "",
    onPrevOrNext,
    prevNext,
    contentClassname,
    theme,
    connection,
    confirmUpdates,
  } = props;

  const state = useSmartForm(props);

  const {
    error,
    errors = {},
    // confirmUpdates = this.props.confirmUpdates ?? false,
    // showLocalChanges = this.props.showLocalChanges ?? true,
    action,
    setNewRow,
  } = state;

  const hideNullBtn = action.type === "view" || props.hideNullBtn;

  const row = state.getThisRow();
  const tableInfo = state.table?.info;

  let fileManagerTop: React.ReactNode = null;
  if (
    state.table &&
    tableInfo?.isFileTable &&
    includeMedia &&
    tableInfo.fileTableName
  ) {
    fileManagerTop = (
      <SmartFormFileSection
        {...props}
        table={state.table}
        setNewRow={setNewRow}
        row={row}
        action={action}
        getThisRow={state.getThisRow}
        setData={state.setColumnData}
        mediaTableInfo={state.mediaTableInfo}
        mediaTableName={tableInfo.fileTableName}
      />
    );
  }

  const maxWidth = "max-w-650" as const;

  if (!tableInfo) {
    return <>Table {tableName} not found.</>;
  }

  const rowFilter = state.getRowFilter();
  const filterKeys =
    rowFilter && "$and" in rowFilter ?
      rowFilter.$and.flatMap((f) => getKeys(f))
    : getKeys(rowFilter ?? {});

  /** Do not show subTitle rowFilter if it's primary key and shows in columns */
  const knownJoinColumns = state.displayedColumns
    .filter((c) => c.is_pkey || c.references)
    .map((c) => c.name);
  const titleEnd =
    rowFilter ?
      filterKeys.every((col) => knownJoinColumns.includes(col)) ?
        undefined
      : sliceText(
          " (" +
            Object.keys(rowFilter)
              .map((k) => `${k}: ${JSON.stringify(rowFilter[k])}`)
              .join(" AND ") +
            ")",
          100,
        )
    : "";

  const headerText =
    label ??
    (action.type === "insert" && action.clonedRow ? "[Cloned row] " : "") +
      (tableInfo.comment || tableName);

  const formHeader =
    asPopup ? null
    : !label && "label" in props ? null
    : headerText ?
      <h4
        className="font-24"
        style={{ margin: 0, padding: "1em", paddingBottom: ".5em" }}
      >
        {headerText}
      </h4>
    : null;

  if (action.dataItemLoaded === false) {
    return null;
  }

  const renderResult = (
    <div
      style={asPopup ? { minWidth: "350px" } : {}}
      data-key={tableName}
      data-command={"SmartForm" satisfies Command}
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
      <div
        className={classOverride(
          "SmartFormContent flex-col f-1 o-auto min-h-0 min-w-0 pb-1 gap-1 px-2",
          contentClassname,
        )}
      >
        {fileManagerTop}
        {state.displayedColumns.map((c, i) => {
          const rawValue = row[c.name];

          const formFieldStyle: React.CSSProperties =
            !c.sectionHeader ? {} : { marginTop: "1em" };

          const refInsertData = state.referencedInsertData[c.name];
          if (refInsertData) {
            if (c.file) {
              return (
                <FileInput
                  key={i}
                  className={
                    "mt-p5 f-0 " + (tableInfo.isFileTable ? "mt-2" : "")
                  }
                  label={c.label}
                  media={[refInsertData]}
                  minSize={470}
                  maxFileCount={1}
                  onAdd={(files) => {
                    state.setReferencedInsertData(c, files[0]);
                  }}
                  onDelete={async (media) => {
                    state.setReferencedInsertData(c, undefined);
                  }}
                />
              );
            }
            return (
              <div
                key={i}
                className="form-field flex-col min-w-0 mt-1"
                style={formFieldStyle}
              >
                <label
                  className=" main-label ta-left noselect text-1p5  pointer "
                  style={{ flex: `0.5 1 0%` }}
                >
                  {c.label}
                </label>
                <div className={"flex-row gap-1 ai-center  f-1"}>
                  <Btn
                    className="mr-auto  bg-color-0"
                    variant="outline"
                    color="action"
                    title="View insert data"
                    onClick={() => {
                      this.setState({
                        referencedInsert: { col: c, data: refInsertData },
                      });
                    }}
                  >
                    New data
                  </Btn>
                  <Btn
                    title="Remove nested insert"
                    iconPath={mdiClose}
                    onClick={() => {
                      this.setReferencedInsertData(c, undefined);
                    }}
                  />
                </div>
              </div>
            );
          }

          if (c.onRender) {
            const columnNode = c.onRender(rawValue, (newVal) =>
              state.setColumnData(c, newVal),
            );
            return (
              <FlexCol key={c.name} style={formFieldStyle} className="gap-p25">
                <Label variant="normal">{c.label}</Label>
                {columnNode}
              </FlexCol>
            );
          }

          return (
            <SmartFormField
              key={i}
              theme={theme}
              tableInfo={tableInfo}
              tables={tables}
              db={db}
              tableName={tableName}
              action={action.type}
              column={c}
              value={rawValue || ""}
              rawValue={rawValue}
              row={row}
              referencedInsertData={state.referencedInsertData}
              jsonbSchemaWithControls={jsonbSchemaWithControls}
              onChange={(newVal) => state.setColumnData(c, newVal)}
              error={
                errors[c.name] ??
                (isObject(error) && error.column === c.name ? error : undefined)
              }
              rightContentAlwaysShow={false}
              rightContent={
                columnIsReadOnly(action.type, c) ? undefined : (
                  <SmartFormFieldOptions
                    {...props}
                    action={action.type}
                    row={row}
                    column={c}
                    tableInfo={tableInfo}
                    enableInsert={enableInsert}
                    jsonbSchemaWithControls={jsonbSchemaWithControls}
                    hideNullBtn={hideNullBtn}
                    referencedInsertData={state.referencedInsertData}
                    setData={state.setColumnData}
                    setReferencedInsertData={state.setReferencedInsertData}
                  />
                )
              }
              hideNullBtn={hideNullBtn}
              sectionHeader={c.sectionHeader}
              style={formFieldStyle}
              variant="column"
            />
          );
        })}
      </div>

      {hideChangesOptions || action.type === "view" ? null : (
        <>
          {onChange || action.type === "insert" ? null : (
            <Checkbox
              label={"Confirm updates"}
              checked={confirmUpdates}
              onChange={({ currentTarget }) => {
                this.setState({ confirmUpdates: currentTarget.checked });
              }}
            />
          )}
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
        {...props}
        columns={state.columns}
        onSetNestedInsertData={(nestedData) => {
          this.setState({
            newRow: {
              ...this.state.newRow,
              ...nestedData,
            },
          });
        }}
        row={row}
        state={this.state}
        table={this.table}
        onRemoveUpdate={(key) => {
          this.setState({
            newRow: filterObj({ ...this.state.newRow }, undefined, [key]),
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
              props.onClose?.(true);
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

      <SmartFormFooterButtonsV2
        tableInfo={tableInfo}
        state={state}
        props={this.props}
        action={action.type}
        columns={state.columns}
        getThisRow={state.getThisRow}
        getErrors={state.getErrors}
        parseError={state.parseError}
        getRowFilter={state.getRowFilter}
        getValidatedRowFilter={state.getValidatedRowFilter}
        setError={(error) => {
          state.setError(error);
        }}
        setAction={(newAction) => {
          this.setState({ action: newAction });
          if (newAction.success) {
            this.setState({ newRow: undefined });
          }
        }}
      />
    </div>
  );

  if (asPopup) {
    const prevNextClass = "smartformprevnext";

    const extraProps: Pick<PopupProps, "onKeyDown" | "headerRightContent"> =
      !onPrevOrNext ?
        {}
      : {
          onKeyDown: (e, section) => {
            if (section !== "header") return;

            if (e.key === "ArrowLeft") {
              onPrevOrNext(-1);
            }
            if (e.key === "ArrowRight") {
              onPrevOrNext(1);
            }
          },
          headerRightContent: (
            <div className={"flex-row mx-1 " + prevNextClass}>
              <Btn
                iconPath={mdiChevronLeft}
                disabledInfo={
                  prevNext?.prev === false ? "Reached end" : undefined
                }
                onClick={({ currentTarget }) => {
                  currentTarget.focus();
                  onPrevOrNext(-1);
                }}
              />
              <Btn
                iconPath={mdiChevronRight}
                disabledInfo={
                  prevNext?.next === false ? "Reached end" : undefined
                }
                onClick={({ currentTarget }) => {
                  currentTarget.focus();
                  onPrevOrNext(1);
                }}
              />
            </div>
          ),
        };

    const onClose = () => {
      props.onClose?.(true);
    };
    return (
      <Popup
        title={
          <FlexRow>
            {connection?.table_options?.[tableName]?.icon && (
              <SvgIcon
                size={34}
                icon={connection!.table_options![tableName]!.icon!}
              />
            )}
            {headerText}
          </FlexRow>
        }
        subTitle={titleEnd}
        autoFocusFirst={onPrevOrNext ? "header" : "content"}
        {...extraProps}
        contentClassName={`${maxWidth} pt-1`}
        positioning="right-panel"
        onClose={onClose}
        clickCatchStyle={{ opacity: 0.2 }}
        showFullscreenToggle={{
          getStyle: (fullscreen) => (fullscreen ? {} : { maxWidth: "600px" }),
        }}
      >
        {renderResult}
      </Popup>
    );
  }

  return renderResult;
};

export const getKeys = Object.keys as <T extends object>(
  obj: T,
) => Array<keyof T>;
