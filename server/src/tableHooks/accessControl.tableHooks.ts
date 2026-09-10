import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBS } from "..";
import type { TableHooks, TableHooksDefinition } from "prostgles-server";

export const accessControlTableHooks = Object.fromEntries(
  (
    [
      "access_control",
      "access_control_connections",
      "access_control_user_types",
      "access_control_methods",
      "access_control_allowed_llm",
    ] as const
  ).map((tableName) => [
    tableName,
    {
      beforeEach: [
        {
          commands: { update: 1 },
          validate: async ({ filter, dbx, localParams }) => {
            if (!localParams?.clientReq) return;
            const table = dbx[tableName] as {
              find: (filter?: object) => Promise<AccessRuleRow[]>;
            };
            const rows = await table.find(filter);
            for (const row of rows) await checkCliAccessRule(dbx, row);
          },
        },
      ],
      afterEach: [
        {
          commands: { insert: 1, update: 1, delete: 1 },
          validate: async ({ row, dbx, localParams }) => {
            if (localParams?.clientReq) await checkCliAccessRule(dbx, row);
          },
        },
      ],
    } satisfies TableHooksDefinition<AccessRuleRow, DBS>,
  ]),
) as TableHooks<DBGeneratedSchema>;

type AccessRuleRow = {
  database_id?: number;
  access_control_id?: number;
  connection_id?: string;
};

const checkCliAccessRule = async (dbs: DBS, row: AccessRuleRow) => {
  const rule =
    row.access_control_id === undefined ?
      row
    : await dbs.access_control.findOne({ id: row.access_control_id });
  const filters = [
    ...(rule?.database_id === undefined ? [] : [{ id: rule.database_id }]),
    ...(row.connection_id === undefined ?
      []
    : [{ $existsJoined: { connections: { id: row.connection_id } } }]),
  ];
  for (const filter of filters) {
    const config = await dbs.database_configs.findOne(filter);
    if (config?.config_sync?.type === "cli") {
      throw "This is a CLI app. Update access control rules in the source code.";
    }
  }
};
