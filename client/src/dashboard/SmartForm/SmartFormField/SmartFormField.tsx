import { mdiDotsHorizontal } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type {
  AnyObject,
  TableInfo,
  ValidatedColumnInfo,
} from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../../components/Btn";
import type { FormFieldProps } from "../../../components/FormField/FormField";
import FormField from "../../../components/FormField/FormField";
import type { DBS } from "../../Dashboard/DBS";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import { renderInterval } from "../../W_SQL/customRenderers";
import type { ColumnDisplayConfig } from "../SmartForm";
import { SmartFormFieldFileSection } from "../SmartFormFieldFileSection";
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

type SmartFormFieldValue =
  | string
  | number
  | {
      data: File;
      name: string;
    }[]
  | null;

export type SmartFormFieldProps = {
  id?: string;
  db: DBHandlerClient | DBS;
  tableName: string;
  maxWidth?: string;
  value?: SmartFormFieldValue;
  row?: AnyObject;
  rawValue?: any;
  onChange?: (newValue: SmartFormFieldValue) => void;
  action?: "update" | "insert" | "view";
  column: ValidatedColumnInfo;
  tableInfo: TableInfo;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  placeholder?: string;
  variant?: "compact" | "column";
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
};

export type SmartColumnInfo = ValidatedColumnInfo & ColumnDisplayConfig;

export const SmartFormField = (props: SmartFormFieldProps) => {
  const {
    action,
    value,
    inputStyle = {},
    placeholder = "",
    variant,
    multiSelect,
    column,
    rightContent,
    hideNullBtn,
    sectionHeader,
    style,
    tableName,
    maxWidth = "100vw",
    db,
    tables,
    rightContentAlwaysShow,
  } = props;

  const { onCheckAndChange, error } = useSmartFormFieldOnChange(props);
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

  const asJSONResult = useSmartFormFieldAsJSON({ ...props, onCheckAndChange });
  if (asJSONResult.type === "component") return asJSONResult.content;

  const readOnly = columnIsReadOnly(action, column);
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

  let rawValue = "rawValue" in props ? props.rawValue : value;
  let i_value;
  try {
    i_value = parseValue(column, value);
  } catch (e: any) {
    i_value = value;
  }
  if (readOnly && column.udt_name === "interval") {
    i_value = renderInterval(rawValue);
    rawValue = i_value;
  }

  let type = getInputType(column).toLowerCase();
  if (type.startsWith("date") && !showDateInput) type = "text";
  const autoComplete = getInputAutocomplete(column);

  const cantUpdate = readOnly && action === "update";

  const header =
    !sectionHeader ? null : (
      <h4
        className="noselect"
        style={{
          marginBottom: "0.5em",
          // marginTop: "2em",
        }}
      >
        {sectionHeader}
      </h4>
    );

  let arrayType: FormFieldProps["arrayType"];
  if (column.tsDataType.endsWith("[]") && !column.tsDataType.includes("any")) {
    const elemTSType = tsDataTypeFromUdtName(column.element_udt_name as any);
    arrayType = {
      tsDataType: elemTSType as any,
      udt_name: column.element_udt_name as any,
    };
  }

  const fkeyControl = !!column.references?.length && !column.is_pkey && (
    <SmartFormFieldForeignKey
      key={column.name}
      column={column as any}
      db={db}
      readOnly={readOnly}
      onChange={onCheckAndChange}
      tables={tables}
      rawValue={rawValue}
      row={props.row}
      tableName={tableName}
    />
  );
  const table = tables.find((t) => t.name === tableName);

  const isCompact = variant === "compact";
  return (
    <>
      {header}
      {/* {!loaded && <Loading variant="cover" />} */}
      <FormField
        id={tableName + "-" + column.name}
        data-key={column.name}
        style={style}
        className={cantUpdate ? " cursor-default " : ""}
        inputClassName={cantUpdate ? " cursor-default " : ""}
        maxWidth={maxWidth}
        inputStyle={{
          ...inputStyle,
          minWidth: 0,
          ...(type === "checkbox" ? { padding: "1px" }
          : isCompact ? { padding: "2px 6px" }
          : {}),
        }}
        inputContent={fkeyControl}
        key={column.name}
        placeholder={placeholder}
        type={type}
        autoComplete={autoComplete}
        label={isCompact ? undefined : column.label}
        value={i_value}
        rawValue={rawValue}
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
        /** Check added to prevent Select width flicker */
        rightIcons={rightIcons}
        rightContent={rightContent}
        rightContentAlwaysShow={rightContentAlwaysShow}
        labelAsValue={true}
        nullable={column.is_nullable}
        inputProps={{ min: column.min, max: column.max }}
        hint={hint}
        hideClearButton={hideNullBtn}
        asColumn={variant === "column"}
      />
      {column.file && table && (
        <SmartFormFieldFileSection db={db} table={table} mediaId={rawValue} />
      )}
    </>
  );
};
