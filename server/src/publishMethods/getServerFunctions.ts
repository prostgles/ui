import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import fs from "fs";
import * as os from "os";
import path, { join } from "path";
import type { DBS } from "../index";
import { connectionManager } from "../index";

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import { getPasswordHash } from "@src/authConfig/authUtils";
import { initBackupManager } from "@src/init/onProstglesReady";
import { statePrgl } from "@src/init/startProstgles";
import { reloadMcpServerTools } from "@src/McpHub/reloadMcpServerTools";
import { getPasswordlessAdmin } from "@src/SecurityManager/initUsers";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { prostglesServices } from "@src/ServiceManager/ServiceManagerTypes";
import { TRANSCRIBE_OUTPUT_SCHEMA } from "@src/ServiceManager/services/speechToText/TRANSCRIBE_OUTPUT_SCHEMA";
import {
  DUMP_OPTIONS_SCHEMA,
  RESTORE_OPTIONS_SCHEMA,
} from "@src/tableConfig/tableConfigBackups";
import { FILE_TABLE_CONFIG_SCHEMA } from "@src/tableConfig/tableConfigDatabaseConfig";
import { mkdir } from "fs/promises";
import {
  createServerFunctionWithContext,
  type ServerFunctionDefinition,
  type ServerFunctionDefinitions,
} from "prostgles-server";
import { getIsSuperUser } from "prostgles-server/dist/Prostgles";
import type { AnyObject } from "prostgles-types";
import { getKeys, includes, isEmpty } from "prostgles-types";
import { checkClientIP, type SUser } from "../authConfig/sessionUtils";
import { getInstalledPsqlVersions } from "../BackupManager/getInstalledPrograms";
import {
  getCDB,
  getSuperUserCDB,
} from "../ConnectionManager/ConnectionManager";
import { getCompiledTS } from "../ConnectionManager/connectionManagerUtils";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { validateConnection } from "../connectionUtils/validateConnection";
import { getElectronConfig } from "../electronConfig";
import {
  getMcpHostInfo,
  getMCPServersStatus,
  installMCPServer,
} from "../McpHub/AnthropicMcpHub/installMCPServer";
import { callMCPServerTool } from "../McpHub/callMCPServerTool";
import { getStatus } from "../methods/getPidStats";
import { killPID } from "../methods/statusMonitorUtils";
import { upsertConnection } from "../upsertConnection";
import { getSampleSchemas } from "./applySampleSchema";
import { refreshModels } from "./askLLM/refreshModels";
import { deleteConnection } from "./deleteConnection";
import { getConnectionAndDatabaseConfig } from "./getConnectionAndDatabaseConfig";
import { getNodeTypes } from "./getNodeTypes";
import { setFileStorage } from "./setFileStorage";
import { getUserServerFunctions } from "./userServerFunctions/userServerFunctions";
import { glob } from "glob";

export const getServerFunctions: ServerFunctionDefinitions<
  DBGeneratedSchema,
  SUser
