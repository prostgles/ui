import { useCallback, useState } from "react";
import type { CreateConnectionProps } from "./CreateConnection";
import { useNavigate } from "react-router-dom";
import { ROUTES, type SampleSchema } from "../../../../../commonTypes/utils";
import type { Connection } from "../../NewConnection/NewConnnectionForm";
import { asName } from "prostgles-client/dist/prostgles";
import { isDefined, pickKeys } from "prostgles-types";
import { useCreatePostgresUser } from "../CreatePostgresUser";

export type CreateConnectionType = [
  {
    type: "new";
    applySchema?: SampleSchema;
    newDatabaseName?: string;
  },
  {
    type: "existing";
    existingDatabaseName?: string;
  },
];

export const useCreateConnection = (props: CreateConnectionProps) => {
  const {
    createConnection,
    getSampleSchemas,
    runConnectionQuery,
    validateConnection,
    connId,
    dbs,
    connections,
  } = props;
  const [serverInfo, setServerInfo] = useState<
    | {
        canCreateDb: boolean;
        rolname: string;
        databases: string[];
        sampleSchemas: SampleSchema[];
        usedDatabases: string[];
        mainConnection: Required<Connection>;
        existingConnectionNames: string[];
      }
    | undefined
  >(undefined);
  const [connectionName, setConnectionName] = useState("");

  const newUser = useCreatePostgresUser({ connId, runConnectionQuery });
  const { newPgUser, newUserPasswordError, newUsernameError } = newUser;

  const navigate = useNavigate();
  const [error, setError] = useState<any>();
  const onOpenActions = useCallback(async () => {
    const serverInfo = (
      await runConnectionQuery(
        connId,
        `
          SELECT rolcreatedb OR rolsuper as "canCreateDb", rolname
          FROM pg_catalog.pg_roles
          WHERE rolname = "current_user"();
        `,
      )
    )[0]! as { canCreateDb: boolean; databases: string[]; rolname: string };
    const databases = (await runConnectionQuery(
      connId,
      `
          SELECT datname FROM pg_catalog.pg_database
        `,
    )) as { datname: string }[];
    const sampleSchemas = await getSampleSchemas().catch(
      (gettingSampleSchemasError) => {
        console.error({ gettingSampleSchemasError });
        return [];
      },
    );
    const existingConnections = await dbs.connections.find(
      {},
      { select: { name: 1 } },
    );
    const mainConnection = await dbs.connections.findOne({ id: connId });
    if (!mainConnection) {
      throw "mainConnection not found";
    }
    setServerInfo({
      ...serverInfo,
      sampleSchemas,
      databases: databases.map((d) => d.datname),
      usedDatabases: connections.map((c) => c.db_name).filter(isDefined),
      mainConnection,
      existingConnectionNames: existingConnections
        .map((c) => c.name)
        .filter((v) => v),
    });
  }, [
    connId,
    connections,
    dbs.connections,
    getSampleSchemas,
    runConnectionQuery,
  ]);

  const onCreateConnection = useCallback(
    async (action: CreateConnectionType[number]) => {
      let newDbName = "";
      let newDbOwnerCredentials:
        | undefined
        | Pick<Connection, "db_user" | "db_pass">;
      if (newPgUser.create) {
        if (newUsernameError || newUserPasswordError)
          throw "User already exists or password is missing";
        await runConnectionQuery(
          connId,
          `CREATE USER ${asName(newPgUser.name)} WITH ENCRYPTED PASSWORD $1;`,
          [newPgUser.password],
        );
        newDbOwnerCredentials = {
          db_user: newPgUser.name,
          db_pass: newPgUser.password,
        };
      }
      if (action.type === "new") {
        const createDbQuery = [
          `CREATE DATABASE ${asName(action.newDatabaseName!)}`,
          newDbOwnerCredentials && newPgUser.permissions.type === "owner" ?
            `WITH OWNER ${JSON.stringify(newPgUser.name)}`
          : "",
        ].join("\n");
        await runConnectionQuery(connId, createDbQuery);
        newDbName = action.newDatabaseName!;
      } else {
        if (newDbOwnerCredentials && newPgUser.permissions.type === "owner") {
          await runConnectionQuery(
            connId,
            `ALTER DATABASE ${asName(action.existingDatabaseName!)} SET OWNER TO ${asName(newPgUser.name)};`,
          );
        }
        newDbName = action.existingDatabaseName!;
      }

      if (newDbOwnerCredentials && newPgUser.permissions.type === "custom") {
        const escapedUserName = asName(newUser.newPgUser.name);

        const rulesObj = pickKeys(newPgUser.permissions, [
          "select",
          "delete",
          "update",
          "insert",
        ]);
        const allowedActions = Object.entries(rulesObj)
          .map(([k, v]) => (v ? k : undefined))
          .filter(isDefined);
        if (newPgUser.permissions.allow_subscription_triggers) {
          allowedActions.push("TRIGGER");
        }
        const query =
          `
        GRANT CONNECT ON DATABASE ${asName(newDbName)} TO ${escapedUserName};
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ${escapedUserName};
        GRANT ${allowedActions} ON ALL TABLES IN SCHEMA public TO ${escapedUserName};
        ` +
          (newPgUser.permissions.allow_subscription_triggers ?
            `
        GRANT USAGE ON SCHEMA prostgles TO ${escapedUserName};
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA prostgles TO ${escapedUserName};
        GRANT SELECT, UPDATE, DELETE, INSERT ON ALL TABLES IN SCHEMA prostgles TO ${escapedUserName};
        `
          : ``);
        await runConnectionQuery(connId, query);
      }

      const validatedConnection = await validateConnection({
        ...pickKeys(serverInfo!.mainConnection!, [
          "db_conn",
          "db_host",
          "db_port",
          "db_ssl",
          "db_user",
          "db_pass",
          "db_ssl",
          "ssl_certificate",
          "ssl_client_certificate",
          "ssl_client_certificate_key",
          "ssl_reject_unauthorized",
        ]),
        name: connectionName,
        db_name: newDbName!,
        type: "Standard",
        db_conn: null,
        ...newDbOwnerCredentials,
      });
      const newConn = await createConnection(
        validatedConnection.connection,
        action.type === "new" ? action.applySchema?.name : undefined,
      );
      const { connection: newConnection } = newConn;
      if (
        action.type === "new" &&
        action.applySchema?.type === "dir" &&
        action.applySchema.workspaceConfig
      ) {
        for (const workspace of action.applySchema.workspaceConfig.workspaces) {
          await dbs.sql?.(`DELETE FROM workspaces WHERE name = $1`, [
            workspace.name,
          ]);
          await dbs.workspaces.insert({
            ...workspace,
            connection_id: newConnection.id,
          });
        }
      }
      navigate(`${ROUTES.CONNECTIONS}/${newConnection.id}`);
    },
    [
      connId,
      connectionName,
      createConnection,
      dbs,
      navigate,
      newPgUser.create,
      newPgUser.name,
      newPgUser.password,
      newPgUser.permissions,
      newUser.newPgUser.name,
      newUserPasswordError,
      newUsernameError,
      runConnectionQuery,
      serverInfo,
      validateConnection,
    ],
  );

  return {
    serverInfo,
    error,
    setError,
    onOpenActions,
    onCreateConnection,
    connectionName,
    setConnectionName,
    newUser,
  };
};
