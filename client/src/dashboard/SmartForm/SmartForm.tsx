import { type DetailedFilter } from "@common/filterUtils";
import { SuccessMessage } from "@components/Animations";
import type { BtnProps } from "@components/Btn";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { classOverride } from "@components/Flex";
import type { JSONBSchemaCommonProps } from "@components/JSONBSchema/JSONBSchema";
import Loading from "@components/Loader/Loading";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import { includes, omitKeys } from "prostgles-types";
import React, { useCallback, useState } from "react";
import type { Prgl } from "../../App";
import { ifEmpty } from "../../utils/utils";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import type { JoinedRecordsProps } from "./JoinedRecords/JoinedRecords";
import { SmartFormFieldList } from "./SmartFormFieldList";
import { SmartFormFooterButtons } from "./SmartFormFooter/SmartFormFooterButtons";
import { useSmartFormActions } from "./SmartFormFooter/useSmartFormActions";
import { type NewRowDataHandler } from "./SmartFormNewRowDataHandler";
import { SmartFormPopupWrapper } from "./SmartFormPopup/SmartFormPopupWrapper";
import { SmartFormUpperFooter } from "./SmartFormUpperFooter/SmartFormUpperFooter";
import { useSmartForm, type SmartFormState } from "./useSmartForm";
import { SmartFormViewAsMarkdown } from "./SmartFormPopup/SmartFormViewAsMarkdown";

export type getErrorsHook = (
  cb: (
    newRow: AnyObject,
  ) => Promise<SmartFormState["error"] | void> | SmartFormState["error"] | void,
) => void;

export type GetRefHooks = {
  /**
   * Show custom errors. Will first check against column is_nullable constraint
   */
  getErrors: getErrorsHook;
};

export type GetRefCB = (hooks: GetRefHooks) => void;

export type ColumnDisplayConfig = {
  hideLabel?: boolean;
  sectionHeader?: string;
  onRender?: (value: any, setValue: (newValue: any) => void) => React.ReactNode;
};

export type SmartFormProps = Pick<Prgl, "db" | "tables" | "methods" | "sql"> & {
  tableName: string;

  label?: string;
  /**
   * Executed after the rowFilter data was fetched
   */
  onLoaded?: VoidFunction;
  onChange?: (newRow: AnyObject) => void;

  rowFilter?: DetailedFilter[];
  /**
   * If true will not "Update" button in bottom bar and changes will be applied immediately
   */
  confirmUpdates?: boolean;
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

  asPopup?: boolean;

  onInserted?: (newRow: AnyObject | AnyObject[]) => void;
  onBeforeInsert?: (newRow: AnyObject | AnyObject[]) => void;

  enableInsert?: boolean;
  insertBtnText?: string;
  hideNullBtn?: boolean;

  /**
   * If truthy then will render jsonbSchema columns using controls instead of code editor
   */
  jsonbSchemaWithControls?:
    | boolean
    | Partial<
        Pick<JSONBSchemaCommonProps, "schemaStyles" | "tables" | "noLabels">
      >;

  /**
   * Fired after a successful update/insert
   */
  onSuccess?: (
    action: "insert" | "update" | "delete",
    newData?: AnyObject,
  ) => void;

  className?: string;

  showJoinedTables?: boolean | JoinedRecordsProps["tablesToShow"];

  disabledActions?: ("update" | "delete" | "clone")[];

  hideNonUpdateableColumns?: boolean;

  /**
   * Data used in insert or update mode that the user can't overwrite
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

  /**
   * Allows inserting nested data.
   *
   * There are 3 cases where this is used:
   * 1. parentForm column is a fkey column to this tableName ("nested-column" OR "nested-file-column")
   * 2. parentForm is referenced by this tableName ("nested-table")
   *
   * There are 2 modes this is handled:
   * a. update mode (parentForm.rowFilter is defined)
   * b. insert mode (parentForm.rowFilter is undefined)
   *
   * Cases:
   * .1.a -> insert data then update parentForm.column
   * .1.b -> pass data to parent form
   * .2.a -> insert data with fkey columns set to appropriate values from parentForm.row
   * .2.b -> pass data to parent form
   *
   * onSuccess must be defined to close this child form
   */
  parentForm?: {
    table: DBSchemaTablesWJoins[number];
    parentForm?: SmartFormProps["parentForm"];
  } & (
    | {
        type: "insert";
        newRowDataHandler: NewRowDataHandler | undefined;
        setColumnData: (newData: NewRowDataHandler) => void;
      }
    | {
        type: "insert-and-update";
        row: AnyObject;
        column: ValidatedColumnInfo;
        rowFilter: SmartFormProps["rowFilter"];
      }
  );
} & SmartFormColumnConfig;

type SmartFormColumnConfig =
  | {
      columns?: Record<string, 1 | ColumnDisplayConfig>;
      columnFilter?: never;
    }
  | {
      columnFilter?: (c: ValidatedColumnInfo) => boolean;
      columns?: never;
    };

