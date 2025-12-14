import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { authenticator } from "@otplib/preset-default";
import * as crypto from "crypto";
import fs from "fs";
import * as os from "os";
import path, { join } from "path";
import type { PublishMethods } from "prostgles-server/dist/PublishParser/PublishParser";
import type { DBS } from "../index";
import { connMgr } from "../index";

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import type { LLMMessage } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import { reloadMcpServerTools } from "@src/McpHub/reloadMcpServerTools";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { prostglesServices } from "@src/ServiceManager/ServiceManagerTypes";
import type { SessionUser } from "prostgles-server/dist/Auth/AuthTypes";
import { getIsSuperUser } from "prostgles-server/dist/Prostgles";
import type { AnyObject } from "prostgles-types";
import { getKeys, includes, isEmpty } from "prostgles-types";
import { getPasswordHash } from "../authConfig/authUtils";
import { checkClientIP, createSessionSecret } from "../authConfig/sessionUtils";
import type { Backups } from "../BackupManager/BackupManager";
import { getInstalledPsqlVersions } from "../BackupManager/getInstalledPrograms";
import type { ConnectionTableConfig } from "../ConnectionManager/ConnectionManager";
import {
  getACRules,
  getCDB,
  getSuperUserCDB,
} from "../ConnectionManager/ConnectionManager";
import { getCompiledTS } from "../ConnectionManager/connectionManagerUtils";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { validateConnection } from "../connectionUtils/validateConnection";
import { getElectronConfig } from "../electronConfig";
import { callMCPServerTool } from "../McpHub/callMCPServerTool";
import {
  getMcpHostInfo,
  getMCPServersStatus,
  installMCPServer,
} from "../McpHub/AnthropicMcpHub/installMCPServer";
import { getStatus } from "../methods/getPidStats";
import { killPID } from "../methods/statusMonitorUtils";
import { getPasswordlessAdmin } from "../SecurityManager/initUsers";
import { upsertConnection } from "../upsertConnection";
import { getSampleSchemas } from "./applySampleSchema";
import { askLLM, stopAskLLM } from "./askLLM/askLLM";
import { getFullPrompt } from "./askLLM/getFullPrompt";
import { getLLMToolsAllowedInThisChat } from "./askLLM/getLLMToolsAllowedInThisChat";
import { refreshModels } from "./askLLM/refreshModels";
import { deleteConnection } from "./deleteConnection";
import { getConnectionAndDatabaseConfig } from "./getConnectionAndDatabaseConfig";
import { getNodeTypes } from "./getNodeTypes";
import { prostglesSignup } from "./prostglesSignup";
import { setFileStorage } from "./setFileStorage";
import { initBackupManager } from "@src/init/onProstglesReady";
import { statePrgl } from "@src/init/startProstgles";
import { glob } from "glob";
import { mkdir } from "fs/promises";

export const publishMethods: PublishMethods<
  DBGeneratedSchema,
  SessionUser<Users, Users>
