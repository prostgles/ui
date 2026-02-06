import { getPasswordHash } from "@src/authConfig/authUtils";
import { checkClientIP } from "@src/authConfig/sessionUtils";
import { getAuthSetupData } from "@src/authConfig/subscribeToAuthSetupChanges";
import { getInstalledPsqlVersions } from "@src/BackupManager/getInstalledPrograms";
import { getCompiledTS } from "@src/ConnectionManager/connectionManagerUtils";
import { testDBConnection } from "@src/connectionUtils/testDBConnection";
import { validateConnection } from "@src/connectionUtils/validateConnection";
import { getElectronConfig } from "@src/electronConfig";
import { connectionManager, type DBS } from "@src/index";
import { getPasswordlessAdmin } from "@src/init/initUsers";
import { statePrgl } from "@src/init/startProstgles";
import {
  getMcpHostInfo,
  getMCPServersStatus,
  installMCPServer,
} from "@src/McpHub/AnthropicMcpHub/installMCPServer";
import { callMCPServerTool } from "@src/McpHub/callMCPServerTool";
import { reloadMcpServerTools } from "@src/McpHub/reloadMcpServerTools";
import { getStatus } from "@src/methods/getPidStats";
import { killPID } from "@src/methods/statusMonitorUtils";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { prostglesServices } from "@src/ServiceManager/ServiceManagerTypes";
import {
  DUMP_OPTIONS_SCHEMA,
  RESTORE_OPTIONS_SCHEMA,
} from "@src/tableConfig/tableConfigBackups";
import { FILE_TABLE_CONFIG_SCHEMA } from "@src/tableConfig/tableConfigDatabaseConfig";
import { upsertConnection } from "@src/upsertConnection";
import { existsSync, readdirSync, statSync } from "fs";
import { mkdir } from "fs/promises";
import { glob } from "glob";
import * as os from "os";
import path, { join } from "path";
import { createServerFunctionWithContext } from "prostgles-server";
import { getIsSuperUser } from "prostgles-server/dist/Prostgles";
import { getKeys, includes, isEmpty, type SQLHandler } from "prostgles-types";
import { getSampleSchemas } from "../applySampleSchema";
import { refreshModels } from "../askLLM/refreshModels";
import { deleteConnection } from "../deleteConnection";
import { getConnectionAndDatabaseConfig } from "../getConnectionAndDatabaseConfig";
import { getNodeTypes } from "../getNodeTypes";
import { runConnectionQuery } from "../getServerFunctions";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { setFileStorage } from "../setFileStorage";
import { getWebAppServerFunctions } from "./getWebAppServerFunctions";
import type {
  DBGeneratedSchema,
  GeneratedFunctionSchema,
} from "@common/DBGeneratedSchema";

