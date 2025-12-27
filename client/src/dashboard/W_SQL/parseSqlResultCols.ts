import type { SQLResult } from "prostgles-client/dist/prostgles";
import { PALETTE } from "../Dashboard/PALETTE";
import { getColWidth } from "../W_Table/tableUtils/getColWidth";
import type { W_SQL } from "./W_SQL";

export const parseSqlResultCols = function (
  this: W_SQL,
  {
    fields,
    isSelect,
    rows,
    sql,
    trimmedSql,
  }: {
    rows: string[][];
    fields: SQLResult<"stream">["fields"];
    isSelect: boolean;
    trimmedSql: string;
    sql: string;
  },
) {
  const w = this.d.w;
  if (!w) return;
  const _cols = getFieldsWithActions(fields, isSelect);
  const keyedRows = rows.map((r) =>
    r.reduce((a, v, i) => ({ ...a, [i]: v }), {}),
  );
  const colsWithWidth =
    !_cols.length ?
      []
    : getColWidth(
        _cols,
        keyedRows,
        "idx",
        this.ref?.getBoundingClientRect().width,
      );
  const cols = colsWithWidth;
  w.$update(
    { options: { sqlResultCols: cols, lastSQL: isSelect ? trimmedSql : "" } },
    { deepMerge: true },
  );

  const geoCols = cols.filter((c) => c.udt_name.startsWith("geo"));
  if (geoCols.length) {
    this.props.myLinks.forEach((l) => {
      if (!l.closed && !l.deleted && l.options.type === "map") {
        const newCols = l.options.columns
          .slice(0)
          .filter((c) => geoCols.some((nc) => nc.name === c.name));
        geoCols.forEach((c) => {
          if (!newCols.some((nc) => nc.name === c.name)) {
            newCols.push({
              name: c.name,
              colorArr: PALETTE.c1.getDeckRGBA(),
            });
          }
        });

        l.$update({
          options: {
            ...l.options,
            columns: newCols,
            dataSource: {
              type: "sql",
              sql,
              withStatement: "",
            },
          },
        });
      }
    });
  }
  return cols;
};

export const getFieldsWithActions = (
  fields: SQLResult<"stream">["fields"],
  isSelect: boolean,
) =>
  fields.map((f, idx) => ({
    ...f,
    idx,
    key: f.name,
    label: f.name,
    subLabel: f.dataType,
    sortable: isSelect && !["xml", "json"].includes(f.dataType),
  }));
