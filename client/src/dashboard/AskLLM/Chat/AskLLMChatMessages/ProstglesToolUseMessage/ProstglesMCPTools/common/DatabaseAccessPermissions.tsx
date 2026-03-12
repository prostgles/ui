import { getEntries } from "@common/utils";
import Chip from "@components/Chip";
import { FlexRow } from "@components/Flex";
import { mdiDatabaseEdit } from "@mdi/js";
import { getProperty } from "prostgles-types";
import React, { useMemo } from "react";
import type { DatabaseAccessPermission } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { HeaderList } from "./HeaderList";

export const DatabaseAccessPermissions = ({
  dbAccess,
}: {
  dbAccess: DatabaseAccessPermission | undefined;
}) => {
  const databaseAccessList = useMemo(() => {
    if (!dbAccess) return;
    if (dbAccess.mode === "custom") {
      return getEntries(dbAccess.tablePermissions).map(([tableName, t]) => {
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

    return dbAccess.mode === "execute_readonly_sql" ?
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
