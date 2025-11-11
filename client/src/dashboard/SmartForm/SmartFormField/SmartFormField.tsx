import { mdiDotsHorizontal } from "@mdi/js";
import { isObject, type AnyObject } from "prostgles-types";
import React, { useCallback, useState } from "react";
import Btn from "@components/Btn";
import type { FormFieldProps } from "@components/FormField/FormField";
import FormField from "@components/FormField/FormField";
import { FormFieldCodeEditor } from "@components/FormField/FormFieldCodeEditor";
import { JSONBSchemaA } from "@components/JSONBSchema/JSONBSchema";
import { SvgIcon } from "@components/SvgIcon";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { DBSchemaTableColumn } from "../../Dashboard/dashboardUtils";
import { getPGIntervalAsText } from "../../W_SQL/customRenderers";
import type { ColumnDisplayConfig, SmartFormProps } from "../SmartForm";
import type {
  ColumnData,
  NewRowDataHandler,
} from "../SmartFormNewRowDataHandler";
import { SmartFormFieldFileSection } from "./SmartFormFieldFileSection";
import {
  SmartFormFieldForeignKey,
  type SmartFormFieldForeignKeyProps,
} from "./SmartFormFieldForeignKey";
import {
  SmartFormFieldLinkedData,
  useSmartFormFieldForeignDataState,
} from "./SmartFormFieldLinkedData";
import { getSmartFormFieldRightButtons } from "./SmartFormFieldRightButtons";
import {
  columnIsReadOnly,
  getInputAutocomplete,
  getInputType,
  parseValue,
  tsDataTypeFromUdtName,
} from "./fieldUtils";
import { useSmartFormFieldAsJSON } from "./useSmartFormFieldAsJSON";
import { useSmartFormFieldOnChange } from "./useSmartFormFieldOnChange";
import Loading from "@components/Loader/Loading";

type SmartFormFieldValue =
  | string
  | number
  | {
      data: File;
      name: string;
    }[]
  | null;

export type SmartFormFieldProps = Pick<
  SmartFormProps,
  "db" | "methods" | "tableName" | "jsonbSchemaWithControls"
> & {
  maxWidth?: string;
  value: SmartFormFieldValue | undefined;
  newValue: ColumnData | undefined;
  row: AnyObject | undefined;
  action?: "update" | "insert" | "view";
  loading: boolean | undefined;
  column: SmartColumnInfo;
  style?: React.CSSProperties;
  placeholder?: string;
  multiSelect?: boolean;
  error?: any;
  rightContentAlwaysShow?: boolean;
  rightContent?: React.ReactNode;
  hideNullBtn?: boolean;
  sectionHeader?: string;
  tables: CommonWindowProps["tables"];
  table: CommonWindowProps["tables"][number];
  enableInsert: boolean;
  newRowDataHandler: NewRowDataHandler;
  someColumnsHaveIcons: boolean;
};
export type SmartColumnInfo = DBSchemaTableColumn & ColumnDisplayConfig;

/**
 * Allows displaying and editing a single column from a SmartForm based on table schema and config
 */
