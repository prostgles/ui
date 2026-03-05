import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { FlexRowWrap } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import {
  SearchList,
  type SearchListItem,
} from "@components/SearchList/SearchList";
import { Select } from "@components/Select/Select";
import {
  mdiDatabaseEdit,
  mdiDatabaseOff,
  mdiTable,
  mdiTableEye,
  mdiTableSearch,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isDefined, isEmpty, type JSONB } from "prostgles-types";
import React, { useState } from "react";
import type {
  DBSchemaTableColumn,
  DBSchemaTableWJoins,
} from "../Dashboard/dashboardUtils";
import { TableAccessEditor } from "./TableAccessEditor";
import { type ViewMode } from "./ViewModeToggle";

export type DatabaseAccessPermission = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
>["suggested_database_access"];

type P = {
  value: DatabaseAccessPermission | undefined;
  onChange: undefined | ((newValue: DatabaseAccessPermission) => void);
  contentRight?: React.ReactNode;
  newTables: DBSSchema["agentic_workflows"]["definition_data"]["newTables"];
};
export const DatabaseAccessEditor = ({
  value,
  onChange,
  contentRight,
  newTables,
}: P) => {
  const { tables } = usePrgl();
  const [viewMode, setViewMode] = useState<ViewMode>("Overview");
  return (
    <FlexRowWrap
      className="gap-p5 ai-start"
      data-command="DatabaseAccessEditor"
    >
      <Icon className="text-1" path={mdiTableEye} />

      <Select
        label={{ label: "Data access" }}
        value={value?.mode ?? "none"}
        data-command="DatabaseAccessEditor.Mode"
        btnProps={{
          color: value ? "action" : undefined,
        }}
        fullOptions={MODES}
        onChange={
          !onChange ? undefined : (
            (dataAccess) => {
              void onChange(
                dataAccess === "none" ? undefined
                : dataAccess === "custom" ?
                  {
                    mode: dataAccess,
                    tablePermissions: {},
                  }
                : {
                    mode: dataAccess,
                  },
              );
            }
          )
        }
      />

      {contentRight}
      {value?.mode === "custom" && (
        <div
          className="w-full pl-2"
          data-command="DatabaseAccessEditor.TableRules"
        >
          {/* <ViewModeToggle
            className="w-fit mb-p5"
            onChange={setViewMode}
            value={viewMode}
            allowedValues={getEntries(value.tablePermissions)
              .map(([_, permissions]) => {
                return getKeys(permissions);
              })
              .filter(isDefined)
              .flat()}
          /> */}
          <SearchList
            id="custom-tables"
            style={{
              maxHeight: "min(400px, calc(100vh - 100px)",
            }}
            placeholder={`Search ${tables.length} tables & views`}
            limit={200}
            listStyle={{
              display: "grid",
              gridTemplateColumns: "max-content 1fr",
              gap: "0.5em",
              alignItems: "center",
            }}
            items={tables
              .concat(
                newTables
                  ?.filter((nt) => !tables.some((t) => t.name === nt.name))
                  .map(
                    (t) =>
                      ({
                        joins: [],
                        joinsV2: [],
                        label: t.name,
                        name: t.name,
                        info: { oid: -1, isView: false },
                        columns: t.columns.map(
                          ({ name, dataType }) =>
                            ({
                              oid: -1,
                              name,
                              label: name,
                              comment: "",
                              icon: undefined,
                              delete: true,
                              ordinal_position: -1,
                              is_nullable: true,
                              is_updatable: true,
                              is_generated: true,
                              udt_name: "text",
                              data_type: dataType,
                              tsDataType: "string",
                              element_type: undefined,
                              element_udt_name: undefined,
                              is_pkey: false,
                              has_default: false,
                              select: true,
                              insert: true,
                              update: true,
                              orderBy: true,
                              filter: true,
                            }) as DBSchemaTableColumn,
                        ),
                      }) as DBSchemaTableWJoins,
                  ) ?? [],
              )
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
                if (!onChange && isEmpty(tableRules)) {
                  return;
                }
                return {
                  key: t.name,
                  title: t.name,
                  styles: {
                    labelWrapper: {
                      fontWeight: 700,
                      ...(!onChange && { flex: "unset" }),
                    },
                    label: {
                      fontWeight: 700,
                      fontSize: "16px",
                    },
                    rowInner: {
                      display: "contents",
                      ...(window.isLowWidthScreen && {
                        flexDirection: "column",
                        gap: "1em",
                        alignItems: "start",
                        overflow: "auto",
                      }),
                    },
                  },
                  rowStyle: {
                    padding: "0.25em",
                    ...(onChange ?
                      {
                        border: "1px solid var(--b-default)",
                      }
                    : {
                        /** Disable focus */
                        background: "unset",
                      }),
                    display: "contents",
                  },
                  contentRight: (
                    <>
                      <TableAccessEditor
                        value={tableRules}
                        table={t}
                        viewMode={viewMode}
                        onChange={
                          onChange &&
                          ((newTableRules) => {
                            const newTablePermissions = {
                              ...value.tablePermissions,
                              [t.name]: newTableRules,
                            } as const;
                            void onChange({
                              mode: "custom",
                              tablePermissions: newTablePermissions,
                            });
                          })
                        }
                      />
                    </>
                  ),
                } satisfies SearchListItem;
              })
              .filter(isDefined)}
          />
        </div>
      )}
    </FlexRowWrap>
  );
};

const MODES = [
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
    subLabel: "Can run SQL queries that will be commited. Use with caution",
    iconPath: mdiDatabaseEdit,
  },
  {
    key: "custom",
    label: "Custom",
    subLabel: "Can only access specific tables, rows and columns",
    iconPath: mdiTable,
  },
] as const;
