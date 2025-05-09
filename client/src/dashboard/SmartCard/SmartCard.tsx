import { usePromise } from "prostgles-client/dist/react-hooks";
import {
  isDefined,
  type AnyObject,
  type TableInfo,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { DetailedFilterBase } from "../../../../commonTypes/filterUtils";
import type { Prgl } from "../../App";
import { classOverride } from "../../components/Flex";
import Loading from "../../components/Loading";
import type { SmartCardListProps } from "../SmartCardList/SmartCardList";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import { RenderValue } from "../SmartForm/SmartFormField/RenderValue";
import { getSmartCardColumns } from "./getSmartCardColumns";
import { getDefaultFieldConfig, parseFieldConfigs } from "./parseFieldConfigs";
import { SmartCardColumn } from "./SmartCardColumn";
import { SmartCardActions } from "./SmartCardActions";

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

// export type BasicMedia = { content_type: string; name: string; url: string }

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
    select?: number | AnyObject | keyof T;
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

export type SmartCardProps<T extends AnyObject = any> = Pick<
  Prgl,
  "db" | "tables" | "methods"
> &
  Pick<SmartCardListProps<T>, "tableName"> & {
    defaultData: AnyObject;
    rowFilter?: DetailedFilterBase[];

    columns?: ValidatedColumnInfo[];

    className?: string;
    style?: React.CSSProperties;
    contentClassname?: string;
    contentStyle?: React.CSSProperties;
    variant?: "row" | "col" | "row-wrap";
    disableVariantToggle?: boolean;

    confirmUpdates?: boolean;
    showLocalChanges?: boolean;

    onChange?: (newData: AnyObject) => any;
    onChanged?: () => any;

    hideColumns?: string[];

    /**
     * Used in:
     * Changing how table columns are displayed
     * Displaying additional custom computed columns
     */
    fieldConfigs?: FieldConfig<T>[] | string[];

    title?: React.ReactNode;
    footer?: (row: AnyObject) => React.ReactNode;
    getActions?: (row: AnyObject) => React.ReactNode;

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
    db,
    tableName,
    className = "",
    style = {},
    disableVariantToggle = false,
    hideColumns,
    fieldConfigs: _fieldConfigs,
    footer = null,
    title,
    excludeNulls,
    defaultData,
    contentClassname = "",
    contentStyle = {},
    columns: columnsFromProps,
    showViewEditBtn = true,
    enableInsert = true,
  } = props;
  const [variant, setVariant] = useState(props.variant ?? DEFAULT_VARIANT);
  const fetchedColumns = usePromise(async () => {
    if (columnsFromProps) return undefined;
    return await getSmartCardColumns({ tableName, db });
  }, [columnsFromProps, tableName, db]);
  const cardColumns = columnsFromProps ?? fetchedColumns;

  if (!cardColumns) {
    return <Loading />;
  }

  const variantClass =
    variant === "row-wrap" ? "flex-row-wrap ai-start"
    : variant === "row" ? "flex-row ai-start"
    : "flex-col ai-start ";

  const displayedColumns =
    hideColumns ?
      cardColumns.filter((c) => hideColumns.includes(c.name))
    : cardColumns;

  const fieldConfigs =
    parseFieldConfigs(_fieldConfigs) || getDefaultFieldConfig(displayedColumns);

  const cols: {
    name: string;
    fc?: ParsedFieldConfig;
    col?: (typeof cardColumns)[number];
  }[] = fieldConfigs
    .filter((fc) => !fc.hide)
    .map((fc: ParsedFieldConfig) => ({
      name: fc.name.toString(),
      col: displayedColumns.find((c) => fc.name === c.name),
      fc,
    }));

  const content = cols
    /** Do not render if has nulls and no render and excludeNulls is true  */
    .filter(
      ({ name, fc }) =>
        !fc?.hideIf?.(defaultData[name], defaultData) &&
        (fc?.render ||
          !excludeNulls ||
          (defaultData[name] !== null && isDefined(defaultData[name]))),
    )
    .map(({ name, fc, col: c }, i) => {
      const labelText =
        (fc?.render ? fc.label : (fc?.label ?? c?.label ?? c?.name)) ?? null;

      const valueNode =
        fc?.render?.(defaultData[name], defaultData) ||
        (c && <RenderValue column={c} value={defaultData[name]} />);

      if (fc?.renderMode === "full") {
        return valueNode;
      }
      return (
        <SmartCardColumn
          key={`${fc?.name ?? c?.name ?? labelText}`}
          className={fc?.className}
          style={fc?.style}
          labelText={labelText}
          valueNode={valueNode}
          renderMode={fc?.renderMode}
          labelTitle={c?.udt_name || ""}
          info={c?.hint}
        />
      );
    });

  return (
    <div
      className={classOverride(
        `SmartCard card bg-color-0 relative ${variantClass} ${disableVariantToggle ? "" : " pointer "}`,
        className,
      )}
      style={{ padding: ".25em", ...style }}
      onClick={
        disableVariantToggle ? undefined : (
          () => {
            const v = variant;
            setVariant(
              v === "row" ? "col"
              : v === "col" ? DEFAULT_VARIANT
              : "row",
            );
          }
        )
      }
    >
      <div className="flex-col min-w-0 min-h-0 f-1">
        <div className="f-0">{title}</div>
        <div
          className={classOverride(
            `SmartCardContent o-auto f-1 min-w-0 min-h-0 gap-p5 p-p5 parent-hover ${variantClass}`,
            contentClassname,
          )}
          style={{ columnGap: "1em", ...contentStyle }}
        >
          {content}
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

export function nFormatter(num: number, digits: number): string {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  const item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item ?
      (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol
    : "0";
}