> = async (params) => {
  const { dbo: dbs, clientReq, db: _dbs, user } = params;
  const { socket } = clientReq;
  const bkpManager = await initBackupManager(_dbs, dbs);
  if (!user || !user.id) {
    return {};
  }

  const servicesManager = getServiceManager(dbs);

  const adminMethods: ReturnType<PublishMethods> = {
    mkdir: async (path: string, folderName: string) => {
      if (!path) throw "Path is required";
      if (!folderName) throw "Folder name is required";
      const fullPath = join(path, folderName);
      await mkdir(fullPath);
      return fullPath;
    },
    glob: async (path?: string, timeout: number = 10_000) => {
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
    disablePasswordless: async (newAdmin: {
      username: string;
      password: string;
    }) => {
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
    getConnectionDBTypes: (conId: string | undefined) => {
      if (!statePrgl) throw "statePrgl missing";
      /** No connection id = state connection */
      if (!conId) {
        return statePrgl.getTSSchema();
      }
      const c = connMgr.getConnection(conId);
      return c.prgl.getTSSchema();
    },
    getMyIP: async () => {
      if (!socket) throw "Socket missing";
      return checkClientIP(
        dbs,
        { socket },
        await dbs.global_settings.findOne(),
      );
    },
    getConnectedIds: () => {
      return Object.keys(connMgr.getConnections());
    },
    toggleService: async (serviceName: string, enable: boolean) => {
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
    getDBSize: async (conId: string) => {
      const c = connMgr.getConnection(conId);
      const size = (await c.prgl.db.sql(
        "SELECT pg_size_pretty( pg_database_size(current_database()) ) ",
        {},
        { returnType: "value" },
      )) as string;
      return size;
    },
    getIsSuperUser: async (conId: string) => {
      const c = connMgr.getConnection(conId);
      return getIsSuperUser(c.prgl._db);
    },
    getFileFolderSizeInBytes: (conId?: string) => {
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
      const dir = connMgr.getFileFolderPath(conId);
      return dirSize(dir);
    },
    testDBConnection,
    validateConnection: (c: Connections) => {
      const connection = validateConnection(c);
      return { connection, warn: "" };
    },
    getInstalledPsqlVersions: () => {
      return getInstalledPsqlVersions(_dbs);
    },
    createConnection: async (con: Connections, sampleSchemaName?: string) => {
      const res = await upsertConnection(con, user.id, dbs, sampleSchemaName);
      const el = getElectronConfig();
      if (res.connection.is_state_db && el?.isElectron) {
        el.setCredentials(res.connection);
      }
      return res;
    },
    refreshModels: () => refreshModels(dbs),
    reloadSchema: async (conId: string) => {
      const conn = connMgr.getConnection(conId);
      if (conId && typeof conId !== "string") {
        throw "Invalid/Inexisting connection id provided";
      }
      await conn.prgl.restart();
    },
    deleteConnection: (
      id: string,
      opts?: { keepBackups: boolean; dropDatabase: boolean },
    ) => deleteConnection(dbs, bkpManager, id, opts),
    disconnect: async (conId: string) => {
      return connMgr.disconnect(conId);
    },
    pgDump: bkpManager.pgDump,
    pgRestore: async (arg1: { bkpId: string; connId?: string }, opts?: any) =>
      bkpManager.pgRestore(arg1, undefined, opts),
    bkpDelete: bkpManager.bkpDelete,

    streamBackupFile: async (
      c: "start" | "chunk" | "end",
      id: null | string,
      conId: string | null,
      chunk: string | undefined,
      sizeBytes: number | undefined,
      restore_options: Backups["restore_options"],
    ) => {
      if (c === "start" && id && conId && sizeBytes) {
        const stream = bkpManager.getTempFileStream(id, user.id);
        await bkpManager.pgRestoreStream(
          id,
          conId,
          stream.stream,
          sizeBytes,
          restore_options,
        );

        return stream.streamId;
      } else if (c === "chunk" && id && chunk) {
        return new Promise((resolve, reject) => {
          bkpManager.pushToStream(id, chunk, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(1);
            }
          });
        });
      } else if (c === "end" && id) {
        bkpManager.closeStream(id);
      } else throw new Error("Not expected");
    },
    setFileStorage: (
      connId: string,
      tableConfig?: ConnectionTableConfig,
      opts?: { keepS3Data?: boolean; keepFileTable?: boolean },
    ) => setFileStorage(dbs, connId, tableConfig, opts),
    getStatus: (connId: string) => getStatus(connId, dbs),
    runConnectionQuery,
    getSampleSchemas,
    getCompiledTS: (ts: string) => {
      return getCompiledTS(ts);
    },
    killPID,
    setOnMount: async (
      connId: string,
      changes: Partial<
        Pick<DBSSchema["connections"], "on_mount_ts" | "on_mount_ts_disabled">
      >,
    ) => {
      if (isEmpty(changes)) {
        throw "No changes provided";
      }
      const { c } = await getConnectionAndDatabaseConfig(dbs, connId);
      const newConn = await dbs.connections.update({ id: c.id }, changes, {
        returning: "*",
        multi: false,
      });
      if (!newConn) throw "Unexpected: newConn missing";
      await connMgr.setOnMount(
        connId,
        newConn.on_mount_ts,
        newConn.on_mount_ts_disabled,
      );
    },
    setTableConfig: async (
      connId: string,
      changes: Partial<
        Pick<
          DBSSchema["database_configs"],
          "table_config_ts" | "table_config_ts_disabled"
        >
      >,
    ) => {
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
      await connMgr.setTableConfig(
        connId,
        newDbConf.table_config_ts,
        newDbConf.table_config_ts_disabled,
      );
    },
    getForkedProcStats: async (connId: string) => {
      const prgl = connMgr.getConnection(connId);
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
    getNodeTypes,
    installMCPServer: async (name: string) => {
      return installMCPServer(dbs, name);
    },
    getMCPServersStatus: (serverName: string) =>
      getMCPServersStatus(dbs, serverName),
    callMCPServerTool: async (
      chatId: number,
      serverName: string,
      toolName: string,
      args: Record<string, unknown> | undefined,
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
    reloadMcpServerTools: async (serverName: string) =>
      reloadMcpServerTools(dbs, serverName),
    getMcpHostInfo,
    transcribeAudio: async (audioBlob: Blob) => {
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
  };

  const isAdmin = user.type === "admin";
  const accessRules = isAdmin ? undefined : await getACRules(dbs, user);
  const allowedLLMCreds =
    isAdmin ? undefined
    : !accessRules?.length ? undefined
    : await dbs.access_control_allowed_llm.find({
        access_control_id: { $in: accessRules.map((ac) => ac.id) },
      });
  const userMethods = {
    ...((allowedLLMCreds || isAdmin) && {
      askLLM: async (
        connectionId: string,
        userMessage: LLMMessage["message"],
        schema: string,
        chatId: number,
        type: "new-message" | "approve-tool-use",
      ) => {
        await askLLM({
          connectionId,
          userMessage,
          schema,
          chatId,
          dbs,
          user,
          allowedLLMCreds,
          accessRules,
          clientReq,
          type,
          aborter: undefined,
        });
      },
    }),
    getFullPrompt,
    stopAskLLM: async (chatId: number) => {
      if (!chatId) throw "Chat ID is required";
      const chat = await dbs.llm_chats.findOne({ id: chatId });
      if (!chat) throw "Chat not found";
      if (chat.user_id !== user.id && user.type !== "admin") {
        throw "You are not allowed to stop this chat";
      }
      stopAskLLM(chatId);
      await dbs.llm_chats.update({ id: chatId }, { status: null });
    },
    sendFeedback: async ({
      details,
      email,
    }: {
      details: string;
      email?: string;
    }) => {
      await fetch("https://prostgles.com/feedback", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ details, email }),
      });
    },
    prostglesSignup,
    generateToken: async (days: number) => {
      if (!Number.isInteger(days)) {
        throw "Expecting an integer days but got: " + days;
      }

      if (!socket) throw "Socket missing";
      const ip_address = (socket as any).conn.remoteAddress as string;
      const session = await dbs.sessions.insert(
        {
          expires: Date.now() + days * 24 * 3600 * 1000,
          user_id: user.id,
          user_type: user.type,
          type: "api_token",
          ip_address,
          id: createSessionSecret(),
        },
        { returning: "*" },
      );

      return session.id;
    },
    create2FA: async () => {
      const userName = user.username;
      const service = "Prostgles UI";
      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(userName, service, secret);

      const recoveryCode = crypto.randomBytes(26).toString("hex");
      const hashedRecoveryCode = getPasswordHash(user, recoveryCode);
      await dbs.users.update(
        { id: user.id },
        { "2fa": { secret, recoveryCode: hashedRecoveryCode, enabled: false } },
      );
      return {
        url: otpauth,
        secret,
        recoveryCode,
      };
    },
    enable2FA: async (token: string) => {
      const latestUser = await dbs.users.findOne({ id: user.id });
      const secret = latestUser?.["2fa"]?.secret;
      if (!secret) throw "Secret not found";

      //totp.verify({ secret, token }) -> Does not work.
      const isValid = authenticator.check(token, secret);

      if (!isValid) throw "Invalid code";
      await dbs.users.update(
        { id: user.id },
        { "2fa": { ...latestUser["2fa"]!, enabled: true } },
      );

      /** Log out all web sessions after enabling 2fa */
      await dbs.sessions.update(
        {
          user_id: user.id,
          type: "web",
        },
        { type: "web", active: false },
      );
      return "ok";
    },
    disable2FA: () => {
      return dbs.users.update({ id: user.id }, { "2fa": null });
    },
    changePassword: async (oldPassword: string, newPassword: string) => {
      const hashedCurrentPassword = getPasswordHash(user, oldPassword);
      if (user.password !== hashedCurrentPassword)
        throw "Old password is incorrect";
      const hashedNewPassword = getPasswordHash(user, newPassword);
      await dbs.users.update({ id: user.id }, { password: hashedNewPassword });
    },
    getLLMAllowedChatTools: async (chatId: number) => {
      const chat = await dbs.llm_chats.findOne({ id: chatId });
      if (!chat || chat.user_id !== user.id) throw "Invalid chat";
      const connectionId = chat.connection_id;
      if (!connectionId) throw "Chat connection_id not found";
      if (!chat.llm_prompt_id) throw "Chat prompt_id not found";
      const prompt = await dbs.llm_prompts.findOne({ id: chat.llm_prompt_id });
      if (!prompt) throw "Chat prompt not found";
      const allowedTools = await getLLMToolsAllowedInThisChat({
        chat,
        userType: user.type,
        dbs,
        prompt,
        connectionId,
        clientReq,
      });
      return allowedTools;
    },
  };

  return {
    ...userMethods,
    ...(user.type === "admin" ? adminMethods : undefined),
    startConnection: async (con_id: string) => {
      try {
        const socketPath = await connMgr.startConnection(
          con_id,
          dbs,
          _dbs,
          socket,
        );
        return socketPath;
      } catch (error) {
        console.error("Could not start connection " + con_id, error);
        // Used to prevent data leak to client
        if (user.type === "admin") {
          throw error;
        } else {
          throw `Something went wrong when connecting to ${con_id}`;
        }
      }
    },
  };
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
