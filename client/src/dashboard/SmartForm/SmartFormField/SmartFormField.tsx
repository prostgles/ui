import { mdiDotsHorizontal } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import {
  isObject,
  type AnyObject,
  type TableInfo,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../../components/Btn";
import type { FormFieldProps } from "../../../components/FormField/FormField";
import FormField from "../../../components/FormField/FormField";
import type { DBS } from "../../Dashboard/DBS";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import { getPGIntervalAsText } from "../../W_SQL/customRenderers";
import type { ColumnDisplayConfig } from "../SmartForm";
import { SmartFormFieldFileSection } from "./SmartFormFieldFileSection";
import { SmartFormFieldForeignKey } from "./SmartFormFieldForeignKey";
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
import {
  SmartFormFieldLinkedData,
  useSmartFormFieldForeignDataState,
} from "./SmartFormFieldLinkedData";
import type { Prgl } from "../../../App";
import type {
  ColumnData,
  NewRowDataHandler,
} from "../SmartFormNewRowDataHandler";

type SmartFormFieldValue =
  | string
  | number
  | {
      data: File;
      name: string;
    }[]
  | null;

export type SmartFormFieldProps = {
  db: DBHandlerClient;
  methods: Prgl["methods"];
  tableName: string;
  maxWidth?: string;
  value: SmartFormFieldValue | undefined;
  newValue: ColumnData | undefined;
  row?: AnyObject;
  onChange: (newValue: ColumnData) => void;
  action?: "update" | "insert" | "view";
  column: SmartColumnInfo;
  tableInfo: TableInfo;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  placeholder?: string;
  /**
   * If true then will render jsonbSchema columns using controls instead of code editor
   */
  jsonbSchemaWithControls?: boolean;
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
};
export type SmartColumnInfo = ValidatedColumnInfo & ColumnDisplayConfig;

/**
 * Allows displaying and editing a single column from a SmartForm based on table schema and config
 */
export const SmartFormField = (props: SmartFormFieldProps) => {
  const {
    action,
    value,
    inputStyle = {},
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
    onChange,
    tableInfo,
    enableInsert,
    newRowDataHandler,
  } = props;

  const { onCheckAndChange, error } = useSmartFormFieldOnChange({
    onChange,
    column,
    tableInfo,
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

  const asJSONResult = useSmartFormFieldAsJSON({
    column,
    tableName,
    jsonbSchemaWithControls,
    db,
    tables,
    value,
    onCheckAndChange,
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

  if (asJSONResult.type === "component") return asJSONResult.content;

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
        data-command="SmartFormField"
        style={style}
        className={cantUpdate ? " cursor-default " : ""}
        inputClassName={cantUpdate ? " cursor-default " : ""}
        maxWidth={maxWidth}
        inputStyle={{
          ...inputStyle,
          minWidth: 0,
          ...(type === "checkbox" ? { padding: "1px" } : {}),
        }}
        inputContent={
          foreignDataState?.showSmartFormFieldForeignKey && (
            <SmartFormFieldForeignKey
              {...foreignDataState}
              key={column.name}
              column={{ ...column, references: column.references! }}
              db={db}
              readOnly={readOnly}
              onChange={onChange}
              tables={tables}
              value={value}
              row={row}
              tableName={tableName}
              newRowDataHandler={newRowDataHandler}
              tableInfo={tableInfo}
            />
          )
        }
        key={column.name}
        placeholder={placeholder}
        type={type}
        autoComplete={getInputAutocomplete(column)}
        label={column.label}
        value={parsedValue ?? null}
        rawValue={value}
        title={cantUpdate ? "You are not allowed to update this field" : ""}
        asJSON={asJSONResult.asJSON}
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
              tableInfo={tableInfo}
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
