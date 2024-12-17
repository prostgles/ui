import type {
  ValidatedColumnInfo,
  AnyObject,
  TableInfo,
} from "prostgles-types";
import RTComp from "../RTComp";
import React from "react";
import Loading from "../../components/Loading";
import Btn from "../../components/Btn";
import { mdiPencil, mdiResize } from "@mdi/js";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import SmartForm from "../SmartForm/SmartForm";
import SmartFormField from "../SmartForm/SmartFormField/SmartFormField";
import Checkbox from "../../components/Checkbox";
import type { DetailedFilterBase } from "../../../../commonTypes/filterUtils";
import { Label } from "../../components/Label";
import type { Prgl } from "../../App";
import type { SmartCardListProps } from "./SmartCardList";
import { getSmartCardColumns } from "./getSmartCardColumns";
import { classOverride } from "../../components/Flex";

type NestedSmartCardProps = Pick<SmartCardProps, "footer" | "excludeNulls">;
type NestedSmartFormProps = Pick<
  SmartFormProps,
  | "hideNullBtn"
  | "cannotBeNullMessage"
  | "enableInsert"
  | "insertBtnText"
  | "label"
  | "onSuccess"
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
    select?: number | AnyObject | string;
    hideIf?: (value, row) => boolean;
    render?: FieldConfigRender<T>;
    renderValue?: FieldConfigRender<T>;
  };

export type FieldConfig<T extends AnyObject = AnyObject> =
  | string
  | ParsedFieldConfig<T>;

export type SmartCardCommonProps = {};

export type SmartCardProps<T extends AnyObject = any> = Pick<
  Prgl,
  "db" | "tables" | "methods" | "theme"
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

    enableInsert?: boolean;
    includeMedia?: boolean;

    /**
     * If true then will not displaye fields with null values
     * */
    excludeNulls?: boolean;

    smartFormProps?: NestedSmartFormProps;

    popupFixedStyle?: React.CSSProperties;

    showViewEditBtn?: boolean;
  };

type S = {
  editMode: boolean;
  columns?: Pick<
    ValidatedColumnInfo,
    | "name"
    | "label"
    | "udt_name"
    | "is_nullable"
    | "has_default"
    | "tsDataType"
    | "is_pkey"
    | "references"
    | "hint"
  >[];
  variant?: SmartCardProps<any>["variant"];
  tableInfo?: TableInfo;
  item?: AnyObject;
};

const getDefaultFieldConfig = (
  cols: Pick<
    ValidatedColumnInfo,
    "name" | "label" | "udt_name" | "tsDataType" | "references"
  >[] = [],
  colNames?: string[],
): ParsedNestedFieldConfig[] => {
  let _fieldConfigs: FieldConfigNested[] | string[] | undefined = colNames;
  /** Select utils */
  if (colNames) {
    _fieldConfigs = colNames.slice(0);

    const allFieldsIndex = _fieldConfigs.findIndex((c) => c === "*");
    if (allFieldsIndex > -1) {
      _fieldConfigs.splice(allFieldsIndex, 0, ...cols.map((c) => c.name));
    }
    const allTablesIndex = _fieldConfigs.findIndex((c) => c === "**");
    if (allTablesIndex > -1) {
      _fieldConfigs.splice(
        allTablesIndex,
        0,
        ...cols
          .filter((c) => c.references?.length)
          .flatMap((c) =>
            c.references!.map((r) => ({
              name: r.ftable!,
              fieldConfigs: ["*"],
            })),
          ),
      );
    }
    _fieldConfigs = _fieldConfigs.filter(
      (c) => !["*", "**"].includes(c as string),
    );
  }

  const getColConfig = (c: (typeof cols)[number]) => ({
    name: c.name,
    label: c.label,
    renderValue:
      ["postcode", "post_code"].includes(c.name) ?
        (addr: string) =>
          !addr ?
            SmartFormField.renderValue(c, addr)
          : <a
              className="flex-col"
              target="_blank"
              href={`https://www.google.com/maps/search/${addr}`}
            >
              <span>{SmartFormField.renderValue(c, addr)}</span>
            </a>
      : c.tsDataType === "boolean" ?
        (val: boolean | null) => (
          <Checkbox
            title={(val || "NULL").toString()}
            checked={!!val}
            className="no-pointer-events"
            readOnly={true}
          />
        )
      : undefined,
  });

  const result =
    _fieldConfigs ?
      _fieldConfigs
        .map((fc: any) => {
          /** Is nested config. Return as is */
          if (typeof fc !== "string") {
            return fc;
            /** Is colname. Find column info and prepare */
          } else {
            const c = cols.find((c) => c.name === fc);
            if (!c) {
              console.error(
                `Could not find column ${fc}. Incorrect name or not allowed`,
              );
            } else {
              return getColConfig(c);
            }
          }
        })
        .filter((c) => c)
    : cols.map((c) => getColConfig(c));

  return result;
};

