import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getEntries } from "@common/utils";
import Chip from "@components/Chip";
import { FlexRow } from "@components/Flex";
import { mdiDatabaseEdit } from "@mdi/js";
import { getProperty, type JSONB } from "prostgles-types";
import React, { useMemo } from "react";
import { HeaderList } from "./HeaderList";

export const DatabaseAccessPermissions = (
  dbAccess: JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
  >["suggested_database_access"],
) => {
  const databaseAccessList = useMemo(() => {
    if (dbAccess.Mode === "None") return;
    if (dbAccess.Mode === "Custom") {
      return getEntries(dbAccess.tables).map(([tableName, t]) => {
        const tableMethods = (
          ["select", "update", "insert", "delete"] as const
        ).filter((v) => t[v]);
        return (
          <FlexRow className="gap-p5">
            <span
              style={{
                fontSize: "18px",
              }}
            >
              {tableName}:{" "}
            </span>
            {tableMethods.map((method) => {
              const methodColor = {
                select: "green",
                insert: "blue",
                update: "orange",
                delete: "red",
              } as const;
              return (
                <Chip color={getProperty(methodColor, method)} key={method}>
                  {method}
                </Chip>
              );
            })}
          </FlexRow>
        );
      });
    }

    return dbAccess.Mode === "execute_sql_with_rollback" ?
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
