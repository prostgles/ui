import { mdiDotsHorizontal } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type {
  AnyObject,
  MethodHandler,
  TableInfo,
  ValidatedColumnInfo,
} from "prostgles-types";
import {
  TS_PG_Types,
  _PG_date,
  getJSONBSchemaAsJSONSchema,
  _PG_numbers,
} from "prostgles-types";
import React from "react";
import type { Theme } from "../../../App";
import Btn from "../../../components/Btn";
import type { FormFieldProps } from "../../../components/FormField/FormField";
import FormField from "../../../components/FormField/FormField";
import Loading from "../../../components/Loading";
import { isEmpty } from "../../../utils";
import type { CodeEditorProps } from "../../CodeEditor/CodeEditor";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import { renderInterval } from "../../W_SQL/customRenderers";
import RTComp from "../../RTComp";
import { SmartFormFieldFileSection } from "../SmartFormFieldFileSection";
import { RenderValue } from "./RenderValue";
import { getSmartFormFieldRightButtons } from "./SmartFormFieldRightButtons";
import { OPTIONS_LIMIT, getSuggestions, parseValue } from "./fieldUtils";
import type { FilterColumn } from "../../SmartFilter/smartFilterUtils";
import { isObject } from "../../../../../commonTypes/publishUtils";
import type { ColumnDisplayConfig } from "../SmartForm";
import {
  JSONBSchema,
  JSONBSchemaA,
} from "../../../components/JSONBSchema/JSONBSchema";
import { SmartFormFieldForeignKey } from "./SmartFormFieldForeignKey";

export type SmartFormFieldProps = {
  id?: string;
  db: DBHandlerClient;
  tableName?: string;
  maxWidth?: string;
  value?: S["newValue"];
  row?: AnyObject;
  rawValue?: any;
  onChange?: (newValue: S["newValue"]) => void;
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
  theme: Theme;
  /**
   * If true then will search and display similar values
   */
  showSuggestions?: boolean;

  error?: any;

  rightContentAlwaysShow?: boolean;
  rightContent?: React.ReactNode;
  hideNullBtn?: boolean;

  sectionHeader?: string;
  tables: CommonWindowProps["tables"];
  methods: MethodHandler;
};

export type SmartColumnInfo = ValidatedColumnInfo & ColumnDisplayConfig;

type S = {
  column?: SmartColumnInfo;
  error?: any;
  newValue?:
    | string
    | number
    | {
        data: File;
        name: string;
      }[]
    | null;
  options?: (string | null)[];
  showDateInput?: boolean;
  columnName?: string;
  onSearchOptions?: (term: string) => Promise<string[]>;
  insertMode: boolean;
  loaded: boolean;
  collapsed?: boolean;
};

export default class SmartFormField extends RTComp<SmartFormFieldProps, S> {
  state: S = {
    showDateInput: true,
    insertMode: false,
    loaded: false,
  };

  wasChanged = false;

  static getInputType(
    c: Pick<ValidatedColumnInfo, "udt_name" | "tsDataType" | "name">,
  ): string {
    return (
      c.udt_name === "date" ? "date"
      : c.udt_name.startsWith("timestamp") ? "datetime-local"
      : c.udt_name === "time" ? "time"
      : c.tsDataType === "boolean" ? "checkbox"
      : ["email"].includes(c.name) ? "email"
      : ["phone", "telephone", "phone_number", "tel"].includes(c.name) ? "tel"
      : ["zip_code", "zipcode", "post_code", "postcode"].includes(c.name) ?
        "postal-code"
      : ["given-name", "first_name", "first-name"].includes(c.name) ?
        "given-name"
      : ["family-name", "last_name", "last-name"].includes(c.name) ?
        "family-name"
      : ["address_line1", "address_line"].includes(c.name) ? "address-line1"
      : ["address_line2"].includes(c.name) ? "address-line2"
      : c.tsDataType === "string" ? "text"
      : (c.tsDataType as string)
    );
  }
  static getInputAutocomplete(c: ValidatedColumnInfo): string {
    const _autocomplete_values = [
      "address-line1",
      "address-line2",
      "address-line3",
      "street_address",
      "street",
      "address",
      "address-level1",
      "address-level2",
      "address-level3",
      "address-level4",
      "organization",
      "organization-title",
      "country",
      "country-name",
      "postal-code",
      "tel",
      "given-name",
      "family-name",
      "email",
    ];
    const autocomplete_values = _autocomplete_values.concat(
      _autocomplete_values.map((v) => v.replaceAll("-", "_")),
    );
    const noAutocomplete = ["date", "timestamp", "timestamptz"].includes(
      c.udt_name,
    );
    return (
      noAutocomplete ? "off"
      : autocomplete_values.includes(c.name.toLowerCase()) ?
        c.name.replaceAll("_", "-").toLowerCase()
      : "on"
    );
  }

