import { usePromise } from "prostgles-client/dist/react-hooks";
import {
  isDefined,
  type AnyObject,
  type TableInfo,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React, { useState } from "react";
import type { DetailedFilterBase } from "../../../../commonTypes/filterUtils";
import type { Prgl } from "../../App";
import { classOverride } from "../../components/Flex";
import Loading from "../../components/Loading";
import type { SmartCardListProps } from "../SmartCardList/SmartCardList";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import { RenderValue } from "../SmartForm/SmartFormField/RenderValue";
import { getSmartCardColumns } from "./getSmartCardColumns";
import { getDefaultFieldConfig, parseFieldConfigs } from "./parseFieldConfigs";
import { SmartCardActions } from "./SmartCardActions";
import { SmartCardColumn } from "./SmartCardColumn";
import { useFieldConfigParser } from "./useFieldConfigParser";

type NestedSmartCardProps = Pick<SmartCardProps, "footer" | "excludeNulls">;
type NestedSmartFormProps = Pick<
  SmartFormProps,
  "hideNullBtn" | "enableInsert" | "insertBtnText" | "label" | "onSuccess"
>;

export type FieldConfigTable = FieldConfigBase & {
  fieldConfigs: FieldConfigNested[];
  tableInfo: TableInfo;
  tableColumns: ValidatedColumnInfo[];
  getRowFilter?: (row: AnyObject) => AnyObject;
  select?: string | AnyObject;
  render?: (rows: AnyObject[]) => React.ReactNode;
  smartFormProps?: NestedSmartFormProps;
  smartCardProps?: NestedSmartCardProps;
};

export type FieldConfigNested = FieldConfig<any> | FieldConfigTable;

export type ParsedNestedFieldConfig = ParsedFieldConfig | FieldConfigTable;

export type FieldConfigBase<T extends AnyObject | void = void> = {
  /* Is the column or table name */
  name: T extends AnyObject ? keyof T | string : string;
  style?: React.CSSProperties;
  className?: string;

  hide?: boolean;
  label?: string;
};

export type FieldConfigRender<T extends AnyObject = AnyObject> = (
  value: any,
  row: T,
) => React.ReactNode;

export type ParsedFieldConfig<T extends AnyObject = AnyObject> =
  FieldConfigBase<T> & {
    select?: number | AnyObject | (keyof T & string) | "*";
    hideIf?: (value, row) => boolean;
    render?: FieldConfigRender<T>;
    /**
     * Defaults to "value"
     */
    renderMode?: "valueNode" | "value" | "full";
  };

export type FieldConfig<T extends AnyObject = AnyObject> =
  | string
  | ParsedFieldConfig<T>;

export type SmartCardCommonProps = {};

export type SmartCardProps<T extends AnyObject = AnyObject> = Pick<
  Prgl,
  "db" | "tables" | "methods"
> &
  Pick<SmartCardListProps<T>, "tableName" | "tables"> & {
    defaultData: T;
    rowFilter?: DetailedFilterBase[];

    columns?: ValidatedColumnInfo[];

    className?: string;
    style?: React.CSSProperties;
    contentClassname?: string;
    contentStyle?: React.CSSProperties;
    variant?: "row" | "col" | "row-wrap";

    confirmUpdates?: boolean;
    showLocalChanges?: boolean;

    onChange?: (newData: AnyObject) => any;

    hideColumns?: string[];

    /**
     * Used in:
     * Changing how table columns are displayed
     * Displaying additional custom computed columns
     */
    fieldConfigs?: FieldConfig<T>[] | string[];

    title?: (row: T) => React.ReactNode;
    footer?: (row: T) => React.ReactNode;
    getActions?: (row: T) => React.ReactNode;

    enableInsert?: boolean;

    /**
     * If true then will not displaye fields with null values
     * */
    excludeNulls?: boolean;

    smartFormProps?: NestedSmartFormProps;

    popupFixedStyle?: React.CSSProperties;

    showViewEditBtn?: boolean;
  };

const DEFAULT_VARIANT = "row-wrap";

export const SmartCard = <T extends AnyObject>(props: SmartCardProps<T>) => {
  const {
    className = "",
    style = {},
    fieldConfigs: _fieldConfigs,
    footer = null,
    title,
    defaultData,
    contentClassname = "",
    contentStyle = {},
    showViewEditBtn = true,
    enableInsert = true,
  } = props;

  const [variant, setVariant] = useState(props.variant ?? DEFAULT_VARIANT);
  const parsedFields = useFieldConfigParser(props as SmartCardProps);

  if (!parsedFields) {
    return <Loading />;
  }
  const { cardColumns, fieldConfigsWithColumns } = parsedFields;

  const variantClass =
    variant === "row-wrap" ? "flex-row-wrap ai-start"
    : variant === "row" ? "flex-row ai-start"
    : "flex-col ai-start ";

  return (
    <div
      className={classOverride(
        `SmartCard card bg-color-0 relative ${variantClass} `,
        className,
      )}
      style={{ padding: ".25em", ...style }}
    >
      <div className="flex-col min-w-0 min-h-0 f-1">
        {title?.(defaultData)}
        <div
          className={classOverride(
            `SmartCardContent o-auto f-1 min-w-0 min-h-0 gap-p5 p-p5 parent-hover ${variantClass}`,
            contentClassname,
          )}
          style={{ columnGap: "1em", ...contentStyle }}
        >
          {fieldConfigsWithColumns.map(({ name, fc, col: column }, i) => {
            const labelText = fc.label ?? column?.label ?? column?.name ?? null;

            const valueNode =
              fc.render?.(defaultData[name], defaultData) ||
              (column && (
                <RenderValue column={column} value={defaultData[name]} />
              ));

            if (fc.renderMode === "full") {
              return <React.Fragment key={fc.name}>{valueNode}</React.Fragment>;
            }
            return (
              <SmartCardColumn
                key={`${fc.name}`}
                className={fc.className}
                style={fc.style}
                labelText={labelText}
                valueNode={valueNode}
                renderMode={fc.renderMode ?? "value"}
                labelTitle={column?.udt_name || ""}
                info={column?.hint}
              />
            );
          })}
        </div>
        {footer?.(defaultData)}
      </div>
      <SmartCardActions
        {...props}
        enableInsert={enableInsert}
        showViewEditBtn={showViewEditBtn}
        cardColumns={cardColumns}
        defaultData={defaultData}
      />
    </div>
  );
};
