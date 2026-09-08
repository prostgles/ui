import type {
  Publish,
  PublishObject,
} from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import { isDefined, omitKeys } from "prostgles-types";
import type { DBS } from "..";
import type { DBSSchema } from "@common/publishUtils";
import { parseTableRules } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import type { SUser } from "../authConfig/sessionUtils";
import { getAccessRule } from "./startConnection";
import { publish } from "../publish/publish";

type Args = {
  dbs: DBS;
  dbConf: DBSSchema["database_configs"];
  connection: DBSSchema["connections"];
  accessControl?: DBSSchema["access_control"]["dbPermissions"];
};

export const getConnectionPublish = ({
  dbs,
  dbConf,
  connection,
  accessControl,
}: Args): Publish<void, SUser> | undefined => {
  if (connection.is_state_db) {
    return publish as Publish<void, SUser>;
  }
  const connectionId = connection.id;
  const connectionPublish: Publish<void, SUser> = async ({
    user,
    dbo,
    tables,
  }) => {
    if (!user) {
      return null;
    }

    if (!accessControl && user.type === "admin") {
      return "*";
    }

    const dbPermissions =
      accessControl ??
      (await getAccessRule(dbs, user, dbConf.id, connectionId))?.dbPermissions;
    if (!dbPermissions) return null;

    if (dbPermissions.type === "Run SQL" && dbPermissions.allowSQL) {
      return "*" as const;
    } else if (
      dbPermissions.type === "All views/tables" &&
      dbPermissions.allowAllTables.length
    ) {
      const { allowAllTables } = dbPermissions;
      const res = getEntries(dbo)
        .filter((entry) => {
          const [_, t] = entry;
          return Boolean("find" in t && t.find);
        })
        .reduce(
          (acc, [tableName, tableHandler]) => ({
            ...acc,
            [tableName]: {
              select: allowAllTables.includes("select") ? "*" : undefined,
              ...(!(tableHandler.isView as boolean) && {
                update: allowAllTables.includes("update") ? "*" : undefined,
                insert: allowAllTables.includes("insert") ? "*" : undefined,
                delete: allowAllTables.includes("delete") ? "*" : undefined,
              }),
            } satisfies PublishObject[string],
          }),
          {} as PublishObject,
        );
      return res;
    } else if (dbPermissions.type === "Custom") {
      const customTableList = dbPermissions.customTables
        .map((rule) => {
          const tableHandler = dbo[rule.tableName];
          if (!tableHandler) return undefined;
          const table = tables.find(({ name }) => name === rule.tableName);
          if (!table) return undefined;
          return {
            rule,
            table,
            tableHandler,
          };
        })
        .filter(isDefined);

      const publish: PublishObject = customTableList.reduce(
        (acc, { table, rule, tableHandler }) => {
          const parsedRule = parseTableRules(
            omitKeys(rule, ["tableName"]),
            tableHandler.isView,
            table.columns.map((c) => c.name),
            { user },
          );

          if (!parsedRule) return acc;

          const ptr = {
            ...acc,
            [rule.tableName]: parsedRule,
          };
          return ptr;
        },
        {} as PublishObject,
      );

      return publish;
    } else {
      console.error("Unexpected access control rule: ", dbPermissions);
    }
    return null;
  };

  return connectionPublish;
};