  static renderValue(
    c: Pick<ValidatedColumnInfo, "udt_name" | "tsDataType"> | undefined,
    value: any,
    showTitle = true,
    maxLength?: number,
  ): React.ReactNode {
    //  , tsDataType?: ValidatedColumnInfo["tsDataType"]
    return (
      <RenderValue
        column={c}
        value={value}
        showTitle={showTitle}
        maxLength={maxLength}
      />
    );
  }

  onSuggest;

  onDelta = async (dP, dS, dD) => {
    const { tableName, db, column, showSuggestions, tables, action } =
      this.props;
    const { columnName } = this.state;

    let ns = {} as any;
    if (columnName !== column.name) {
      const getData = async (args: {
        term: string;
        col: FilterColumn;
        table: string;
        filter: AnyObject;
      }): Promise<(string | null)[]> => {
        const { term, col, table, filter } = args;
        return getSuggestions({ db, table, column: col, term, filter });
      };
      let options, onSearchOptions;

      if (column.references?.length && action !== "view") {
        const { cols, fcols, ftable } = column.references[0]!;
        if (ftable && db[ftable]?.find) {
          const currColIndex = cols.indexOf(column.name);
          const fcol = fcols[currColIndex];
          const fcolumn = tables
            .find((t) => t.name === ftable)
            ?.columns.find((c) => c.name === fcol);
          if (!fcolumn) return;

          // TODO add cross filter toggle for compound primary keys
          // const { row } = this.props;
          // const filter = isEmpty(row)? {} : Object.fromEntries(fcols.filter((_, fi) => fi !== currColIndex).map((c, i) => [c, row![cols[i]!]]));
          const filter = {};
          const filterColumn: FilterColumn = { type: "column", ...fcolumn };
          options = await getData({
            term: "",
            col: filterColumn,
            table: ftable,
            filter,
          });
          if (options.length > 1 && options.length >= OPTIONS_LIMIT) {
            onSearchOptions = async (term) => {
              const opts: (string | null)[] = await getData({
                term,
                col: filterColumn,
                table: ftable,
                filter,
              });
              this.setState({ options: opts });
            };
          }
        }
      } else if (
        column.tsDataType === "string" &&
        showSuggestions &&
        tableName &&
        db[tableName]?.find
      ) {
        this.onSuggest = async (term) => {
          const opts = await getData({
            term,
            col: { type: "column", ...column },
            table: tableName,
            filter: {},
          });
          return opts;
        };
      }

      ns = { columnName: column.name, options, onSearchOptions };
    }

    if (!this.state.loaded) ns.loaded = true;
    if (!isEmpty(ns)) {
      this.setState(ns);
    }
  };

  onChange = async (_newValue: File[] | string | number | null | AnyObject) => {
    const { column, tableInfo, onChange } = this.props;

    this.wasChanged = true;

    let newValue: string | number | null | { data: File; name: string }[] =
      _newValue as any;

    if (
      _newValue === "" &&
      ["Date", "number", "boolean", "Object"].includes(
        column.tsDataType as string,
      ) &&
      column.is_nullable
    ) {
      newValue = null;
    }

    let error = null;
    try {
      newValue = parseValue(column, _newValue as any, true);
    } catch (err: any) {
      error = err;
    }

    if (!tableInfo.hasFiles) {
      if (
        typeof column.min === "number" &&
        typeof newValue === "number" &&
        newValue < column.min
      ) {
        newValue = Math.max(newValue, column.min);
      } else if (
        typeof column.max === "number" &&
        typeof newValue === "number" &&
        newValue > column.max
      ) {
        newValue = Math.min(newValue, column.max);
      }
    }

    try {
      await onChange?.(newValue);
    } catch (err: any) {
      error = err.toString();
    }
    this.setState({
      error,
      newValue,
    });
  };

  render(): React.ReactNode {
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
      theme,
      db,
      tables,
      jsonbSchemaWithControls,
    } = this.props;
    let rawValue = "rawValue" in this.props ? this.props.rawValue : value;
    const {
      error,
      options,
      showDateInput,
      onSearchOptions,
      loaded,
      collapsed,
    } = this.state;
    const table = tables.find((t) => t.name === tableName);
    let i_value;
    try {
      i_value = parseValue(column, value);
    } catch (e: any) {
      i_value = value;
    }

    const isCompact = variant === "compact";

