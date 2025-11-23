import React, { useMemo } from "react";
import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { JSONB } from "prostgles-types";
import { HeaderList } from "./HeaderList";
import { mdiDatabaseEdit } from "@mdi/js";

export const DatabaseAccessPermissions = (
  dbAccess: JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_agent_workflow"]["schema"]["type"]
  >["database_access"],
) => {
  const databaseAccessList = useMemo(() => {
    if (dbAccess.Mode === "None") return;
    if (dbAccess.Mode === "Custom") {
      return dbAccess.tables.map((t) => {
        const tableMethods = ["select", "update", "insert", "delete"]
          .filter((v) => t[v])
          .join(", ");
        return (
          <>
            {t.tableName}:{" "}
            <span style={{ fontWeight: "normal" }}>{tableMethods}</span>
          </>
        );
      });
    }

    return dbAccess.Mode === "execute_sql_rollback" ?
        ["Execute SQL with rollback"]
      : ["Execute SQL with commit"];
  }, [dbAccess]);

  if (!databaseAccessList) return null;

  return (
    <HeaderList
      title="Database access"
      iconPath={mdiDatabaseEdit}
      items={databaseAccessList}
    />
  );
};
