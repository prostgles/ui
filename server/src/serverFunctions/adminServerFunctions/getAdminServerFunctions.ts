import { checkClientIP } from "@src/authConfig/sessionUtils";
import { getAuthSetupData } from "@src/authConfig/subscribeToAuthSetupChanges";
import { getInstalledPsqlVersions } from "@src/BackupManager/getInstalledPrograms";
import { getCompiledTS } from "@src/ConnectionManager/connectionManagerUtils";
import { testDBConnection } from "@src/connectionUtils/testDBConnection";
import { validateConnection } from "@src/connectionUtils/validateConnection";
import { getElectronConfig } from "@src/electronConfig";
import { connectionManager } from "@src/index";
import { getPasswordlessAdmin } from "@src/init/initUsers";
import { statePrgl } from "@src/init/startProstgles";
import { getStatus } from "@src/methods/getPidStats";
import { killPID } from "@src/methods/statusMonitorUtils";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { prostglesServices } from "@src/ServiceManager/ServiceManagerTypes";
import { FILE_TABLE_CONFIG_SCHEMA } from "@src/tableConfig/tableConfigDatabaseConfig";
import { upsertConnection } from "@src/upsertConnection";
import { existsSync, readdirSync, statSync } from "fs";
import { mkdir } from "fs/promises";
import { globStream } from "glob";
import * as os from "os";
import path, { join } from "path";
import { getIsSuperUser } from "prostgles-server/dist/Prostgles";
import { getKeys, includes, isEmpty, type SQLHandler } from "prostgles-types";
import { getSampleSchemas } from "../applySampleSchema";
import { getTemplateUserConnection } from "../askLLM/prostglesLLMTools/getTemplateUserConnection";
import { refreshModels } from "../askLLM/refreshModels";
import { deleteConnection } from "../deleteConnection";
import { getConnectionAndDatabaseConfig } from "../getConnectionAndDatabaseConfig";
import { getNodeTypes } from "../getNodeTypes";
import { runConnectionQuery } from "../getServerFunctions";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { setFileStorage } from "../setFileStorage";
import { getAgenticWorkflowFunctions } from "./getAgenticWorkflowFunctions";
import { getBackupServerFunctions } from "./getBackupServerFunctions";
import { getDefineAdminFunction } from "./getDefineAdminFunction";
import { getMcpServerFunctions } from "./getMcpServerFunctions";
import { getWebAppServerFunctions } from "./getWebAppServerFunctions";
import { getPasswordHash } from "@src/authConfig/authUtils";
export const getAdminServerFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const { defineAdminFunction } = getDefineAdminFunction(context);

  const adminMethods = {
    ...getWebAppServerFunctions(context),
    makeDirectory: defineAdminFunction({
      input: { path: "string", folderName: "string" },
      run: async ({ path, folderName }) => {
        if (!path) throw "Path is required";
        if (!folderName) throw "Folder name is required";
        const fullPath = join(path, folderName);
        await mkdir(fullPath);
        return fullPath;
      },
    }),
    glob: defineAdminFunction({
      input: {
        pattern: { type: "string", optional: true },
        cwd: { type: "string", optional: true },
        timeout: { type: "integer", optional: true },
      },
      run: async ({ cwd, pattern: argsPattern, timeout = 10_000 }) => {
        const currentPath = cwd || os.homedir();
        const pattern = argsPattern || "*";
        if (timeout <= 0 || timeout > 120_000) {
          throw "Timeout must be between 1 and 120 seconds";
        }

        const signal = AbortSignal.timeout(timeout);
        const result: Array<{
          path: string;
          name: string;
          type: string;
          size: number | undefined;
          lastModified: number | undefined;
          created: number | undefined;
        }> = [];

        try {
          for await (const r of globStream(pattern, {
            signal,
            withFileTypes: true,
            cwd: currentPath,
            stat: true,
          })) {
            result.push({
              path: r.fullpath(),
              name: r.name,
              type:
                r.isDirectory() ? "directory"
                : r.isBlockDevice() ? "block"
                : "file",
              size: r.size,
              lastModified: r.mtimeMs,
              created: r.ctimeMs,
            });
          }
        } catch (err) {
          if (!signal.aborted) throw err;
        }

        return {
          pattern,
          path: currentPath,
          result,
          timedOut: signal.aborted,
        };
      },
    }),
    disablePasswordless: defineAdminFunction({
      input: {
        username: "string",
        password: "string",
        origin: "string", // to be added to allowed origins for CORS
      },
      run: async (newAdmin, { user, dbs }) => {
        const noPwdAdmin = await getPasswordlessAdmin(dbs);
        if (!noPwdAdmin) throw "No passwordless admin found";
        if (noPwdAdmin.id !== user.id) {
          throw "Only the passwordless admin can disable passwordless access";
        }

        /** Change current passwordless user to normal admin to ensure old user data is accessible */
        await dbs.users.update(
          { id: noPwdAdmin.id },
          {
            username: newAdmin.username,
            password: getPasswordHash(user, newAdmin.password),
            type: "admin",
            passwordless_admin: false,
          },
        );

        await dbs.database_configs.update(
          {
            $existsJoined: { connections: { is_state_db: true } },
          },
          {
            cors: {
              allowedOrigins: [newAdmin.origin],
            },
          },
        );

        /** Ensure passwordless_admin is setup and disabled */
        await dbs.users.insert({
          passwordless_admin: true,
          type: noPwdAdmin.type,
          username: noPwdAdmin.username,
          password: noPwdAdmin.password,
          created: noPwdAdmin.created,
          status: "disabled",
        });

        /** Terminate all sessions */
        await dbs.sessions.delete({});
      },
    }),
    getConnectionDBTypes: defineAdminFunction({
      input: { conId: { type: "string", optional: true } },
      run: ({ conId }) => {
        if (!statePrgl) throw "statePrgl missing";
        /** No connection id = state connection */
        if (!conId) {
          return statePrgl.getTSSchema().tsSchema;
        }
        const c = connectionManager.getConnectionStartedInstance(conId);
        return c.prgl.getTSSchema().tsSchema;
      },
    }),
    runSql: defineAdminFunction({
      input: {
        connectionId: "string",
        query: "string",
        mode: { enum: ["default", "readOnly"], optional: true },
        args: { type: "any", optional: true },
      } as const,
      run: async ({ connectionId, query, args, mode }) => {
        const db = await getTemplateUserConnection(
          connectionId,
          mode === "readOnly" ?
            { mode: "execute_readonly_sql" }
          : { mode: "execute_sql" },
        );
        const { command, fields, rowCount, rows, duration } = await db.result(
          query,
          args,
        );
        const activeConnection =
          connectionManager.getActiveConnection(connectionId);
        const fieldsWithTypes =
          await activeConnection.prgl.getFieldsWithTypes(fields);
        return { command, fields: fieldsWithTypes, rowCount, rows, duration };
      },
    }),
    runConnectionQuery: defineAdminFunction({
      input: {
        conId: "string",
        query: "string",
        args: { type: "any", optional: true },
      },
      run: ({ conId, query, args }) =>
        runConnectionQuery(conId, query, args, undefined, true),
    }),
    getMyIP: defineAdminFunction({
      run: async (_, { db, clientReq: { socket } }) => {
        if (!socket) throw "Socket missing";
        const { stateDatabaseConfig } = getAuthSetupData();
        if (!stateDatabaseConfig) {
          throw "State database config missing";
        }
        return checkClientIP(db, { socket }, stateDatabaseConfig);
      },
    }),
    getConnectedIds: defineAdminFunction({
      run: () => {
        return Array.from(connectionManager.prglConnections.keys());
      },
    }),
    toggleService: defineAdminFunction({
      input: { serviceName: "string", enable: "boolean" },
      run: async ({ serviceName, enable }, { dbs }) => {
        const serviceManager = getServiceManager(dbs);
        if (!includes(getKeys(prostglesServices), serviceName)) {
          throw "Service not found";
        }
        if (enable) {
          await serviceManager.enableService(serviceName, () => {});
        } else {
          serviceManager.stopService(serviceName);
        }
      },
    }),
    getDBSize: defineAdminFunction({
      input: { conId: "string" },
      run: async ({ conId }, { dbo, sql }) => {
        // TODO: move state db to connectionManager
        const connection = await dbo.connections.findOne({ id: conId });
        let sqlHandler: SQLHandler | undefined;
        if (connection?.is_state_db) {
          sqlHandler = sql;
        } else {
          const c = connectionManager.getConnectionStartedInstance(conId);
          sqlHandler = c.prgl.sql;
        }
        const size = (await sqlHandler(
          "SELECT pg_size_pretty( pg_database_size(current_database()) ) ",
          {},
          { returnType: "value" },
        )) as string;
        return size;
      },
    }),
    getIsSuperUser: defineAdminFunction({
      input: { conId: "string" },
      run: async ({ conId }) => {
        const c = connectionManager.getConnectionStartedInstance(conId);
        return getIsSuperUser(c.prgl._db);
      },
    }),
    getFileFolderSizeInBytes: defineAdminFunction({
      input: { conId: { type: "string", optional: true } },
      run: ({ conId }) => {
        const dirSize = (directory: string): number => {
          if (!existsSync(directory)) return 0;
          const files = readdirSync(directory);
          const stats = files.flatMap((file) => {
            const fileOrPathDir = path.join(directory, file);
            const stat = statSync(fileOrPathDir);
            if (stat.isDirectory()) {
              return dirSize(fileOrPathDir);
            }
            return stat.size;
          });

          return stats.reduce((accumulator, size) => accumulator + size, 0);
        };

        const storagePath = connectionManager.getFileFolderPath(conId);
        const size = dirSize(storagePath);
        return {
          size,
          storagePath,
        };
      },
    }),
    testDBConnection: defineAdminFunction({
      input: { connection: { record: { values: "unknown" } } },
      run: async ({ connection }) => {
        return testDBConnection(connection);
      },
    }),
    validateConnection: defineAdminFunction({
      input: { connection: "any" }, // TODO: add type c: Connections
      run: ({ connection }) => {
        const validatedConnection = validateConnection(connection);
        return { validatedConnection };
      },
    }),
    getInstalledPsqlVersions: defineAdminFunction({
      run: (_, { db }) => {
        return getInstalledPsqlVersions(db);
      },
    }),
    createConnection: defineAdminFunction({
      input: {
        connection: "any",
        origin: "string",
        sampleSchemaName: { type: "string", optional: true },
      },
      run: async ({ connection, sampleSchemaName, origin }, { dbs, user }) => {
        const res = await upsertConnection(
          connection,
          user.id,
          dbs,
          [origin],
          sampleSchemaName,
        );
        const el = getElectronConfig();
        if (res.connection.is_state_db && el?.isElectron) {
          el.setCredentials(res.connection);
        }
        return res;
      },
    }),
    refreshModels: defineAdminFunction({
      run: (_, { dbs }) => refreshModels(dbs),
    }),
    reloadSchema: defineAdminFunction({
      input: { conId: "string" },
      run: async ({ conId }) => {
        const conn = connectionManager.getConnectionStartedInstance(conId);
        if (conId && typeof conId !== "string") {
          throw "Invalid/Inexisting connection id provided";
        }
        await conn.prgl.restart();
      },
    }),
    deleteConnection: defineAdminFunction({
      input: {
        id: "string",
        dropDatabase: "boolean",
      },
      run: ({ id, dropDatabase }, { dbs, backupManager }) =>
        deleteConnection(dbs, backupManager, id, { dropDatabase }),
    }),
    disconnect: defineAdminFunction({
      input: { conId: "string" },
      run: async ({ conId }) => {
        return connectionManager.disconnect(conId);
      },
    }),
    ...getBackupServerFunctions(context),
    setFileStorage: defineAdminFunction({
      input: {
        connId: "string",
        tableConfig: {
          type: FILE_TABLE_CONFIG_SCHEMA,
          optional: true,
        },
        opts: {
          optional: true,
          type: {
            keepS3Data: { type: "boolean", optional: true },
            keepFileTable: { type: "boolean", optional: true },
          },
        },
      },
      run: ({ connId, tableConfig, opts }, { dbs }) =>
        setFileStorage(dbs, connId, tableConfig, opts),
    }),
    getStatus: defineAdminFunction({
      input: { connId: "string" },
      run: ({ connId }, { dbs }) => getStatus(connId, dbs),
    }),
    getSampleSchemas: defineAdminFunction({
      run: () => getSampleSchemas(),
    }),
    getCompiledTS: defineAdminFunction({
      input: { ts: "string" },
      run: ({ ts }) => {
        return getCompiledTS(ts);
      },
    }),
    killPID: defineAdminFunction({
      input: {
        connId: "string",
        id_query_hash: "string",
        type: { enum: ["cancel", "terminate"], optional: true },
      } as const,
      run: ({ connId, id_query_hash, type }) =>
        killPID(connId, id_query_hash, type),
    }),
    setOnMount: defineAdminFunction({
      input: {
        connId: "string",
        changes: {
          type: {
            on_mount_ts: { type: "string", optional: true },
            on_mount_ts_disabled: { type: "boolean", optional: true },
          },
        },
      },
      run: async ({ connId, changes }, { dbs }) => {
        if (isEmpty(changes)) {
          throw "No changes provided";
        }
        const { c, dbConf } = await getConnectionAndDatabaseConfig(dbs, connId);
        const activeConnection = connectionManager.getActiveConnection(connId);
        const newConn = await dbs.connections.update({ id: c.id }, changes, {
          returning: "*",
          multi: false,
        });
        if (!newConn) throw "Unexpected: newConn missing";
        await connectionManager.setOnMount(
          dbConf.id,
          newConn,
          activeConnection.connectionInfo,
        );
      },
    }),
    setTableConfig: defineAdminFunction({
      input: {
        connId: "string",
        changes: {
          type: {
            table_config_ts: { type: "string", optional: true },
            table_config_ts_disabled: { type: "boolean", optional: true },
          },
        },
      },
      run: async ({ connId, changes }, { dbs }) => {
        if (isEmpty(changes)) {
          throw "No changes provided";
        }
        const { dbConf } = await getConnectionAndDatabaseConfig(dbs, connId);
        const newDbConf = await dbs.database_configs.update(
          { id: dbConf.id },
          changes,
          { returning: "*", multi: false },
        );
        if (!newDbConf) throw "Unexpected: newDbConf missing";
        const activeConnection = connectionManager.getActiveConnection(connId);
        await connectionManager.setTableConfig(
          connId,
          newDbConf,
          activeConnection.connectionInfo,
        );
      },
    }),
    getForkedProcStats: defineAdminFunction({
      input: { connectionId: "string" },
      run: async ({ connectionId }) => {
        const prgl =
          connectionManager.getConnectionStartedInstance(connectionId);
        const res = {
          server: {
            // cpu: os.cpus(),
            mem: os.totalmem(),
            freemem: os.freemem(),
          },
          methodRunner: await prgl.methodRunner?.getProcStats(),
          onMountRunner: await prgl.onMountRunner?.getProcStats(),
          tableConfigRunner: await prgl.tableConfigRunner?.getProcStats(),
        };
        return res;
      },
    }),
    getNodeTypes: defineAdminFunction({
      run: () => {
        const pkgDeps = getNodeTypes();
        return pkgDeps;
      },
    }),
    ...getMcpServerFunctions(context),
    ...getAgenticWorkflowFunctions(context),
  };
  /** Ensure we didn't miss anything.  */
  Object.entries(adminMethods).forEach(([name, method]) => {
    if (context?.type !== "admin" && method.run) {
      throw `Admin method ${name} has run defined without admin context`;
    }
  });
  return adminMethods;
};
