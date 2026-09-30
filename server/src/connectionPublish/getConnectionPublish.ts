import type { ContextValue, DBSSchema } from "@common/publishUtils";
import { parseTableRules } from "@common/publishUtils";
import type {
  Publish,
  PublishAllTables,
  PublishContextValue,
  PublishObject,
} from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import { fromEntries, isDefined } from "prostgles-types";
import type { DBS } from "..";
import type { SUser } from "../authConfig/sessionUtils";
import {
  getAccessRule,
  getAccessRules,
} from "../ConnectionManager/startConnection";
import { publish } from "../publish/publish";

type Args = {
  dbs: DBS;
  dbConf: DBSSchema["database_configs"];
  connection: Pick<DBSSchema["connections"], "id" | "is_state_db">;
};

export const getConnectionPublish = async ({
  dbs,
  dbConf,
  connection,
}: Args): Promise<Publish<void, SUser> | undefined> => {
  if (connection.is_state_db) {
    return publish as Publish<void, SUser>;
  }
  const connectionId = connection.id;
  const rules = await getAccessRules(dbs, dbConf.id, connectionId);

  const configuredRules = rules
    .map(({ dbPermissions, userTypes }) => {
      const publish = getPublishObjectFromDbPermissions(dbPermissions);
      const userTypesList = userTypes.map(({ user_type }) => user_type);
      if (!userTypesList.length) return undefined;
      return {
        name:
          userTypesList
            .map((ut) => ut[0]?.toUpperCase() + ut.slice(1))
            .join("") + "Schema",
        userTypes: userTypesList,
        publish,
      };
    })
    .filter(isDefined)
    .filter((r) => r.publish);

  const adminRule = {
    name: "AdminSchema",
    userTypes: ["admin"],
    publish: "*",
  } as const;

  const connectionPublish: Publish<void, SUser> = [
    ...configuredRules,
    adminRule,
  ];

  return connectionPublish;
};

const getPublishObjectFromDbPermissions = (
  dbPermissions:
    | undefined
    | NonNullable<Awaited<ReturnType<typeof getAccessRule>>>["dbPermissions"],
): PublishObject | "*" | null | PublishAllTables => {
  if (!dbPermissions) return null;

  if (dbPermissions.type === "Run SQL") {
    if (!dbPermissions.allowSQL) {
      return null;
    }
    return "*";
  }

  if (dbPermissions.type === "All views/tables") {
    const { allowAllTables } = dbPermissions;
    if (!allowAllTables.length) {
      return null;
    }

    return ["*", fromEntries(allowAllTables.map((action) => [action, true]))];
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (dbPermissions.type === "Custom") {
    const publish = dbPermissions.customTables.reduce(
      (acc, { tableName, ...rule }) => {
        const parsedRule = parseTableRules(
          rule,
          undefined,
          toProstglesContextValue,
        );

        if (!parsedRule) return acc;

        const publishObject: PublishObject = {
          ...acc,
          [tableName]: parsedRule,
        };
        return publishObject;
      },
      {} as PublishObject,
    );

    return publish;
  }

  throw new Error(
    "Unsupported access control rule: " + JSON.stringify(dbPermissions),
  );
};

const toProstglesContextValue = (
  contextValue: ContextValue,
): PublishContextValue => ({ $prostglesContext: contextValue });
