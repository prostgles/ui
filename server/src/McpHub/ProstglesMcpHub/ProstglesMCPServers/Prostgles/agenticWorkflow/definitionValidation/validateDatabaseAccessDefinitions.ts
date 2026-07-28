import { isObject } from "@common/publishUtils";
import { connectionManager } from "@src/index";
import { runConnectionQuery } from "@src/serverFunctions/getServerFunctions";
import type {
  DatabaseAccessDefinition,
  DetailedTableFilter,
  DetailedTableFilterGroup,
} from "../runtimeSdk/defineAgenticWorkflow";
import type { ProxyCallDataDefinitions } from "../runtimeSdk/defineAgenticWorkflowHandlers.types";
import { parseDDLStatements } from "./parseDDLStatements";
import { quoteIdent } from "./quoteIdent";
import type { TableSchema } from "prostgles-server/dist/DboBuilder/DboBuilder";

export const validateDatabaseAccessDefinitions = async ({
  databaseAccessDefinitions,
  usedTables,
  connection_id,
  allowEmptyTablePermissions,
}: {
  databaseAccessDefinitions: ProxyCallDataDefinitions["definitions"]["databaseAccessDefinitions"];
  usedTables: string[];
  connection_id: string;
  allowEmptyTablePermissions: boolean;
}) => {
  const activeConnection =
    connectionManager.getActiveConnectionSilentFail(connection_id);
  if (!activeConnection) {
    if (
      connectionManager.connections?.find((c) => c.id === connection_id)
        ?.is_state_db
    ) {
      throw "State DB connection not allowed for agentic workflows";
    }
    throw new Error(
      `Connection handler not found for connection_id: ${connection_id}`,
    );
  }

  const result = await (async () => {
    if (databaseAccessDefinitions?.mode === "custom") {
      const { tablePermissions, ddlStatements } = databaseAccessDefinitions;
      const tablePermissionsTableNames = new Set(Object.keys(tablePermissions));

      /**
       * Although the permissions are handled through getClientDBHandlersForChat we want to
       * give better errors to the agent
       */
      for (const table of usedTables) {
        if (!tablePermissions[table]) {
          throw new Error(
            `Table "${table}" is used in the workflow but not included in tablePermissions`,
          );
        }
      }

      /** Validate table permissions */
      const activeDb = activeConnection.prgl.db;
      for (const [tableName, permissions] of Object.entries(tablePermissions)) {
        for (const permissionType of [
          "select",
          "insert",
          "update",
          "delete",
        ] as const) {
          const permission = permissions[permissionType];
          if (isObject(permission) && tableName in activeDb) {
            const fields =
              "fields" in permission ? permission.fields : undefined;
            const forcedFilterDetailed =
              "forcedFilter" in permission ?
                permission.forcedFilter
              : undefined;

            const forcedFilter =
              forcedFilterDetailed &&
              detailedFilterToSimpleFilter(forcedFilterDetailed);
            await activeDb[tableName]
              ?.find?.(forcedFilter, { select: fields, limit: 0 })
              .catch((err) => {
                throw new Error(
                  `Error validating ${permissionType} permissions for table "${tableName}"`,
                  { cause: err },
                );
              });
          }
        }
      }

      if (typeof ddlStatements === "string") {
        if (!ddlStatements.trim()) {
          throw new Error("ddlStatements is an empty string");
        }
        const statements = await parseDDLStatements(ddlStatements);

        const currentSchema = await runConnectionQuery<{ schema: string }>(
          connection_id,
          `SELECT current_schema() AS schema`,
        ).then((res) => res[0]!.schema);

        const getEscapedName = (name: string, schema?: string) => {
          return !schema || schema === currentSchema ?
              name
            : [schema, name].map(quoteIdent).join(".");
        };

        const parsedDdlStatements = statements.map((s) => {
          return {
            ...s,
            escapedTableName: getEscapedName(s.tableName, s.schemaName),
          };
        });

        const futureSchema = await activeConnection.prgl.getTSSchema({
          ddlWithRollback: ddlStatements,
        });
        parsedDdlStatements.forEach((ps) => {
          if (
            !tablePermissionsTableNames.has(ps.escapedTableName) &&
            !allowEmptyTablePermissions
          ) {
            throw new Error(
              `Table "${ps.escapedTableName}" from ddlStatements not found in tablePermissions: \n${JSON.stringify(ps.statementText)}`,
            );
          }
        });

        return { ...futureSchema, parsedDdlStatements };
      }
    }
    const { tablesOrViews, tsSchema } = activeConnection.prgl.getTSSchema();
    return { tablesOrViews, tsSchema, parsedDdlStatements: undefined };
  })();

  const { tablesOrViews } = result;
  if (databaseAccessDefinitions?.mode !== "custom") {
    return result;
  }
  const { tablePermissions, ddlStatements } = databaseAccessDefinitions;
  const tablePermissionsTableNames = new Set(Object.keys(tablePermissions));
  for (const tableName of tablePermissionsTableNames.keys()) {
    const matchingTable = tablesOrViews.find((t) => t.name === tableName);
    if (!matchingTable) {
      const allTables = tablesOrViews.map((t) => t.name).join(", ");
      throw new Error(
        `Error validating tablePermissions: ${JSON.stringify(tableName)} does not match any ${ddlStatements ? "new or " : ""}existing tables. Available tables: ${allTables}`,
      );
    }
  }

  return result;
};

export const detailedFilterToSimpleFilter = (
  filter: DetailedTableFilterGroup | DetailedTableFilter,
): Record<string, unknown> => {
  if ("$and" in filter || "$or" in filter) {
    const items = "$and" in filter ? filter.$and : filter.$or;
    return {
      ["$and"]: items.map(detailedFilterToSimpleFilter),
    };
  }

  return {
    [filter.fieldName]: { [filter.type ?? "$eq"]: filter.value },
  };
};

export const getProstglesDbDataPermissions = (
  databaseAccessDefinitions: DatabaseAccessDefinition | undefined,
) => {
  if (databaseAccessDefinitions?.mode !== "custom") {
    return databaseAccessDefinitions;
  }

  const tablePermissions = Object.fromEntries(
    Object.entries(databaseAccessDefinitions.tablePermissions).map(
      ([tableName, permissions]) => {
        const convertPermission = <T>(permission: T): T => {
          if (
            !isObject(permission) ||
            !("forcedFilter" in permission) ||
            !permission.forcedFilter
          ) {
            return permission;
          }

          return {
            ...permission,
            forcedFilter: detailedFilterToSimpleFilter(
              permission.forcedFilter as DetailedTableFilterGroup,
            ),
          };
        };

        return [
          tableName,
          {
            ...permissions,
            select: convertPermission(permissions.select),
            update: convertPermission(permissions.update),
            delete: convertPermission(permissions.delete),
          },
        ];
      },
    ),
  );

  return {
    mode: "custom" as const,
    tablePermissions,
  };
};
