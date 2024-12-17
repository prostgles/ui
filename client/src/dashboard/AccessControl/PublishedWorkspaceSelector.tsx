import { mdiViewQuilt } from "@mdi/js";
import type { ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import { SwitchToggle } from "../../components/SwitchToggle";
import { isDefined } from "../../utils";
import { useIsMounted } from "../Backup/CredentialSelector";
import type { DBS } from "../Dashboard/DBS";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type {
  DBSchemaTablesWJoins,
  WindowData,
} from "../Dashboard/dashboardUtils";
import { useEffectAsync } from "../DashboardMenu/DashboardMenuSettings";
import type { DeepPartial } from "../RTComp";
import { SmartSelect } from "../SmartSelect";
import type { AccessRule } from "./AccessControl";
import { SectionHeader } from "./AccessControlRuleEditor";
import { FlexCol } from "../../components/Flex";

type P = Pick<CommonWindowProps, "prgl"> & {
  dbsPermissions: DeepPartial<AccessRule["dbsPermissions"]>;
  dbPermissions: DeepPartial<AccessRule["dbPermissions"]>;
  onChange: (dbsPermissions: AccessRule["dbsPermissions"]) => void;
  onChangeRule: (ruleDelta: DeepPartial<AccessRule>) => void;
  className?: string;
  style?: React.CSSProperties;
  wspError: string | undefined;
  onSetError: (error?: string) => void;
  tables: DBSchemaTablesWJoins;
};

export const PublishedWorkspaceSelector = ({
  prgl: { dbs, connectionId },
  dbsPermissions,
  onChange,
  onChangeRule,
  dbPermissions,
  className = "",
  style,
  onSetError,
  tables,
}: P) => {
  const { data: publishedWorkspaces } = dbs.workspaces.useSubscribe(
    { published: true, connection_id: connectionId },
    {},
  );
  const getIsMounted = useIsMounted();

  useEffectAsync(async () => {
    let wspErrors: string | undefined = undefined;
    const workspaceIds =
      dbsPermissions?.viewPublishedWorkspaces?.workspaceIds ?? [];
    if (workspaceIds.length) {
      const wsps = await dbs.workspaces.find({ "id.$in": workspaceIds });
      if (!getIsMounted()) return;
      const missingWorkspaceIds = workspaceIds.filter(
        (wid) => !wsps.some((w) => w.id === wid),
      );
      if (missingWorkspaceIds.length) {
        onSetError(
          `${missingWorkspaceIds.length} Published workspaces not found: \n  ${missingWorkspaceIds.join("\n ")}`,
        );
        return;
      }
      const { msg } = await getWorkspaceTables(
        dbs,
        workspaceIds,
        dbPermissions,
        tables,
      );
      if (!getIsMounted()) return;
      if (msg) {
        wspErrors = msg;
      }
    }

    if (
      !wspErrors &&
      !dbsPermissions?.createWorkspaces &&
      !dbsPermissions?.viewPublishedWorkspaces?.workspaceIds?.length
    ) {
      wspErrors =
        "Must allow 'Create workspaces' or select at least one workspace within 'Access published workspaces' ";
    }

    onSetError(wspErrors);
  }, [dbPermissions, dbsPermissions]);

  /**
   * A user must be allowed to:
   *  - View a published workspace (selected?.length > 0)
   *  AND/OR
   *  - Create own workspaces (dbsPermissions?.createWorkspaces === true)
   */
  const selected = dbsPermissions?.viewPublishedWorkspaces?.workspaceIds;
  const showWorkspaceSelect = !!(
    publishedWorkspaces?.length || selected?.length
  );
  const showCreateWorkspaces =
    !selected?.length || !dbsPermissions?.createWorkspaces;

  if ((!showWorkspaceSelect && !showCreateWorkspaces) || !publishedWorkspaces) {
    return null;
  }

  const workspaceOptions = publishedWorkspaces.map((w) => ({
    key: w.id,
    label: w.name,
  }));
  selected?.map((key) => {
    if (!workspaceOptions.some((w) => w.key === key)) {
      workspaceOptions.push({
        key,
        label: `Deleted - ${key}`,
      });
    }
  });

  return (
    <FlexCol
      className={"PublishedWorkspaceSelector " + className}
      style={style}
    >
      <SectionHeader icon={mdiViewQuilt} className="mb-p5">
        Workspace access
      </SectionHeader>

      <div className="relative bg-color-0 rounded flex-row gap-2 ml-2 ">
        <SwitchToggle
          variant="col"
          data-command="config.ac.edit.createWorkspaces"
          checked={!!dbsPermissions?.createWorkspaces}
          onChange={(createWorkspaces) => {
            onChange({ createWorkspaces });
          }}
          disabledInfo={
            !publishedWorkspaces.length ?
              "Cannot change if no published workspaces"
            : undefined
          }
          label={{
            variant: "normal",
            label: "Create own workspaces",
            info: "Grants the user the ability to create, view and edit own workspaces/dashboards. If disabled then only the published workspaces are accessible to the user",
          }}
        />

        <SmartSelect
          label={{
            label: "Published workspaces",
            info: `Limits access to only the tables/views found in the chosen workspaces. Must publish workspaces`,
            variant: "normal",
          }}
          data-command="config.ac.edit.publishedWorkspaces"
          disabledInfo={
            !publishedWorkspaces.length ? "No published workspaces" : undefined
          }
          tableHandler={dbs.workspaces as any}
          filter={{ published: true, connection_id: connectionId }}
          allowCreate={false}
          fieldName="id"
          displayField="name"
          values={selected ?? []}
          onChange={async (workspaceIds) => {
            const newDbsRule: AccessRule["dbsPermissions"] = {
              ...dbsPermissions,
              viewPublishedWorkspaces: { workspaceIds },
            };
            /** Toggle missing tables if required */
            const { dbPermissionsCorrected } = await getWorkspaceTables(
              dbs,
              workspaceIds,
              dbPermissions,
              tables,
            );
            if (dbPermissionsCorrected) {
              onChangeRule({
                dbPermissions: dbPermissionsCorrected,
                dbsPermissions: newDbsRule,
              });
            } else {
              onChange(newDbsRule);
            }
          }}
        />
      </div>
    </FlexCol>
  );
};

export type WorspaceTableAndColumns = {
  tableName: string;
  columns: ValidatedColumnInfo[];
};
export const getWorkspaceTables = async (
  dbs: DBS,
  workspaceIds: string[],
  dbPermissions: DeepPartial<AccessRule["dbPermissions"]>,
  tables: DBSchemaTablesWJoins,
) => {
  if (!workspaceIds.length) {
    return { msg: undefined, missingTables: undefined };
  }
  let missingWindowTables: WindowData<"table">[] = [];
  let dbPermissionsCorrected = { ...dbPermissions };
  const worspaceTableAndColumns: WorspaceTableAndColumns[] = [];
  if (dbPermissions.type === "Custom") {
    const workspaceWindows = await dbs.windows.find({
      "workspace_id.$in": workspaceIds,
    });
    const tableWindows = workspaceWindows.filter(
      (w) => w.type === "table" && !!w.table_name,
    ) as WindowData<"table">[];
    const { customTables } = dbPermissions;
    const _missingWindowTables = tableWindows
      .map((w) => {
        const table = tables.find((t) => t.name === w.table_name);
        const tableWindowColumns = table?.columns.filter((tc) =>
          w.columns?.some(
            (c) =>
              tc.name === c.name &&
              c.show &&
              (!c.computedConfig ||
                c.computedConfig.isColumn ||
                tc.name === c.computedConfig.column),
          ),
        );
        if (!table || !tableWindowColumns) {
          return undefined;
        }
        worspaceTableAndColumns.push({
          tableName: table.name,
          columns: tableWindowColumns,
        });
        return {
          ...w,
          table,
          tableWindowColumns,
        };
      })
      .filter(
        (t) => !customTables?.some((ct) => t && ct.tableName === t.table_name),
      );
    const validMissingWindowTables = _missingWindowTables.filter(isDefined);
    missingWindowTables = validMissingWindowTables;
    const missingTableNames = validMissingWindowTables.map((t) => t.table_name);
    const invalidMissingTables = _missingWindowTables.filter((t) => !t?.table);
    if (invalidMissingTables.length) {
      return {
        msg: `Workspace contains invalid tables: ${invalidMissingTables.map((t) => t?.table_name)}`,
      };
    }

    dbPermissionsCorrected = {
      type: "Custom",
      customTables: validMissingWindowTables
        .map(({ table_name, tableWindowColumns, table }) => {
          const windowFields = tableWindowColumns!.map((c) => c.name);
          const fields =
            windowFields.length === table.columns.length ?
              ("*" as const)
            : windowFields;
          return {
            tableName: table_name,
            select: { fields, filterFields: fields },
            update: { fields, filterFields: fields },
            insert: { fields },
            delete: { filterFields: fields },
          };
        })
        .concat(
          customTables?.filter(
            (ct) => !missingTableNames.includes(ct.tableName),
          ) ?? ([] as any),
        ),
    };
  }
  if (missingWindowTables.length) {
    const missingTableNames = missingWindowTables.map((t) => t.name);
    return {
      msg: `Must allow SELECT on all tables from the published workspaces. Missing tables: ${missingTableNames.join(", ")}`,
      missingTables: missingTableNames,
      dbPermissionsCorrected,
      worspaceTableAndColumns,
    };
  }

  return { msg: undefined, missingTables: undefined, worspaceTableAndColumns };
};
