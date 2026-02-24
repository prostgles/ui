import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import Btn from "@components/Btn";
import { FlexRowWrap } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { SearchList } from "@components/SearchList/SearchList";
import { Select } from "@components/Select/Select";
import {
  mdiDatabaseEdit,
  mdiDatabaseOff,
  mdiTable,
  mdiTableEye,
  mdiTableSearch,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { JSONB } from "prostgles-types";
import React from "react";

export type DatabaseAccessPermission = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
>["suggested_database_access"];

type P = {
  value: DatabaseAccessPermission | undefined;
  onChange?: (newValue: DatabaseAccessPermission) => void;
  contentRight?: React.ReactNode;
};
export const DatabaseAccessEditor = ({ value, onChange, contentRight }: P) => {
  const { tables } = usePrgl();

  return (
    <FlexRowWrap
      className="gap-p5 ai-start"
      data-command="DatabaseAccessEditor"
    >
      <Icon className="text-1 mt-p25" path={mdiTableEye} />
      <Select
        label={{ label: "Data access" }}
        value={value?.mode}
        data-command="DatabaseAccessEditor.Mode"
        btnProps={
          value && value.mode !== "none" ?
            {
              color: "action",
            }
          : {}
        }
        fullOptions={
          [
            {
              key: "none",
              label: "None",
              subLabel: "Cannot interact with the database.",
              iconPath: mdiDatabaseOff,
            },
            {
              key: "execute_sql_with_rollback",
              label: "Run readonly SQL",
              subLabel: "Can run readonly SQL queries",
              iconPath: mdiTableSearch,
            },
            {
              key: "execute_sql_with_commit",
              label: "Run commited SQL",
              subLabel:
                "Can run SQL queries that will be commited. Use with caution",
              iconPath: mdiDatabaseEdit,
            },
            {
              key: "custom",
              label: "Custom",
              subLabel: "Can only access specific tables, rows and columns",
              iconPath: mdiTable,
            },
          ] as const
        }
        onChange={(dataAccess) => {
          void onChange?.(
            dataAccess === "custom" ?
              {
                mode: dataAccess,
                tablePermissions: {},
              }
            : {
                mode: dataAccess,
              },
          );
        }}
      />
      {contentRight}
      {value?.mode === "custom" && (
        <div
          className="w-full pl-2"
          data-command="DatabaseAccessEditor.TableRules"
        >
          <SearchList
            id="custom-tables"
            className="shadow"
            style={{
              maxHeight: "min(400px, calc(100vh - 100px)",
            }}
            placeholder={`Search ${tables.length} tables & views`}
            limit={200}
            items={tables
              .toSorted((a, b) => {
                const aRule = value.tablePermissions[a.name];
                const bRule = value.tablePermissions[b.name];
                /** Bring tables with rules first */
                if (aRule && !bRule) return -1;
                if (!aRule && bRule) return 1;
                return a.name.localeCompare(b.name);
              })
              .map((t) => {
                const tableRules = value.tablePermissions[t.name] ?? {};

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
                  title: t.name,
                  rowStyle: { border: "1px solid var(--b-default)" },
                  contentLeft: (
                    <Icon
                      className="mr-p5 text-2"
                      title={t.info.isView ? "View" : "Table"}
                      path={t.info.isView ? mdiTableEye : mdiTable}
                    />
                  ),
                  contentRight: (
                    <>
                      {(["select", "insert", "update", "delete"] as const).map(
                        (ruleType) => {
                          const isOn = tableRules[ruleType];
                          return (
                            <Btn
                              key={ruleType}
                              color={isOn ? "action" : "default"}
                              variant={isOn ? "filled" : undefined}
                              size="small"
                              onClick={() => {
                                const shouldTurnOn = !isOn;
                                const newTableRules = {
                                  ...value.tablePermissions,
                                  [t.name]: {
                                    ...tableRules,
                                    [ruleType]: shouldTurnOn || undefined,
                                  },
                                } as const;
                                void onChange?.({
                                  mode: "custom",
                                  tablePermissions: newTableRules,
                                });
                              }}
                            >
                              {ruleType.toUpperCase()}
                            </Btn>
                          );
                        },
                      )}
                    </>
                  ),
                };
              })}
          />
        </div>
      )}
    </FlexRowWrap>
  );
};