> = async (params) => {
  const context = await (async () => {
    if (!params?.user) return;
    const { dbo: dbs, db: _dbs, user } = params;
    const backupManager = await initBackupManager(_dbs, dbs);
    const servicesManager = getServiceManager(dbs);
    if (user.type === "admin") {
      return {
        ...params,
        backupManager,
        servicesManager,
        dbs,
        user,
        type: "admin" as const,
      };
    }
    return {
      ...params,
      dbs,
      type: "user" as const,
    };
  })();

  const defineAdminFunction = createServerFunctionWithContext(
    context?.type === "admin" ? context : undefined,
    "any",
  );
  const definePublicFunction = createServerFunctionWithContext(params, "any");

  const adminMethods = {
    makeDirectory: defineAdminFunction({
      input: { path: "string", folderName: "string" },
      output: "string",
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
        const c = connectionManager.getConnection(conId);
        return c.prgl.getTSSchema();
      },
    }),
    getMyIP: defineAdminFunction({
      run: async (_, { dbs, clientReq: { socket } }) => {
        if (!socket) throw "Socket missing";
        return checkClientIP(
          dbs,
          { socket },
          await dbs.database_configs.findOne({
            $existsJoined: { connections: { is_state_db: true } },
          }),
        );
      },
    }),
    getConnectedIds: defineAdminFunction({
      run: () => {
        return Object.keys(connectionManager.prglConnections);
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
          return serviceManager.enableService(serviceName, () => {});
        } else {
          return serviceManager.stopService(serviceName);
        }
      },
    }),
    getDBSize: defineAdminFunction({
      input: { conId: "string" },
      run: async ({ conId }) => {
        const c = connectionManager.getConnection(conId);
        const size = (await c.prgl.db.sql(
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
        const c = connectionManager.getConnection(conId);
        return getIsSuperUser(c.prgl._db);
      },
    }),
    getFileFolderSizeInBytes: defineAdminFunction({
      input: { conId: { type: "string", optional: true } },
      run: ({ conId }) => {
        const dirSize = (directory: string): number => {
          if (!fs.existsSync(directory)) return 0;
          const files = fs.readdirSync(directory);
          const stats = files.flatMap((file) => {
            const fileOrPathDir = path.join(directory, file);
            const stat = fs.statSync(fileOrPathDir);
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
        return { connection: validatedConnection, warn: "" };
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
        const conn = connectionManager.getConnection(conId);
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
      output: { type: "string", optional: true },
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
          return new Promise((resolve, reject) => {
            backupManager.pushToStream(data.streamId, data.chunk, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(1);
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
      run: ({ conId, query, args }) => runConnectionQuery(conId, query, args),
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
        const { c } = await getConnectionAndDatabaseConfig(dbs, connId);
        const newConn = await dbs.connections.update({ id: c.id }, changes, {
          returning: "*",
          multi: false,
        });
        if (!newConn) throw "Unexpected: newConn missing";
        await connectionManager.setOnMount(
          connId,
          newConn.on_mount_ts,
          newConn.on_mount_ts_disabled,
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
        await connectionManager.setTableConfig(
          connId,
          newDbConf.table_config_ts,
          newDbConf.table_config_ts_disabled,
        );
      },
    }),
    getForkedProcStats: defineAdminFunction({
      input: { connectionId: "string" },
      run: async ({ connectionId }) => {
        const prgl = connectionManager.getConnection(connectionId);
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
      output: TRANSCRIBE_OUTPUT_SCHEMA,
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
  };
  /** Ensure we didn't miss anything.  */
  Object.entries(adminMethods).forEach(([name, method]) => {
    if (context?.type !== "admin" && method.run) {
      throw `Admin method ${name} has run defined without admin context`;
    }
  });
  const userServerFunctions = await getUserServerFunctions(params);

  return {
    ...userServerFunctions,
    ...adminMethods,
    startConnection: definePublicFunction({
      input: { connectionId: "string" },
      output: {
        type: {
          socketPath: "string",
          socketUrl: { type: "string", optional: true },
        },
        optional: true,
      },
      run: async (
        { connectionId },
        { user, dbo: dbs, db: _dbs, clientReq: { socket } },
      ) => {
        try {
          const socketPathAndUrl = await connectionManager.startConnection(
            connectionId,
            dbs,
            _dbs,
            socket,
          );
          return socketPathAndUrl;
        } catch (error) {
          console.error("Could not start connection " + connectionId, error);
          /* Used to prevent data leak to client */
          if (user?.type === "admin") {
            throw error;
          } else {
            throw `Something went wrong when connecting to ${connectionId}`;
          }
        }
      },
    }),
  } as unknown as Record<string, ServerFunctionDefinition>;
};

export const runConnectionQuery = async (
  connId: string,
  query: string,
  args?: AnyObject | any[],
  asAdminOpts?: { dbs: DBS },
): Promise<AnyObject[]> => {
  const { db } =
    asAdminOpts ?
      await getSuperUserCDB(connId, asAdminOpts.dbs)
    : await getCDB(connId);
  return db.any(query, args);
};
