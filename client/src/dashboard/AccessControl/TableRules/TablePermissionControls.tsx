import { mdiAlertCircleOutline, mdiCog } from "@mdi/js";
import { getKeys, isObject } from "prostgles-types";
import React, { useState } from "react";
import type { GroupedDetailedFilter } from "../../../../../commonTypes/filterUtils";
import type {
  BasicTablePermissions,
  ContextDataObject,
  SelectRule,
  TableRules,
  TableRulesErrors,
  UpdateRule,
} from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import { useFileTableRefTableRules } from "./FileTableAccessControlInfo";
import { TableRulesPopup } from "./TableRulesPopup";
import { useLocalTableRulesErrors } from "./useLocalTableRulesErrors";

export type TableInfoWithRules = DBSchemaTablesWJoins[number] & {
  rule?: TableRules;
};

export type TablePermissionControlsProps = Pick<CommonWindowProps, "prgl"> & {
  tableRules: TableRules;
  tablesWithRules: TableInfoWithRules[];
  variant?: "mini" | "micro";
  className?: string;
  style?: React.CSSProperties;
  onChange: (newValues: TableRules) => void;
  table?: DBSchemaTablesWJoins[number];
  contextData?: ContextDataObject;
  errors: TableRulesErrors;
  userTypes: string[];
};

export const getBasicPermissions = (
  rules: TableRules = {},
): BasicTablePermissions => {
  return getKeys(rules).reduce(
    (a, ruleType) => ({
      ...a,
      [ruleType]: Boolean(rules[ruleType]),
    }),
    {},
  );
};
export const TABLE_RULE_LABELS = {
  select: {
    label: { micro: "S", mini: "Select", default: "Select/View all records" },
    title: "View records",
  },
  insert: {
    label: { micro: "I", mini: "Insert", default: "Insert/Add new records" },
    title: "Insert/Add records",
  },
  update: {
    label: { micro: "U", mini: "Update", default: "Update/Edit records" },
    title: "Edit data",
  },
  delete: {
    label: { micro: "D", mini: "Delete", default: "Delete/Remove records" },
    title: "Remove records",
  },
  sync: {
    label: { micro: "R", mini: "Sync", default: "Sync records" },
    title: "Sync records",
  },
} as const;

export type EditedRuleType = keyof typeof TABLE_RULE_LABELS;

export const TablePermissionControls = (
  props: TablePermissionControlsProps,
) => {
  const {
    tableRules,
    onChange,
    className = "",
    table,
    errors,
    style,
    tablesWithRules: allRules,
  } = props;
  const variant = props.variant ?? (window.innerWidth < 630 ? "micro" : "mini");

  const [editedRuleType, setEditedRuleType] = useState<EditedRuleType>();

  // const localTableRulesErrors = usePromise(async () => {
  //   if(!table || !contextData?.user || !localTableRules) return;

  //   const columnNames = table.columns.map(c => c.name);
  //   const tableRErrs = await getTableRulesErrors(omitKeys(localRules, ["tableName" as any]), columnNames, contextData);
  //   return tableRErrs;
  // }, [localRules, table, contextData, localTableRules]);
  const localTableRulesErrors = useLocalTableRulesErrors(props);

  const tableErrors = localTableRulesErrors ?? errors;

  const fileTableRefRules = useFileTableRefTableRules({
    table,
    tablesWithRules: allRules,
  });

  return (
    <div
      className={
        "TablePermissionControls gap-p25 flex-row ai-center " + className
      }
      style={{
        ...style,
        gap: fileTableRefRules.refTables ? "14px" : "8px",
        paddingRight: fileTableRefRules.refTables ? "8px" : 0,
      }}
    >
      {table && editedRuleType && (
        <TableRulesPopup
          {...props}
          tableErrors={tableErrors}
          table={table}
          editedRuleType={editedRuleType}
          onClose={() => setEditedRuleType(undefined)}
        />
      )}
      {getKeys(TABLE_RULE_LABELS).map((ruleType) => {
        if (ruleType === "sync") {
          return null;
        }

        const error = tableErrors[ruleType];
        const rule = tableRules[ruleType];
        const fileRefRules = fileTableRefRules.refTables?.filter((rt) =>
          Object.values(rt.colRules).some((colRule) => colRule[ruleType]),
        );
        const isOn =
          rule ? "on"
          : fileRefRules && fileRefRules.length ? "file-table-with-refs"
          : undefined;

        const disabledInfo =
          table?.info.isView && ruleType !== "select" ?
            "Can only select from a view"
          : undefined;

        return (
          <div key={ruleType} className="flex-row ai-center gap-p25">
            <Btn
              data-command={`${ruleType}Rule`}
              disabledInfo={disabledInfo}
              size="small"
              className={isOn ? " " : " "}
              variant={
                isOn === "on" ? "filled"
                : isOn === "file-table-with-refs" ?
                  "faded"
                : undefined
              }
              iconPath={fileRefRules ? mdiCog : undefined}
              iconPosition={fileRefRules ? "right" : undefined}
              color={isOn ? "action" : undefined}
              style={{
                padding: ".5em .75em",
                ...(fileRefRules ? { gap: "8px" } : {}),
              }}
              onClick={() => {
                if (table?.info.isFileTable) {
                  setEditedRuleType(ruleType);
                  return;
                }
                const userIdField = table?.columns.find(
                  (c) =>
                    c.udt_name === "uuid" &&
                    (c.name === "user_id" ||
                      (table.name === "users" && c.name === "id")),
                );
                if (!isOn && userIdField) {
                  const forcedFilterDetailed: GroupedDetailedFilter = {
                    $and: [
                      {
                        fieldName: userIdField.name,
                        type: "=",
                        contextValue: {
                          objectName: "user",
                          objectPropertyName: "id",
                        },
                      },
                    ],
                  };
                  const checkFilterDetailed: UpdateRule["checkFilterDetailed"] =
                    forcedFilterDetailed;
                  if (ruleType === "delete") {
                    onChange({
                      [ruleType]: {
                        forcedFilterDetailed,
                        filterFields: "*",
                      },
                    });
                  } else if (ruleType === "insert" || ruleType === "update") {
                    onChange({
                      [ruleType]: {
                        fields: "*",
                        checkFilterDetailed,
                        ...(ruleType === "update" && {
                          forcedFilterDetailed,
                        }),
                      },
                    });
                  } else if ((ruleType as any) === "select") {
                    onChange({
                      [ruleType]: {
                        forcedFilterDetailed,
                        fields: "*",
                        subscribe: {},
                      },
                    } satisfies { select: SelectRule });
                  }
                } else {
                  onChange({ [ruleType]: !rule });
                }
              }}
            >
              {TABLE_RULE_LABELS[ruleType].label[variant].toUpperCase()}
            </Btn>

            {!!table && !fileRefRules && (
              <Btn
                data-command={`${ruleType}RuleAdvanced`}
                size="small"
                className={
                  isObject(rule) || error ? "" : "show-on-parent-hover"
                }
                style={{
                  visibility: rule ? undefined : "hidden",
                }}
                iconPath={error ? mdiAlertCircleOutline : mdiCog}
                color={
                  error ? "danger"
                  : isObject(rule) ?
                    "action"
                  : undefined
                }
                onClick={() => {
                  setEditedRuleType(ruleType);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