export default class SmartCard<T extends AnyObject> extends RTComp<
  SmartCardProps<T>,
  S
> {
  state: S = {
    editMode: false,
    columns: undefined,
    variant: undefined,
  };

  static parseFieldConfigs = (
    configs?: FieldConfigNested[],
    cols?: ValidatedColumnInfo[],
  ): undefined | ParsedFieldConfig[] | ParsedNestedFieldConfig[] => {
    if (configs) {
      if ((configs as any) === "*") configs = ["*"];
      if (!Array.isArray(configs)) throw "Expecting an array of fieldConfigs";
      let result: ParsedFieldConfig[] | ParsedNestedFieldConfig[] = [];
      configs.slice(0).forEach((fc) => {
        if (typeof fc === "string") {
          if (cols) {
            result = result.concat(getDefaultFieldConfig(cols, [fc]) as any);
          } else {
            result.push({ name: fc });
          }
        } else {
          result.push(fc as any);
        }
      });
      const duplicate = result.find((f, i) =>
        result.find((_f, _i) => f.name === _f.name && i !== _i),
      );
      if (duplicate) {
        console.log("Duplicate field config name found: " + duplicate.name);
      }
      return result;
    } else {
      /** Show all ? */
    }

    return undefined;
  };

  _rowFilter?: DetailedFilterBase[];
  onDelta = async () => {
    const { tableName, db, columns, rowFilter } = this.props;
    if (!this.state.columns) {
      this.setState({ columns: await getSmartCardColumns(this.props) });
    }

    if (typeof tableName === "string") {
      const tableHandler = db[tableName];
      if (
        rowFilter &&
        JSON.stringify(rowFilter !== this._rowFilter) &&
        tableHandler?.find
      ) {
        const items = await tableHandler.find(rowFilter, { limit: 2 });
        if (items.length !== 1) {
          console.error("Expected exactly one item");
        } else {
          this.setState({ item: items[0] });
        }
      }
    }
  };

  render() {
    const {
      db,
      tables,
      methods,
      theme,
      tableName,
      onChange,
      className = "",
      style = {},
      disableVariantToggle = false,
      hideColumns,
      fieldConfigs: _fieldConfigs,
      footer = null,
      enableInsert = true,
      includeMedia,
      title,
      showViewEditBtn = true,
      smartFormProps = {},
      excludeNulls,
      onChanged,
      defaultData,
      contentClassname = "",
      contentStyle = {},
    } = this.props;

    const { columns, editMode } = this.state;
    const DEFAULT_VARIANT = "row-wrap";
    const variant = this.state.variant || this.props.variant || DEFAULT_VARIANT;

    if (!columns) {
      return <Loading />;
    }

    let rowFilter = this.props.rowFilter;
    const hasPkeys = columns.some((c) => c.is_pkey);
    const pkeyCols = columns.filter(
      (c) =>
        (hasPkeys ? c.is_pkey : c.references?.length) && defaultData[c.name],
    );
    if (!rowFilter && pkeyCols.some((c) => defaultData[c.name])) {
      rowFilter = pkeyCols.map((c) => ({
        fieldName: c.name,
        value: defaultData[c.name],
      }));
    }

    const tableHandler =
      typeof tableName === "string" ? db[tableName] : undefined;
    const allowedActions = {
      view: showViewEditBtn && Boolean(tableHandler?.find && rowFilter),
      delete: showViewEditBtn && Boolean(tableHandler?.delete && rowFilter),
      update:
        showViewEditBtn &&
        (Boolean(onChange) || Boolean(tableHandler?.update && rowFilter)),
      insert: Boolean(tableHandler?.insert),
    };

    const variantClass =
      variant === "row-wrap" ? "flex-row-wrap ai-start"
      : variant === "row" ? "flex-row ai-start"
      : "flex-col ai-start ";

    let popup;
    if (editMode && typeof tableName === "string") {
      popup = (
        <SmartForm
          db={db}
          theme={theme}
          tables={tables}
          methods={methods}
          asPopup={true}
          tableName={tableName}
          onChange={onChange}
          rowFilter={rowFilter}
          confirmUpdates={true}
          hideChangesOptions={true}
          enableInsert={enableInsert}
          includeMedia={includeMedia}
          onSuccess={onChanged}
          {...smartFormProps}
          onClose={() => {
            this.setState({ editMode: false });
          }}
        />
      );
    }

    const displayedColumns =
      hideColumns ?
        columns.filter((c) => hideColumns.includes(c.name))
      : columns;

    const fieldConfigs =
      SmartCard.parseFieldConfigs(_fieldConfigs) ||
      getDefaultFieldConfig(displayedColumns);

    const cols: {
      name: string;
      fc?: ParsedFieldConfig;
      col?: (typeof columns)[number];
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
          (fc?.render || !excludeNulls || defaultData[name] !== null),
      )
      .map(({ name, fc, col: c }, i) => {
        const labelText =
          (fc?.render ? fc.label : (fc?.label ?? c?.label ?? c?.name)) ?? null;
        return (
          <div
            key={`${fc?.name ?? c?.name ?? labelText}`}
            className={
              "SmartCardCol flex-col o-auto ai-start text-1 ta-left " +
              (fc?.className || "")
            }
            style={{ maxHeight: "250px", ...fc?.style }}
          >
            {labelText?.length ?
              <Label
                size="small"
                variant="normal"
                title={c?.udt_name || ""}
                info={c?.hint}
              >
                {labelText}
              </Label>
            : null}
            {/* <div className="font-12 text-2 noselect" title={c?.udt_name || ""}>{fc?.label || c?.label}</div> */}
            {fc?.render?.(defaultData[name], defaultData) || (
              <div className="font-16 text-0 mt-p5 o-auto">
                {fc?.renderValue?.(defaultData[name], defaultData) ??
                  (c && SmartFormField.renderValue(c, defaultData[name]))}
              </div>
            )}
          </div>
        );
      });

    return (
      <>
        {popup}
        <div
          className={classOverride(
            `SmartCard card bg-color-0 relative ${variantClass} ${disableVariantToggle ? "" : " pointer "}`,
            className,
          )}
          style={{ padding: ".25em", ...style }}
          onClick={
            disableVariantToggle ? undefined : (
              () => {
                const v = this.state.variant || "row";
                this.setState({
                  variant:
                    v === "row" ? "col"
                    : v === "col" ? DEFAULT_VARIANT
                    : "row",
                });
              }
            )
          }
        >
          {(
            allowedActions.update ||
            allowedActions.delete ||
            allowedActions.view
          ) ?
            <Btn
              className="f-0 absolute show-on-parent-hover"
              data-command="SmartCard.viewEditRow"
              style={{ top: "0.25em", right: "0.25em" }}
              iconPath={
                allowedActions.update || allowedActions.delete ?
                  mdiPencil
                : mdiResize
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                this.setState({ editMode: true });
              }}
            />
          : null}
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
        </div>
      </>
    );
  }
}

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