export const SmartFormField = (props: SmartFormFieldProps) => {
  const {
    action,
    value,
    placeholder = "",
    multiSelect,
    column,
    hideNullBtn,
    sectionHeader,
    style,
    tableName,
    maxWidth = "100vw",
    db,
    row,
    tables,
    table,
    rightContentAlwaysShow,
    jsonbSchemaWithControls,
    enableInsert,
    newRowDataHandler,
    someColumnsHaveIcons,
    loading,
  } = props;

  const onChange = useCallback(
    (newColData: ColumnData) => {
      newRowDataHandler.setColumnData(column.name, newColData);
    },
    [newRowDataHandler, column.name],
  );

  const { onCheckAndChange, error } = useSmartFormFieldOnChange({
    onChange,
    column,
    table,
  });
  const [showDateInput, setShowDateInput] = useState(true);

  let rightIcons: React.ReactNode = getSmartFormFieldRightButtons({
    ...props,
    onChange: onCheckAndChange,
    showDateInput: {
      value: !!showDateInput,
      onChange: setShowDateInput,
    },
  });
  const [collapsed, setCollapsed] = useState(true);

  const renderAsJSON = useSmartFormFieldAsJSON({
    column,
    tableName,
    jsonbSchemaWithControls,
    value,
  });

  const readOnly = columnIsReadOnly(action, column);
  const foreignDataState = useSmartFormFieldForeignDataState({
    readOnly,
    row,
    column,
    action,
    db,
    enableInsert,
    tables,
  });

  if (readOnly) rightIcons = null;
  let hint = column.hint;
  if (
    !readOnly &&
    column.has_default &&
    column.is_pkey &&
    action === "insert"
  ) {
    hint = hint || "Column has default value. Can leave empty";
    if (collapsed) {
      return (
        <Btn
          className="mt-1"
          title="Expand"
          iconPath={mdiDotsHorizontal}
          onClick={() => {
            setCollapsed(!collapsed);
          }}
        />
      );
    }
  }

  let parsedValue;
  try {
    parsedValue = parseValue(column, value);
  } catch (e: any) {
    parsedValue = value;
  }
  if (readOnly && column.udt_name === "interval" && isObject(value)) {
    parsedValue = getPGIntervalAsText(value);
  }

  let type = getInputType(column).toLowerCase();
  if (type.startsWith("date") && !showDateInput) {
    type = "text";
  }

  let arrayType: FormFieldProps["arrayType"];
  if (column.tsDataType.endsWith("[]") && !column.tsDataType.includes("any")) {
    const elemTSType = tsDataTypeFromUdtName(column.element_udt_name as any);
    arrayType = {
      tsDataType: elemTSType as any,
      udt_name: column.element_udt_name as any,
    };
  }

  const cantUpdate = readOnly && action === "update";

  const ftableIcon =
    column.icon ?? foreignDataState?.insertAndSearchState?.ftableInfo?.icon;

  return (
    <>
      {sectionHeader && (
        <h4
          className="noselect"
          style={{
            marginBottom: "0.5em",
          }}
        >
          {sectionHeader}
        </h4>
      )}
      <FormField
        id={tableName + "-" + column.name}
        data-key={column.name}
        leftIcon={
          ftableIcon ?
            <SvgIcon className="f-0 text-1 mr-p5" icon={ftableIcon} />
          : someColumnsHaveIcons && (
              <div
                className="mt-p25 mr-p5"
                style={{
                  width: "24px",
                  height: "24px",
                }}
              />
            )
        }
        label={column.hideLabel ? "" : column.label}
        labelAsString={column.label || column.name}
        data-command="SmartFormField"
        style={style}
        className={cantUpdate ? " cursor-default " : ""}
        inputClassName={cantUpdate ? " cursor-default " : ""}
        maxWidth={maxWidth}
        inputStyle={{
          minWidth: 0,
          ...(type === "checkbox" ? { padding: "1px" } : {}),
        }}
        asJSON={renderAsJSON?.component}
        showFullScreenToggle={renderAsJSON?.component === "codeEditor"}
        inputContent={
          renderAsJSON?.component === "JSONBSchema" ?
            <JSONBSchemaA
              // className={renderAsJSON.noLabels ? "" : "m-p5"}
              db={db}
              schema={renderAsJSON.jsonbSchema}
              tables={tables}
              {...renderAsJSON.opts}
              value={value}
              onChange={onCheckAndChange}
            />
          : renderAsJSON?.component === "codeEditor" ?
            loading ?
              <Loading />
            : <FormFieldCodeEditor
                asJSON={renderAsJSON}
                value={value}
                onChange={onCheckAndChange}
                readOnly={readOnly}
              />

          : foreignDataState?.showSmartFormFieldForeignKey && (
              <SmartFormFieldForeignKey
                {...foreignDataState}
                key={column.name}
                column={column as SmartFormFieldForeignKeyProps["column"]}
                db={db}
                readOnly={readOnly}
                onChange={onChange}
                tables={tables}
                value={value}
                row={row}
                newRowDataHandler={newRowDataHandler}
                table={table}
              />
            )

        }
        key={column.name}
        placeholder={placeholder}
        type={type}
        autoComplete={getInputAutocomplete(column)}
        value={parsedValue ?? null}
        rawValue={value}
        title={cantUpdate ? "You are not allowed to update this field" : ""}
        asTextArea={
          column.tsDataType === "string" &&
          typeof value === "string" &&
          (value.length > 50 || value.split("\n").length > 1)
        }
        readOnly={readOnly}
        multiSelect={multiSelect}
        onChange={onCheckAndChange}
        error={props.error || error}
        arrayType={arrayType}
        rightIcons={rightIcons}
        rightContent={
          foreignDataState?.insertAndSearchState &&
          action &&
          row && (
            <SmartFormFieldLinkedData
              {...props}
              state={foreignDataState.insertAndSearchState}
              action={action}
              row={row}
              column={column}
              tableInfo={table.info}
              jsonbSchemaWithControls={jsonbSchemaWithControls}
              hideNullBtn={hideNullBtn}
              newRowDataHandler={newRowDataHandler}
              readOnly={readOnly}
            />
          )
        }
        rightContentAlwaysShow={rightContentAlwaysShow}
        labelAsValue={true}
        nullable={column.is_nullable}
        inputProps={{ min: column.min, max: column.max }}
        hint={hint}
        hideClearButton={hideNullBtn}
      />
      {column.file && (
        <SmartFormFieldFileSection
          db={db}
          table={table}
          mediaId={typeof value === "string" ? value : undefined}
        />
      )}
    </>
  );
};
