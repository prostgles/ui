import { mdiFile, mdiTable, mdiTableEye } from "@mdi/js";
import { getKeys } from "prostgles-types";
import React, { useState } from "react";
import type { TableRules } from "../../../../../commonTypes/publishUtils";
import { FlexCol } from "../../../components/Flex";
import { Icon } from "../../../components/Icon/Icon";
import SearchList from "../../../components/SearchList/SearchList";
import { SwitchToggle } from "../../../components/SwitchToggle";
import type { EditedAccessRule } from "../AccessControl";
import type { PermissionEditProps } from "../AccessControlRuleEditor";
import type { TableInfoWithRules } from "../TableRules/TablePermissionControls";
import { TablePermissionControls } from "../TableRules/TablePermissionControls";

type DBPermissionCustomTables<
  T extends EditedAccessRule["dbPermissions"]["type"],
> = Extract<EditedAccessRule["dbPermissions"], { type: T }>;

export type DBPermissionEditorProps<
  T extends EditedAccessRule["dbPermissions"]["type"],
> = PermissionEditProps & {
  dbPermissions: DBPermissionCustomTables<T>;
  onChange: (n: DBPermissionCustomTables<T>) => void;
  tablesWithRules: TableInfoWithRules[];
};

export const PCustomTables = ({
  dbPermissions,
  onChange,
  contextData,
  prgl,
  userTypes,
  tablesWithRules,
  editedRule,
}: DBPermissionEditorProps<"Custom">) => {
  const { tables } = prgl;
  const [hideNoRules, setHideNoRules] = useState(false);

  const tableRules = Object.fromEntries(
    (["select", "insert", "update", "delete"] as const).map((ruleType) => {
      const allCustomTablesMatchRule =
        dbPermissions.customTables.length > 0 &&
        dbPermissions.customTables.some((ct) => {
          const table = tables.find((t) => t.name === ct.tableName);
          const ruleIsPossible =
            table?.info.isView ? ruleType === "select" : true;
          return !ruleIsPossible || ct[ruleType];
        });
      return [ruleType, allCustomTablesMatchRule];
    }),
  );

  const [initialOrder, setInitialOrder] = useState(
    tablesWithRules.map((t) => t.name),
  );
  return (
    <FlexCol
      className="PCustomTables gap-0 min-h-0 h-fit"
      style={{ maxHeight: "60vh" }}
    >
      <div className="f-1 jc-end ai-end flex-row">
        <SwitchToggle
          label="Show allowed only"
          disabledInfo={
            dbPermissions.customTables.length ?
              undefined
            : "No allowed tables to show"
          }
          className="flex-row ai-center gap-p5"
          style={{ flexDirection: "row-reverse" }}
          checked={hideNoRules}
          onChange={(v) => {
            setHideNoRules(v);
            setInitialOrder(tablesWithRules.map((t) => t.name));
          }}
        />
      </div>
      <div className="flex-row-wrap gap-p5 ai-center p-p5 py-1 ">
        <div className="mr-auto bold text-2 noselect">
          Toggle All ({tables.length} tables)
        </div>
        <TablePermissionControls
          prgl={prgl}
          userTypes={userTypes}
          contextData={contextData}
          className=" pr-2  mr-p25 "
          style={{
            gap: "2.5em",
          }}
          errors={{}}
          tableRules={tableRules}
          tablesWithRules={[]}
          onChange={(newTableRules) => {
            const newDbPermissions = {
              ...dbPermissions,
            };
            newDbPermissions.customTables = tables
              .map((t) => {
                const existingRule = newDbPermissions.customTables.find(
                  (ct) => ct.tableName === t.name,
                );
                const tableRules = existingRule ?? { tableName: t.name };
                const toggledRuleName = getKeys(newTableRules)[0]!;
                if (t.info.isView && toggledRuleName !== "select") {
                  // Ignore non-select rule for views
                } else {
                  tableRules[toggledRuleName] =
                    newTableRules[toggledRuleName] ? true : undefined;
                }
                return tableRules;
              })
              .filter((t) => t.select || t.insert || t.update || t.delete);

            onChange(newDbPermissions);
          }}
        />
      </div>
      <SearchList
        id="custom-tables"
        className="shadow"
        placeholder={`Search ${tables.length} tables & views`}
        limit={200}
        items={tablesWithRules
          .filter((t) => {
            if (!hideNoRules || t.info.isFileTable) return true;
            return (
              t.rule &&
              ["select", "insert", "update", "delete"].some((ruleType) => {
                return t.rule?.[ruleType];
              })
            );
          })
          .sort(
            (a, b) =>
              initialOrder.indexOf(a.name) - initialOrder.indexOf(b.name),
          )
          .map((t) => {
            const existingRule = dbPermissions.customTables.find(
              (ct) => ct.tableName === t.name,
            );
            const tableRules: TableRules & { tableName: string } =
              existingRule ?? { tableName: t.name };

            const setTableRules = (rules?: TableRules) => {
              if (rules) {
                getKeys(rules).forEach((key) => {
                  if (key === "select") {
                    tableRules[key] = rules[key];
                  } else if (key === "insert") {
                    tableRules[key] = rules[key];
                  } else if (key === "delete") {
                    tableRules[key] = rules[key];
                  } else if (key !== "sync" && key !== "subscribe") {
                    tableRules[key] = rules[key];
                  }
                });
                const newDbPermissions = {
                  ...dbPermissions,
                  customTables: dbPermissions.customTables,
                };
                if (!existingRule) {
                  newDbPermissions.customTables.push(tableRules);
                } else {
                  newDbPermissions.customTables =
                    newDbPermissions.customTables.map((ct) =>
                      ct.tableName === t.name ? tableRules : ct,
                    );
                }

                onChange(newDbPermissions);
              }
            };

            const icon =
              t.info.isFileTable ? { path: mdiFile, title: "File table" }
              : t.info.isView ? { title: "View", path: mdiTableEye }
              : { title: "Table", path: mdiTable };
            const isNotFromWorkspaceTables =
              !t.info.isFileTable &&
              !editedRule?.newRule?.dbsPermissions?.createWorkspaces &&
              editedRule?.worspaceTableAndColumns?.length &&
              !editedRule.worspaceTableAndColumns.some(
                (wt) => wt.tableName === t.name,
              );
            return {
              key: t.name,
              styles: {
                labelWrapper: {
                  fontWeight: 500,
                  minWidth: "60px",
                },
                rowInner:
                  window.isLowWidthScreen ?
                    {
                      flexDirection: "column",
                      gap: "1em",
                      alignItems: "start",
                      overflow: "auto",
                    }
                  : {},
              },
              disabledInfo:
                isNotFromWorkspaceTables ?
                  "Cannot allow non workspace tables"
                : undefined,
              title: t.name,
              rowStyle: { border: "1px solid var(--b-default)" },
              contentLeft: (
                <Icon
                  className="mr-p5 text-2"
                  title={icon.title}
                  path={icon.path}
                />
              ),
              contentRight: (
                <TablePermissionControls
                  key={t.name}
                  className={window.isLowWidthScreen ? "" : "ml-1"}
                  prgl={prgl}
                  userTypes={userTypes}
                  contextData={contextData}
                  errors={{}}
                  table={t}
                  tableRules={tableRules}
                  tablesWithRules={tablesWithRules}
                  onChange={(val) => {
                    setTableRules(val);
                  }}
                />
              ),
            };
          })}
      />
    </FlexCol>
  );
};
