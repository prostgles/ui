import type { SchemaConfigAudit, TableConfig } from "prostgles-server";

export const getAuditActorTableConfig = (
  tableConfig: TableConfig | undefined,
  audit: SchemaConfigAudit | undefined,
  syncUsers: boolean,
): TableConfig | undefined => {
  if (!audit || audit.tableName === "users") return tableConfig;
  const usersConfig = tableConfig?.users;
  if (!usersConfig && !syncUsers) return tableConfig;
  return {
    ...tableConfig,
    users: {
      ...usersConfig,
      getJoins: (tables) => {
        const joins = usersConfig?.getJoins?.(tables) ?? [];
        const users = tables.find((table) => table.name === "users");
        if (!users?.columns.some((column) => column.name === "id"))
          return joins;
        if (!tables.some((table) => table.name === audit.tableName))
          return joins;
        return [
          ...joins,
          {
            tables: [audit.tableName, "users"],
            on: [
              {
                $joinName: "prostgles_audit_actor",
                $sql: ({ left, right }) =>
                  `${left("actor")} ->> 'id' = ${right("id")}::text`,
              },
            ],
          },
        ];
      },
    },
  };
};
