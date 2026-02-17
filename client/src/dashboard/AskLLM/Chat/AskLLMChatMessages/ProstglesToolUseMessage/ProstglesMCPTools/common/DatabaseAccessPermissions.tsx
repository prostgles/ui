import React, { useMemo } from "react";
import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getProperty, type JSONB } from "prostgles-types";
import { HeaderList } from "./HeaderList";
import { mdiDatabaseEdit } from "@mdi/js";
import Chip from "@components/Chip";
import { FlexRow } from "@components/Flex";

export const DatabaseAccessPermissions = (
  dbAccess: JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
  >["suggested_database_access"],
) => {
  const databaseAccessList = useMemo(() => {
    if (dbAccess.Mode === "None") return;
    if (dbAccess.Mode === "Custom") {
      return dbAccess.tables.map((t) => {
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
              {t.tableName}:{" "}
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
