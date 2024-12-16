import { mdiChevronDown, mdiPlus } from "@mdi/js";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import { _PG_date } from "prostgles-types";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import React from "react";
import type { Prgl } from "../../../../App";
import Btn from "../../../../components/Btn";
import { FlexCol, FlexRowWrap } from "../../../../components/Flex";
import FormField from "../../../../components/FormField/FormField";
import { Label } from "../../../../components/Label";
import { FooterButtons } from "../../../../components/Popup/FooterButtons";
import type { FooterButton } from "../../../../components/Popup/FooterButtons";
import Popup from "../../../../components/Popup/Popup";
import SearchList from "../../../../components/SearchList/SearchList";
import Select from "../../../../components/Select/Select";
import { isEmpty } from "../../../../utils";
import type {
  DBSchemaTablesWJoins,
  WindowSyncItem,
} from "../../../Dashboard/dashboardUtils";
import RTComp from "../../../RTComp";
import { getTableSelect } from "../../tableUtils/getTableSelect";
import { updateWCols } from "../../tableUtils/tableUtils";
import type { ColumnConfig } from "../ColumnMenu";
import { getColumnListItem } from "../ColumnsMenu";
import type { FuncDef } from "../FunctionSelector";
import { CountAllFunc, FunctionSelector } from "../FunctionSelector";
import { NEW_COL_POSITIONS } from "../LinkedColumn/LinkedColumnFooter";
import {
  getNestedColumnTable,
  type NestedColumnOpts,
} from "../getNestedColumnTable";
import type { ColumnConfigWInfo } from "../../W_Table";

const ColTypes = ["Function", "Aggregate Function"] as const;

type AddComputedColMenuP = Pick<Prgl, "db"> & {
  tableHandler?: Partial<TableHandlerClient>;
  anchorEl?: Element;
  onClose: VoidFunction;
  w: WindowSyncItem<"table">;
  tables: DBSchemaTablesWJoins;
  nestedColumnOpts: NestedColumnOpts | undefined;
  selectedColumn?: string;
  variant?: "no-popup";
};

type AddComputedColMenuS = {
  colType?: (typeof ColTypes)[number];
  column?: string;

  funcDef?: FuncDef;

  name?: string;

  args?: Required<ColumnConfig>["computedConfig"]["args"];

  template_string_hint?: string;
  template_string_error?: any;
  addTo: (typeof NEW_COL_POSITIONS)[number]["key"];
};

export class AddComputedColMenu extends RTComp<
  AddComputedColMenuP,
  AddComputedColMenuS
