import { isDefined } from "@common/filterUtils";
import { isObject } from "@common/publishUtils";
import { fromEntries } from "@common/utils";
import { FlexRow } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { includes } from "prostgles-types";
import React, { useCallback, useMemo } from "react";
import { isEmpty } from "src/utils/utils";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { DatabaseAccessPermission } from "./DatabaseAccessEditor";

export type TableAccessPermissions = Extract<
  DatabaseAccessPermission,
  { mode: "custom" }
>["tablePermissions"][string];

export const TABLE_RULE_TYPES = [
  "select",
  "insert",
  "update",
  "delete",
] as const;

export type TableRuleType = (typeof TABLE_RULE_TYPES)[number];

const COLUMN_ACCESS_RULES_BY_PRIORITY = [
  "update",
  "insert",
  "select",
] as const satisfies TableRuleType[];

export const TableAccessDetails = ({
  value,
  table,
}: {
  value: TableAccessPermissions;
  table: DBSchemaTableWJoins;
}) => {
  const parseFieldFilter = useCallback(
    (fieldFilter: Extract<typeof value.select, { fields: any }>["fields"]) => {
      if (fieldFilter === "*") {
        return { type: "all" } as const;
      }
      const keys = Object.keys(fieldFilter);
      const isInclusive = keys.every((key) => fieldFilter[key]);
      return {
        type: isInclusive ? "inclusive" : "exclusive",
        keys,
      } as const;
    },
    [value],
  );

  const ruleColumns = useMemo(() => {
    const selectFields =
      value.select &&
      parseFieldFilter(isObject(value.select) ? value.select.fields : "*");

    const insertFields =
      value.insert &&
      parseFieldFilter(isObject(value.insert) ? value.insert.fields : "*");

    const updateFields =
      value.update &&
      parseFieldFilter(isObject(value.update) ? value.update.fields : "*");

    return {
      select: selectFields,
      insert: insertFields,
      update: updateFields,
    };
  }, [parseFieldFilter, value.insert, value.select, value.update]);

  const columnHasAccess = useCallback(
    (columnName: string, ruleName: keyof typeof ruleColumns) => {
      const columnRules = ruleColumns[ruleName];
      if (!columnRules) return false;
      if (columnRules.type === "all") return true;
      const hasKey = columnRules.keys.includes(columnName);
      return columnRules.type === "inclusive" ? hasKey : !hasKey;
    },
    [ruleColumns],
  );

  const columnsWithAccess = useMemo(() => {
    return table.columns
      .map((col) => {
        const access = fromEntries(
          COLUMN_ACCESS_RULES_BY_PRIORITY.map((ruleName) => {
            const hasAccess = columnHasAccess(col.name, ruleName);
            if (!hasAccess) {
              return;
            }
            return [ruleName, hasAccess] as const;
          }).filter(isDefined),
        ) as Partial<
          Record<(typeof COLUMN_ACCESS_RULES_BY_PRIORITY)[number], true>
        >;
        if (isEmpty(access)) {
          return;
        }
        return {
          ...col,
          access,
        };
      })
      .filter(isDefined)
      .toSorted((a, b) => {
        /** order by COLUMN_ACCESS_RULES */
        const aRuleIndex = COLUMN_ACCESS_RULES_BY_PRIORITY.findIndex(
          (rule) => a.access[rule],
        );
        const bRuleIndex = COLUMN_ACCESS_RULES_BY_PRIORITY.findIndex(
          (rule) => b.access[rule],
        );
        if (aRuleIndex !== bRuleIndex) {
          return aRuleIndex - bRuleIndex;
        }

        return a.ordinal_position - b.ordinal_position;
      });
  }, [columnHasAccess, table.columns]);

  const TABLE_RULE_COLORS = {
    insert: "var(--b-light-green)",
    select: "var(--text-action)",
    update: "var(--b-warning)",
  } as const;
  return (
    <FlexRow>
      <ScrollFade
        className="ox-auto flex-row gap-p25"
        style={{ maxWidth: "500px" }}
      >
        {columnsWithAccess.map((col) => {
          const colAccessByNormalOrder = TABLE_RULE_TYPES.map((rule) =>
            col[rule] && includes(COLUMN_ACCESS_RULES_BY_PRIORITY, rule) ?
              rule
            : undefined,
          ).filter(isDefined);
          return (
            <FlexRow
              key={col.name}
              className="gap-p5 rounded bg-color-2 px-p5 py-p25 f-none"
            >
              {col.name}{" "}
              <div
                title={colAccessByNormalOrder.join(", ")}
                className="pointer"
              >
                {colAccessByNormalOrder.map((rule) => (
                  <span key={rule} style={{ color: TABLE_RULE_COLORS[rule] }}>
                    {"\u25A0"}
                  </span>
                ))}
              </div>
            </FlexRow>
          );
        })}
      </ScrollFade>
    </FlexRow>
  );
};
