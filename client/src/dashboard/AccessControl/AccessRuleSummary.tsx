import { mdiTextBoxSearchOutline } from "@mdi/js";
import type { FieldFilter } from "prostgles-types";
import { isObject } from "prostgles-types";
import React from "react";
import type { CustomTableRules } from "../../../../commonTypes/publishUtils";
import Chip from "../../components/Chip";
import { LabeledRow } from "../../components/LabeledRow";
import type { EditedAccessRule } from "./AccessControl";

type TableRuleSummary = {
  tableName: string;
  s: string;
  i: string;
  d: string;
  u: string;
};

type P = {
  rule: EditedAccessRule["dbPermissions"];
  className?: string;
  style?: React.CSSProperties;
};
export const ACCESS_RULE_METHODS = [
  "insert",
  "select",
  "update",
  "delete",
] as const;

export const AccessRuleSummary = ({
  rule: r,
  style,
  className = "",
}: P): JSX.Element => {
  const CLASSES = {
    i: "text-green",
    s: "text-1p5",
    u: "text-warning",
    d: "text-danger",
  } as const;

  const summarizeFieldFilter = (f: FieldFilter | undefined) => {
    let fieldList = "";
    if (f === "*") {
      fieldList = "*";
    } else if (Array.isArray(f)) {
      fieldList = f.join(", ");
    } else if (isObject(f)) {
      const fList = Object.keys(f).join(", ");
      fieldList = Object.values(f).some((v) => !v) ? `except ${fList}` : fList;
    }
    return fieldList;
  };

  if (r.type === "Run SQL") {
    return (
      <span className={"AccessRuleSummary bold " + className} style={style}>
        Full database access
      </span>
    );
  } else if (r.type === "All views/tables") {
    const allowedMethods = ACCESS_RULE_METHODS.filter((v) =>
      r.allowAllTables.includes(v),
    );

    return (
      <div
        className={"AccessRuleSummary flex-row-wrap gap-p25 " + className}
        style={style}
      >
        <div className="flex-row gap-p25">
          {allowedMethods.map((a) => (
            <div
              key={a}
              className={CLASSES[a[0] as any].replace("text", "bb-2 b")}
            >
              {a}
            </div>
          ))}
        </div>
        actions allowed to
        <div className="bold">all tables/views</div>
        within public schema of the database
      </div>
    );
  } else if ((r as any).type === "Custom") {
    const c: CustomTableRules["customTables"] = r.customTables;

    const tableRules: TableRuleSummary[] = c
      .filter((t) => t.select || t.delete || t.insert || t.update)
      .map((t) => {
        return {
          tableName: t.tableName,
          // s: !t.select? "" : `${summarizeFieldFilter((t.select === true)? "*" : t.select? t.select.fields : undefined)} ${isObject(t.select) && t.select.forcedFilterDetailed? " filtered" : " all"}`,
          // i: !t.insert? "" : `${summarizeFieldFilter((t.insert === true)? "*" : t.insert? t.insert.fields : undefined)}`,
          // d: !t.delete? "" : `${isObject(t.delete) && t.delete.forcedFilterDetailed? " filtered" : " all"}`,
          // u: !t.update? "" : `${summarizeFieldFilter((t.update === true)? "*" : t.update? t.update.fields : undefined)} ${isObject(t.update) && t.update.forcedFilterDetailed? " filtered" : " all"}`
          s: !t.select ? "" : "\u25A0",
          u: !t.update ? "" : "\u25A0",
          i: !t.insert ? "" : "\u25A0",
          d: !t.delete ? "" : "\u25A0",
        };
      });

    const chipWrapper = (tableRules: TableRuleSummary[]) => (
      <div
        className="pl-1 pt-p5 flex-row-wrap gap-p5 o-auto no-scroll-bar"
        style={{
          maxHeight: "200px",
          overflow: "auto",
        }}
      >
        {tableRules.map((r, i) => (
          <Chip key={i}>
            <div className="flex-row-wrap gap-p5">
              {r.tableName}
              <div className="flex-row gap-p25 ai-center">
                {r.i && (
                  <span title="Insert/add data" className={CLASSES.i}>
                    {r.i}
                  </span>
                )}
                {r.s && (
                  <span title="Select/view data" className={CLASSES.s}>
                    {r.s}
                  </span>
                )}
                {r.u && (
                  <span title="Update/edit data" className={CLASSES.u}>
                    {r.u}
                  </span>
                )}
                {r.d && (
                  <span title="Delete/remove data" className={CLASSES.d}>
                    {r.d}
                  </span>
                )}
              </div>
            </div>
          </Chip>
        ))}
      </div>
    );

    return (
      <LabeledRow
        className={"AccessRuleSummary " + className}
        style={style}
        icon={mdiTextBoxSearchOutline}
        label={"Tables/views: (" + tableRules.length + ")"}
        noContentWrapper={true}
      >
        {chipWrapper(tableRules)}
      </LabeledRow>
    );
  }

  return <></>;
};