> {
  state: AddComputedColMenuS = {
    args: {},
    addTo: "start",
  };

  onDelta(deltaP?: Partial<AddComputedColMenuP> | undefined): void {
    if (deltaP?.selectedColumn && !this.state.column) {
      this.setState({ column: deltaP.selectedColumn });
    }
  }

  onAdd = (newCol: ColumnConfig, addTo: AddComputedColMenuS["addTo"]) => {
    const tableOrError = this.table;
    if (tableOrError.error !== undefined) {
      console.error(tableOrError.error);
      return;
    }
    const { columns, nestedColumn } = tableOrError;
    const { w, nestedColumnOpts } = this.props;
    if (!nestedColumn) {
      const newColumns = columns.map((c) => ({ ...c }));
      if (addTo === "start") newColumns.unshift(newCol);
      else newColumns.push(newCol);

      updateWCols(w, newColumns);
    } else {
      if (nestedColumnOpts?.type === "new") {
        const { config } = nestedColumnOpts;
        const updatedNestedColumn: ColumnConfigWInfo = {
          ...config,
          nested: {
            ...config.nested!,
            columns: [...config.nested!.columns, newCol],
          },
        };
        nestedColumnOpts.onChange(updatedNestedColumn);
      } else {
        updateWCols(
          w,
          [...nestedColumn.nested!.columns, newCol],
          nestedColumn.name,
        );
      }
    }
  };

  get table() {
    const { w, tables, nestedColumnOpts } = this.props;
    return getNestedColumnTable(nestedColumnOpts, w, tables);
  }

  render() {
    const { onClose, tableHandler, w, tables, db, variant } = this.props;
    const {
      column,
      funcDef,
      args,
      template_string_hint,
      template_string_error,
      addTo,
    } = this.state;

    const name =
      this.state.name ||
      (funcDef?.label ?
        `${funcDef.label.toUpperCase()}(${column || ""}${args?.$duration?.otherColumn ? ` TO ${args.$duration.otherColumn}` : ""})`
      : "") ||
      "col_name";
    const { table, error } = this.table;

    if (!table) return error;

    const { columns } = table;

    const allowedColumnsForFunction =
      (funcDef && getFuncDefColumns(funcDef, columns)) ?? columns;

    const isAggNocol =
      funcDef && !funcDef.tsDataTypeCol && !funcDef.udtDataTypeCol;
    const canAdd =
      funcDef?.key === "$template_string" ? !template_string_error
      : funcDef?.key === "$duration" ? !!args?.$duration?.otherColumn
      : Boolean(funcDef && (column || isAggNocol));

    const hasJoinCols = w.columns?.some((c) => c.nested);
    const content = (
      <>
        <FlexCol className="AddComputedColMenu gap-2 f-1 min-h-0 mt-1 ai-start max-h-fit">
          {!column && !hasJoinCols && (
            <FlexRowWrap>
              <FlexCol className="gap-p25">
                <Btn
                  variant="faded"
                  color="action"
                  onClick={() => {
                    this.setState({
                      funcDef: CountAllFunc,
                    });
                  }}
                >
                  Add count of all rows
                </Btn>
                <div
                  className="text-0p75 p-p25 ta-left font-14"
                  style={{ maxWidth: "250px" }}
                >
                  Will show total row counts grouped by the selected columns
                </div>
              </FlexCol>
              {!funcDef && <div>OR</div>}
            </FlexRowWrap>
          )}
          {funcDef?.key === CountAllFunc.key ?
            null
          : column ?
            <div className="flex-col  f-0 min-h-fit  ">
              <label className="noselect f-0 text-1p5 ta-left  mb-p5 ">
                Column
              </label>
              <Btn
                variant="faded"
                color="action"
                iconPosition="right"
                iconPath={mdiChevronDown}
                onClick={() => {
                  this.setState({ column: undefined });
                }}
              >
                {column}
              </Btn>
            </div>
          : <SearchList
              id="cols-elect"
              className="  f-1"
              label={
                funcDef ? `Columns for ${funcDef.label}` : `Choose a column`
              }
              items={allowedColumnsForFunction.map((c) => ({
                ...getColumnListItem(c),
                onPress: () => {
                  this.setState({ column: c.name });
                },
              }))}
            />
          }

          {!column ?
            null
          : funcDef ?
            <div className="flex-col">
              <label className="noselect f-0 text-1p5 ta-left  mb-p5 ">
                Function
              </label>
              <Btn
                variant="faded"
                color="action"
                iconPosition="right"
                iconPath={mdiChevronDown}
                onClick={() => {
                  this.setState({ funcDef: undefined });
                }}
              >
                {funcDef.label}
              </Btn>
            </div>
          : <FlexCol className="gap-p25 ">
              <Label label="Function" variant="normal" />
              <FunctionSelector
                column={column}
                wColumns={w.columns ?? undefined}
                currentNestedColumnName={
                  this.props.nestedColumnOpts?.config.name
                }
                tableColumns={table.columns}
                onSelect={(newFuncDef) => {
                  this.setState({
                    funcDef: newFuncDef,
                    args: {},
                  });
                }}
              />
            </FlexCol>
          }
        </FlexCol>

        {funcDef?.key === "$template_string" && (
          <>
            <FormField
              className="mt-1"
              asColumn={true}
              value={args?.$template_string ?? ""}
              label="Template string"
              hint={
                template_string_hint ??
                "Use column names. E.g.: Dear {FirstName} {LastName}"
              }
              error={template_string_error}
              onChange={async ($template_string) => {
                let template_string_hint: string | undefined = undefined;
                if (tableHandler && tableHandler.find) {
                  try {
                    template_string_hint = (await tableHandler.find(
                      {},
                      {
                        returnType: "value",
                        limit: 1,
                        select: {
                          val: { $template_string: [$template_string] },
                        },
                      },
                    )) as any as string;
                    this.setState({
                      args: { $template_string },
                      template_string_error: undefined,
                      template_string_hint,
                    });
                  } catch (template_string_error) {
                    this.setState({ template_string_error });
                  }
                } else {
                  this.setState({
                    args: { $template_string },
                    template_string_error: undefined,
                  });
                }
              }}
            />
            <div className="flex-row-wrap">
              {columns.map((c, i) => (
                <div key={i} className="p-p25">{`{${c.name}}`}</div>
              ))}
            </div>
          </>
        )}

        {funcDef?.key === "$duration" &&
          (args?.$duration?.otherColumn ?
            <FlexCol className="gap-p5 mt-1">
              <label className="noselect f-0 text-1p5 ta-left">
                Compare to
              </label>
              <Btn
                variant="filled"
                style={{
                  backgroundColor: "rgb(0, 183, 255)",
                }}
                onClick={() => {
                  this.setState({ args: {} });
                }}
              >
                {args.$duration.otherColumn}
              </Btn>
            </FlexCol>
          : <SearchList
              id="duration_othercolumn"
              label="Compare to column"
              items={columns
                .filter(
                  (c) =>
                    c.name !== column && _PG_date.some((v) => v === c.udt_name),
                )
                .map((c) => ({
                  key: c.name,
                  label: c.label,
                  onPress: () => {
                    this.setState({
                      args: {
                        $duration: { otherColumn: c.name },
                      },
                    });
                  },
                }))}
            />)}
        {canAdd && (
          <>
            <FormField
              label="Name"
              type="text"
              className="mt-1"
              asColumn={true}
              value={name}
              onChange={(name) => {
                this.setState({ name });
              }}
            />
            <Select
              label={"Add to"}
              value={addTo}
              fullOptions={NEW_COL_POSITIONS}
              onChange={(addTo) => this.setState({ addTo })}
            />
          </>
        )}
      </>
    );
    const footerButtons: FooterButton[] = [
      { onClickClose: true, label: "Cancel", variant: "outline" },
      {
        label: "Add",
        variant: "filled",
        color: "action",
        iconPath: mdiPlus,
        disabledInfo: canAdd ? undefined : "Some function inputs are missing",
        onClickPromise: async () => {
          if (!name) {
            alert("Provide a column name");
          } else if (columns.find((c) => c.name === name)) {
            alert("Column name already in use: " + name);
          } else {
            if (!funcDef) {
              alert("Something went wrong. No function definition found");
              return;
            }
            const newComputedCol: ColumnConfig = {
              name: name,
              show: true,
              width: 130,
              computedConfig: {
                funcDef,
                column,
                ...funcDef.outType,
                args: isEmpty(args) ? undefined : args,
              },
            };
            const { select } = await getTableSelect(
              { table_name: w.table_name, columns: [newComputedCol] },
              tables,
              db,
              {},
              true,
            );
            await tableHandler?.find?.({}, { select, limit: 0 });
            this.onAdd(newComputedCol, addTo);
            onClose();
          }
        },
      },
    ];
    if (variant === "no-popup") {
      const cancelButton: FooterButton | undefined =
        this.state.funcDef ?
          {
            onClick: () => {
              this.setState({ funcDef: undefined });
            },
            label: "Cancel",
            variant: "outline",
          }
        : undefined;
      return (
        <FlexCol className="f-1">
          {content}
          <FooterButtons
            style={{ borderTop: "unset" }}
            className="mt-auto mb-0"
            footerButtons={[cancelButton, footerButtons[1]]}
          />
        </FlexCol>
      );
    }
    return (
      <Popup
        title="Add computed column"
        showFullscreenToggle={{}}
        positioning="top-center"
        persistInitialSize={true}
        clickCatchStyle={{ opacity: 1 }}
        contentClassName="gap-2 p-2 "
        rootChildClassname="f-1"
        footerButtons={footerButtons}
        onClose={onClose}
      >
        {content}
      </Popup>
    );
  }
}