export const getAdminServerFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const defineAdminFunction = createServerFunctionWithContext(
    context?.type === "admin" ? context : undefined,
  );

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
        path: { type: "string", optional: true },
        timeout: { type: "integer", optional: true },
      },
      run: async ({ path, timeout = 10_000 }) => {
        const currentPath = os.homedir();
        const pattern = join(path || currentPath, "*");
        if (timeout <= 0 || timeout > 120_000) {
          throw "Timeout must be between 1 and 120 seconds";
        }
        // pass in a signal to cancel the glob walk
        const resultItems = await glob(pattern, {
          signal: AbortSignal.timeout(timeout),
          withFileTypes: true,
        });
        const result = Array.from(resultItems).map((r) => ({
          path: r.fullpath(),
          name: r.name,
          type:
            r.isDirectory() ? "directory"
            : r.isBlockDevice() ? "block"
            : "file",
          size: r.size,
          lastModified: r.mtimeMs,
          created: r.ctimeMs,
        }));
        return {
          pattern,
          path: currentPath,
          result,
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
          return statePrgl.getTSSchema();
        }
        const c = connectionManager.getConnectionStartedInstance(conId);
        return c.prgl.getTSSchema();
      },
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

        if (conId && typeof conId !== "string") {
          throw "Invalid/Inexisting connection id provided";
        }
        const dir = connectionManager.getFileFolderPath(conId);
        return dirSize(dir);
      },
    }),
    testDBConnection: defineAdminFunction({
      input: { connection: "any" },
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
        sampleSchemaName: { type: "string", optional: true },
      },
      run: async ({ connection, sampleSchemaName }, { dbs, user }) => {
        const res = await upsertConnection(
          connection,
          user.id,
          dbs,
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
    pgDump: defineAdminFunction({
      input: {
        conId: "string",
        credId: { oneOf: ["number", { enum: [null] }] },
        opts: {
          type: {
            name: { type: "string", optional: true },
            initiator: { type: "string", optional: true },
            options: DUMP_OPTIONS_SCHEMA.jsonbSchema,
          },
        },
      },
      run: ({ conId, credId, opts }, { backupManager }) => {
        return backupManager.pgDump(conId, credId, opts);
      },
    }),
    pgRestore: defineAdminFunction({
      input: {
        bkpId: "string",
        connId: { type: "string", optional: true },
        opts: "any",
      },
      run: async ({ bkpId, opts, connId }, { backupManager }) =>
        backupManager.pgRestore({ bkpId, connId }, undefined, opts),
    }),
    bkpDelete: defineAdminFunction({
      input: {
        bkpId: "string",
        force: { type: "boolean", optional: true },
      },
      run: ({ bkpId, force }, { backupManager }) =>
        backupManager.bkpDelete(bkpId, force),
    }),

    streamBackupFile: defineAdminFunction({
      input: {
        data: {
          oneOfType: [
            {
              type: { enum: ["start"] },
              fileName: "string",
              connectionId: "string",
              sizeBytes: "integer",
              restoreOptions: {
                type: RESTORE_OPTIONS_SCHEMA["jsonbSchemaType"],
              },
            },
            {
              type: { enum: ["chunk"] },
              streamId: "string",
              chunk: "string",
            },
            {
              type: { enum: ["end"] },
              streamId: "string",
            },
          ] as const,
        },
      },
      run: async ({ data }, { user, backupManager }) => {
        if (data.type === "start") {
          const stream = backupManager.getTempFileStream(
            data.fileName,
            user.id,
          );
          await backupManager.pgRestoreStream(
            data.fileName,
            data.connectionId,
            stream.stream,
            data.sizeBytes,
            data.restoreOptions,
          );

          return stream.streamId;
        } else if (data.type === "chunk") {
          return new Promise<string>((resolve, reject) => {
            backupManager.pushToStream(data.streamId, data.chunk, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(data.streamId);
              }
            });
          });
        } else {
          backupManager.closeStream(data.streamId);
        }
      },
    }),
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
    runConnectionQuery: defineAdminFunction({
      input: {
        conId: "string",
        query: "string",
        args: { type: "any", optional: true },
      },
      run: ({ conId, query, args }) =>
        runConnectionQuery(conId, query, args, undefined, true),
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
        return getNodeTypes();
      },
    }),
    installMCPServer: defineAdminFunction({
      input: { name: "string" },
      run: async ({ name }, { dbs }) => {
        return installMCPServer(dbs, name);
      },
    }),
    getMCPServersStatus: defineAdminFunction({
      input: { serverName: "string" },
      run: ({ serverName }, { dbs }) => getMCPServersStatus(dbs, serverName),
    }),
    callMCPServerTool: defineAdminFunction({
      input: {
        chatId: "integer",
        serverName: "string",
        toolName: "string",
        args: { record: {}, optional: true },
      },
      run: async (
        { chatId, serverName, toolName, args },
        { dbs, user, clientReq },
      ) => {
        const res = await callMCPServerTool(
          user,
          chatId,
          dbs,
          serverName,
          toolName,
          args,
          clientReq,
        );
        return res;
      },
    }),
    reloadMcpServerTools: defineAdminFunction({
      input: { serverName: "string" },
      run: async ({ serverName }, { dbs }) =>
        reloadMcpServerTools(dbs, serverName),
    }),
    getMcpHostInfo: defineAdminFunction({
      run: () => getMcpHostInfo(),
    }),
    transcribeAudio: defineAdminFunction({
      input: { audioBlob: "Blob" },
      run: async ({ audioBlob }, { servicesManager }) => {
        const speechToTextService = servicesManager.getService("speechToText");
        if (speechToTextService?.status !== "running") {
          throw "Speech to Text service is not enabled/running";
        }
        const formData = new FormData();
        const audioBlobWithMime = new Blob([audioBlob], { type: "audio/webm" });

        formData.append("audio", audioBlobWithMime, "recording.webm");
        const result =
          await speechToTextService.endpoints["/transcribe"](formData);

        return result;
      },
    }),
    startWorkflow: defineAdminFunction({
      input: {
        chatId: "integer",
        workflowDefinition: "string",
      },
      run: async (
        { chatId, workflowDefinition },
        { dbs, user, getClientDBHandlers },
      ) => {
        const chat = await dbs.llm_chats.findOne({
          id: chatId,
          user_id: user.id,
        });
        if (!chat) {
          throw "Chat not found";
        }
        const { clientMethods } = await getClientDBHandlers(undefined);
        const dbsMethods = clientMethods as unknown as GeneratedFunctionSchema;
        // dbsMethods.askLLM();
      },
    }),
  };
  /** Ensure we didn't miss anything.  */
  Object.entries(adminMethods).forEach(([name, method]) => {
    if (context?.type !== "admin" && method.run) {
      throw `Admin method ${name} has run defined without admin context`;
    }
  });
  return adminMethods;
};
