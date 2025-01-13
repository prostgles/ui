import { omitKeys } from "prostgles-types";
import type {
  CustomTableRules,
  DBSSchema,
  TableRules,
} from "../../../commonTypes/publishUtils";
import { parseTableRules } from "../../../commonTypes/publishUtils";
import { getACRule } from "./startConnection";
import type { Publish } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import type { SUser } from "../authConfig/getAuth";
import type { DBS } from "..";

type Args = {
  dbs: DBS;
  dbConf: DBSSchema["database_configs"];
  connectionId: string;
};
export const getConnectionPublish = ({ dbs, dbConf, connectionId }: Args) => {
  const publish: Publish<void, SUser> = async ({ user, dbo, tables }) => {
    if (user) {
      if (user.type === "admin") {
        return "*";
      }

      const ac = await getACRule(dbs, user, dbConf.id, connectionId);

      if (ac) {
        const { dbPermissions } = ac;

        if (dbPermissions.type === "Run SQL" && dbPermissions.allowSQL) {
          return "*" as const;
        } else if (
          dbPermissions.type === "All views/tables" &&
          dbPermissions.allowAllTables.length
        ) {
          return Object.keys(dbo)
            .filter((k) => dbo[k]!.find)
            .reduce(
              (a, v) => ({
                ...a,
                [v]: {
                  select:
                    dbPermissions.allowAllTables.includes("select") ?
                      "*"
                    : undefined,
                  ...(dbo[v]?.is_view ?
                    {}
                  : {
                      update:
                        dbPermissions.allowAllTables.includes("update") ?
                          "*"
                        : undefined,
                      insert:
                        dbPermissions.allowAllTables.includes("insert") ?
                          "*"
                        : undefined,
                      delete:
                        dbPermissions.allowAllTables.includes("delete") ?
                          "*"
                        : undefined,
                    }),
                },
              }),
              {},
            );
        } else if (dbPermissions.type === "Custom") {
          type ParsedTableRules = Record<string, TableRules>;
          const publish = dbPermissions.customTables
            .filter((t: any) => dbo[t.tableName])
            .reduce((a: any, _v) => {
              const v = _v as CustomTableRules["customTables"][number];
              const table = tables.find(({ name }) => name === v.tableName);
              if (!table) return {};

              const ptr: ParsedTableRules = {
                ...a,
                [v.tableName]: parseTableRules(
                  omitKeys(v, ["tableName"]),
                  dbo[v.tableName]!.is_view,
                  table.columns.map((c: any) => c.name),
                  { user: user as DBSSchema["users"] },
                ),
              };
              return ptr;
            }, {} as ParsedTableRules);

          return publish;
        } else {
          console.error("Unexpected access control rule: ", (ac as any).rule);
        }
      }
    }
    return undefined;
  };

  return publish;
};