export const getFuncDefColumns = (
  funcDef: FuncDef,
  columns: ValidatedColumnInfo[],
) => {
  if (funcDef.tsDataTypeCol || funcDef.udtDataTypeCol) {
    return columns.filter((c) => {
      if (funcDef.tsDataTypeCol === "any" || funcDef.udtDataTypeCol === "any") {
        return true;
      } else if (funcDef.tsDataTypeCol) {
        return funcDef.tsDataTypeCol.includes(c.tsDataType);
      } else if (funcDef.udtDataTypeCol) {
        return funcDef.udtDataTypeCol.includes(c.udt_name);
      }

      return false;
    });
  }
  return undefined;
};

/*

const basicFunctions = [
  { key: "$D" },
  { key: "$dy" },
  { key: "$Dy" },
  { key: "$DD" },
  { key: "$ID" },
  { key: "$MM" },
  { key: "$yy" },
  { key: "$yr" },
  { key: "$day" },
  { key: "$Day" },
  { key: "$dow" },
  { key: "$mon" },
  { key: "$Mon" },
  { key: "$age" },
  { key: "$md5" },
  { key: "$left" },
  { key: "$date" },
  { key: "$time" },
  { key: "$year" },
  { key: "$yyyy" },
  { key: "$trim" },
  { key: "$ceil" },
  { key: "$sign" },
  { key: "$right" },
  { key: "$DayNo" },
  { key: "$dowUS" },
  { key: "$month" },
  { key: "$Month" },
  { key: "$upper" },
  { key: "$lower" },
  { key: "$round" },
  { key: "$floor" },
  { key: "$count" },
  { key: "$time12" },
  { key: "$timeAM" },
  { key: "$length" },
  { key: "$MonthNo" },
  { key: "$reverse" },
  { key: "$initcap" },
  { key: "$datetime" },
  { key: "$timedate" },
  { key: "$ST_AsText" },
  { key: "$string_agg" },
  { key: "$ST_AsGeoJSON" },
  { key: "$date_trunc_day" },
  { key: "$date_trunc_hour" },
  { key: "$date_trunc_week" },
  { key: "$date_trunc_year" },
  { key: "$date_trunc_month" },
  { key: "$date_trunc_8hour" },
  { key: "$date_trunc_4hour" },
  { key: "$date_trunc_2hour" },
  { key: "$date_trunc_second" },
  { key: "$date_trunc_minute" },
  { key: "$date_trunc_decade" },
  { key: "$date_trunc_6month" },
  { key: "$date_trunc_4month" },
  { key: "$date_trunc_2month" },
  { key: "$date_trunc_quarter" },
  { key: "$date_trunc_century" },
  { key: "$date_trunc_6minute" },
  { key: "$date_trunc_5minute" },
  { key: "$date_trunc_4minute" },
  { key: "$date_trunc_3minute" },
  { key: "$date_trunc_2minute" },
  { key: "$date_trunc_8second" },
  { key: "$date_trunc_6second" },
  { key: "$date_trunc_5second" },
  { key: "$date_trunc_4second" },
  { key: "$date_trunc_3second" },
  { key: "$date_trunc_2second" },
  { key: "$date_trunc_30minute" },
  { key: "$date_trunc_15minute" },
  { key: "$date_trunc_30second" },
  { key: "$date_trunc_15second" },
  { key: "$date_trunc_10second" },
  { key: "$date_trunc_millennium" },
  { key: "$date_trunc_microseconds" },
  { key: "$date_trunc_milliseconds" },
] as const;


 | $datetime  :[column_name] -> get timestamp formated as YYYY-MM-DD HH24:MI
 | $timedate  :[column_name] -> get timestamp formated as HH24:MI YYYY-MM-DD
 | $D  :[column_name] -> get timestamp formated as D
 | $dy  :[column_name] -> get timestamp formated as dy
 | $Dy  :[column_name] -> get timestamp formated as Dy
 | $DD  :[column_name] -> get timestamp formated as DD
 | $ID  :[column_name] -> get timestamp formated as ID
 | $MM  :[column_name] -> get timestamp formated as MM
 | $MonthNo  :[column_name] -> get timestamp formated as MM
 | $yy  :[column_name] -> get timestamp formated as yy
 | $yr  :[column_name] -> get timestamp formated as yy
 | $day  :[column_name] -> get timestamp formated as day
 | $Day  :[column_name] -> get timestamp formated as Day
 | $dow  :[column_name] -> get timestamp formated as ID
 | $mon  :[column_name] -> get timestamp formated as mon
 | $Mon  :[column_name] -> get timestamp formated as Mon
 | $DayNo  :[column_name] -> get timestamp formated as DD
 | $dowUS  :[column_name] -> get timestamp formated as D
 | $month  :[column_name] -> get timestamp formated as month
 | $Month  :[column_name] -> get timestamp formated as Month
 | $date  :[column_name] -> get timestamp formated as YYYY-MM-DD
 | $time  :[column_name] -> get timestamp formated as HH24:MI
 | $year  :[column_name] -> get timestamp formated as yyyy
 | $yyyy  :[column_name] -> get timestamp formated as yyyy
 | $time12  :[column_name] -> get timestamp formated as HH:MI
 | $timeAM  :[column_name] -> get timestamp formated as HH:MI AM
 | $to_char  :[column_name, format<string>] -> format dates and strings. Eg: [current_timestamp, 'HH12:MI:SS']
 | $age




 | $left  :[column_name, number] -> substring
 | $trim
 | $ceil
 | $sign
 | $upper
 | $lower
 | $round
 | $floor
 | $count
 | $length
 | $reverse
 | $initcap
 | $json_agg
 | $countAll agg :[]  COUNT of all rows
 | $md5_multi  :[...column_names] -> md5 hash of the column content
 | $date_part  :[unit<string>, column_name] ->  extract date unit as float8.  E.g. ['hour', col]
 | $array_agg
 | $diff_perc
 | $date_trunc  :[unit<string>, column_name] ->  round down timestamp to closest unit value.  E.g. ['hour', col]
 | $string_agg

 | $ST_AsGeoJSON  :[column_name] -> json GeoJSON output of a geometry column
 | $md5_multi_agg  :[...column_names] -> md5 hash of the string aggregation of column content
 | $date_trunc_day  :[column_name] -> round down timestamp to closest  day
 | $term_highlight  :[column_names<string[] | "*">, search_term<string>, opts?<{ edgeTruncate?: number; noFields?: boolean }>] -> get case-insensitive text match highlight
 | $date_trunc_hour  :[column_name] -> round down timestamp to closest  hour
 | $date_trunc_week  :[column_name] -> round down timestamp to closest  week
 | $date_trunc_year  :[column_name] -> round down timestamp to closest  year
 | $sha256_multi_agg  :[...column_names] -> sha256 hash of the string aggregation of column content
 | $sha512_multi_agg  :[...column_names] -> sha512 hash of the string aggregation of column content
 | $date_trunc_month  :[column_name] -> round down timestamp to closest  month
 | $date_trunc_8hour  :[column_name] -> round down timestamp to closest 8 hour
 | $date_trunc_4hour  :[column_name] -> round down timestamp to closest 4 hour
 | $date_trunc_2hour  :[column_name] -> round down timestamp to closest 2 hour
 | $date_trunc_second  :[column_name] -> round down timestamp to closest  second
 | $date_trunc_minute  :[column_name] -> round down timestamp to closest  minute
 | $date_trunc_decade  :[column_name] -> round down timestamp to closest  decade
 | $date_trunc_6month  :[column_name] -> round down timestamp to closest 6 month
 | $date_trunc_4month  :[column_name] -> round down timestamp to closest 4 month
 | $date_trunc_2month  :[column_name] -> round down timestamp to closest 2 month
 | $ts_headline_simple  :[column_name <string>, search_term: <string | { to_tsquery: string } > ] -> sha512 hash of the of column content
 | $date_trunc_quarter  :[column_name] -> round down timestamp to closest  quarter
 | $date_trunc_century  :[column_name] -> round down timestamp to closest  century
 | $date_trunc_6minute  :[column_name] -> round down timestamp to closest 6 minute
 | $date_trunc_5minute  :[column_name] -> round down timestamp to closest 5 minute
 | $date_trunc_4minute  :[column_name] -> round down timestamp to closest 4 minute
 | $date_trunc_3minute  :[column_name] -> round down timestamp to closest 3 minute
 | $date_trunc_2minute  :[column_name] -> round down timestamp to closest 2 minute
 | $date_trunc_8second  :[column_name] -> round down timestamp to closest 8 second
 | $date_trunc_6second  :[column_name] -> round down timestamp to closest 6 second
 | $date_trunc_5second  :[column_name] -> round down timestamp to closest 5 second
 | $date_trunc_4second  :[column_name] -> round down timestamp to closest 4 second
 | $date_trunc_3second  :[column_name] -> round down timestamp to closest 3 second
 | $date_trunc_2second  :[column_name] -> round down timestamp to closest 2 second
 | $date_trunc_30minute  :[column_name] -> round down timestamp to closest 30 minute
 | $date_trunc_15minute  :[column_name] -> round down timestamp to closest 15 minute
 | $date_trunc_30second  :[column_name] -> round down timestamp to closest 30 second
 | $date_trunc_15second  :[column_name] -> round down timestamp to closest 15 second
 | $date_trunc_10second  :[column_name] -> round down timestamp to closest 10 second
 | $date_trunc_millennium  :[column_name] -> round down timestamp to closest  millennium
 | $date_trunc_microseconds  :[column_name] -> round down timestamp to closest  microseconds
 | $date_trunc_milliseconds  :[column_name] -> round down timestamp to closest  milliseconds

 | $ts_headline_english  :[column_name <string>, search_term: <string | { to_tsquery: string } > ] -> sha512 hash of the of column content


 */