    let rightIcons: React.ReactNode = getSmartFormFieldRightButtons({
      ...this.props,
      onChange: this.onChange,
      showDateInput: {
        value: !!showDateInput,
        onChange: (showDateInput) => this.setState({ showDateInput }),
      },
    });

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
      if (!collapsed) {
        return (
          <Btn
            className="mt-1"
            title="Expand"
            iconPath={mdiDotsHorizontal}
            onClick={() => {
              this.setState({ collapsed: !collapsed });
            }}
          />
        );
      }
    }

    if (readOnly && column.udt_name === "interval") {
      i_value = renderInterval(rawValue);
      rawValue = i_value;
    }

    let type = SmartFormField.getInputType(column).toLowerCase();
    if (type.startsWith("date") && !showDateInput) type = "text";
    const autoComplete = SmartFormField.getInputAutocomplete(column);

    const cantUpdate = readOnly && action === "update";

    let asJSON: FormFieldProps["asJSON"];
    if (column.udt_name.startsWith("json") && tableName) {
      if (jsonbSchemaWithControls && column.jsonbSchema) {
        return (
          <JSONBSchemaA
            db={db}
            schema={column.jsonbSchema}
            tables={tables}
            value={value}
            onChange={this.onChange}
          />
        );
      }
      const jsonSchema =
        column.jsonbSchema &&
        getJSONBSchemaAsJSONSchema(tableName, column.name, column.jsonbSchema);
      asJSON = {
        options: {
          // value:
          //   (typeof value !== "string" && value ?
          //     JSON.stringify(value, null, 2)
          //   : value?.toString()) ?? "",
        },
        ...(column.jsonbSchema && {
          schemas: [
            {
              id: `${tableName}_${column.name}`,
              schema: jsonSchema,
            },
          ],
        }),
      };
    }
    if (
      column.udt_name === "geography" &&
      tableName &&
      isObject(value) &&
      !isEmpty(value)
    ) {
      asJSON = {
        options: {
          // value: JSON.stringify(value, null, 2),
        },
      };
    }

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
    if (
      column.tsDataType.endsWith("[]") &&
      !column.tsDataType.includes("any")
    ) {
      const elemTSType = tsDataTypeFromUdtName(column.element_udt_name as any);
      arrayType = {
        tsDataType: elemTSType as any,
        udt_name: column.element_udt_name as any,
      };
    }

    const fkeyControl = !!column.references?.length && (
      <SmartFormFieldForeignKey
        key={column.name}
        column={column as any}
        db={db}
        readOnly={readOnly}
        onChange={this.onChange}
        tables={tables}
        rawValue={rawValue}
        row={this.props.row}
        tableName={tableName}
      />
    );

    // if(fkeyControl) return fkeyControl;

    return (
      <>
        {header}
        {!loaded && <Loading variant="cover" />}
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
          // options={options}
          // onSearchOptions={onSearchOptions}
          asJSON={asJSON}
          asTextArea={
            column.tsDataType === "string" &&
            typeof value === "string" &&
            (value.length > 50 || value.split("\n").length > 1)
          }
          readOnly={readOnly}
          multiSelect={multiSelect}
          onChange={this.onChange}
          error={this.props.error || error}
          arrayType={arrayType}
          /** Check added to prevent Select width flicker */
          rightIcons={!loaded ? null : rightIcons}
          rightContent={!loaded ? null : rightContent}
          rightContentAlwaysShow={this.props.rightContentAlwaysShow}
          labelAsValue={true}
          onSuggest={this.onSuggest}
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
  }
}

export const columnIsReadOnly = (
  action: "update" | "insert" | "view" | undefined,
  c: ValidatedColumnInfo,
) => {
  return (
    action === "view" ||
    (action === "update" && !c.update) ||
    (action === "insert" && !c.insert)
  );
};

export const getColumnDataColor = (
  c?: Pick<Partial<ValidatedColumnInfo>, "udt_name" | "tsDataType" | "is_pkey">,
  fallBackColor?: string,
) => {
  if (c?.udt_name === "uuid" || c?.is_pkey) {
    return "var(--color-uuid)";
  }

  if (c?.udt_name === "geography" || c?.udt_name === "geometry") {
    return "var(--color-geo)";
  }

  if (
    c?.udt_name === "json" ||
    c?.udt_name === "jsonb" ||
    c?.tsDataType === "any"
  ) {
    return "var(--color-json)";
  }

  if (_PG_date.some((v) => v === c?.udt_name)) {
    return "var(--color-date)";
  }

  if (c && _PG_numbers.includes(c.udt_name as any)) {
    return "var(--color-number)";
  }

  const TS_COL_TYPE_TO_COLOR = {
    number: "var(--color-number)",
    boolean: "var(--color-boolean)",
  } as const;

  return (
    (c?.tsDataType ? TS_COL_TYPE_TO_COLOR[c.tsDataType] : undefined) ??
    fallBackColor
  );
};

export const tsDataTypeFromUdtName = (
  udtName: string,
): ValidatedColumnInfo["tsDataType"] => {
  return (
    Object.entries(TS_PG_Types).find(([ts, pgArr]) =>
      (pgArr as any).includes(udtName.toLowerCase()),
    )?.[0] ?? ("string" as any)
  );
};