export const SmartForm = (props: SmartFormProps) => {
  const { tableName } = props;
  const stateOrError = useSmartForm(props);
  const { mode, error, table } = stateOrError;
  const tableInfo = table?.info;

  if (!tableInfo) {
    return <>Table {tableName} not found.</>;
  }

  if (!mode) {
    return <> {error || "Mode missing"}</>;
  }

  const state: SmartFormState = {
    ...stateOrError,
    table,
    mode,
  };

  return <SmartFormWithNoError props={props} state={state} />;
};

const SmartFormWithNoError = ({
  props,
  state,
}: {
  props: SmartFormProps;
  state: SmartFormState;
}) => {
  const { tableName, label, asPopup, className = "", onClose } = props;
  const [showAsMarkdown, setShowAsMarkdown] = useState(false);

  const { mode, displayedColumns, errors, error, table, loading } = state;
  const tableInfo = table.info;

  const isLoading = loading || ("loading" in mode ? mode.loading : false);
  const headerFromCardConfig =
    (
      table.card?.headerColumn &&
      "currentRow" in mode &&
      mode.currentRow &&
      table.card.headerColumn in mode.currentRow
    ) ?
      (mode.currentRow[table.card.headerColumn] as string)
    : undefined;
  const headerText =
    label ??
    (headerFromCardConfig || table.label || tableInfo.comment || tableName);

  const formHeader =
    asPopup ? null
    : !label && "label" in props ? null
    : headerText ?
      <h4
        className="font-24"
        style={{
          margin: 0,
          padding: "1em",
          paddingBottom: ".5em",
        }}
      >
        {headerText}
      </h4>
    : null;

  const onCloseWrapped = useCallback(() => {
    onClose?.(true);
  }, [onClose]);

  const actionsState = useSmartFormActions({
    ...props,
    ...state,
  });
  const { successMessage, setSuccessMessage } = actionsState;

  const maxWidth = "max-w-650" as const;

  return (
    <SmartFormPopupWrapper
      {...props}
      table={table}
      onClose={onCloseWrapped}
      maxWidth={maxWidth}
      displayedColumns={displayedColumns}
      headerText={headerText}
      rowFilterObj={"rowFilterObj" in mode ? mode.rowFilterObj : undefined}
      showAsMarkdown={showAsMarkdown}
      setShowAsMarkdown={setShowAsMarkdown}
    >
      <div
        data-command={isLoading ? undefined : "SmartForm"}
        data-key={tableName}
        aria-disabled={isLoading}
        style={asPopup ? { minWidth: "350px" } : {}}
        className={classOverride(
          "SmartForm " +
            (asPopup ? "" : maxWidth) +
            " fade-in flex-col f-1 min-h-0 relative " +
            (isLoading ? " no-pointer-events noselect " : " "),
          className,
        )}
      >
        {isLoading && <Loading variant="cover" />}

        {formHeader}
        {showAsMarkdown ?
          <SmartFormViewAsMarkdown
            displayedColumns={state.displayedColumns}
            currentRow={
              state.mode.type === "view" || state.mode.type === "update" ?
                state.mode.currentRow
              : undefined
            }
          />
        : <SmartFormFieldList {...props} {...state} />}

        <SmartFormUpperFooter {...props} {...state} />

        <ErrorComponent
          className="f-0 b rounded"
          style={{ flex: "none", padding: "1em" }}
          withIcon={true}
          error={
            error ||
            ifEmpty(
              omitKeys(
                errors,
                displayedColumns.map((c) => c.name),
              ),
              undefined,
            )
          }
        />
        {successMessage && !error && (
          <SuccessMessage
            message={`${successMessage}!`}
            duration={{
              millis: 2e3,
              onEnd: () => {
                onCloseWrapped();
                setSuccessMessage(undefined);
              },
            }}
            className="w-full h-full bg-color-0"
            style={{ position: "absolute", zIndex: 222 }}
          />
        )}

        <SmartFormFooterButtons {...props} {...state} {...actionsState} />
      </div>
    </SmartFormPopupWrapper>
  );
};

export const SmartFormPopup = ({
  triggerButton,
  ...smartFormProps
}: SmartFormProps & {
  triggerButton: Pick<
    BtnProps,
    | "label"
    | "children"
    | "iconPath"
    | "color"
    | "variant"
    | "title"
    | "style"
    | "className"
  >;
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement>();
  return (
    <>
      <Btn
        {...triggerButton}
        onClick={(e) => {
          setAnchorEl(e.currentTarget);
        }}
      />
      {anchorEl && (
        <SmartForm
          {...smartFormProps}
          onClose={(e) => {
            setAnchorEl(undefined);
            smartFormProps.onClose?.(e);
          }}
        />
      )}
    </>
  );
};
