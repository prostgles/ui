import { authenticator } from "@otplib/preset-default";
import * as crypto from "crypto";
import fs from "fs";
import * as os from "os";
import path from "path";
import type { PublishMethods } from "prostgles-server/dist/PublishParser/PublishParser";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { DBS } from "../index";
import { connectionChecker, connMgr } from "../index";

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import type { DBHandlerServer } from "prostgles-server/dist/DboBuilder/DboBuilder";
import { getIsSuperUser } from "prostgles-server/dist/Prostgles";
import type { AnyObject } from "prostgles-types";
import { asName, isEmpty, pickKeys } from "prostgles-types";
import { isDefined } from "../../../commonTypes/filterUtils";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { isObject } from "../../../commonTypes/publishUtils";
import type { SampleSchema } from "../../../commonTypes/utils";
import { getPasswordHash } from "../authConfig/authUtils";
import { createSessionSecret } from "../authConfig/getAuth";
import type { Backups } from "../BackupManager/BackupManager";
import { getInstalledPrograms } from "../BackupManager/getInstalledPrograms";
import { getPasswordlessAdmin } from "../ConnectionChecker";
import type { ConnectionTableConfig } from "../ConnectionManager/ConnectionManager";
import {
  DB_TRANSACTION_KEY,
  getACRules,
  getCDB,
  getSuperUserCDB,
} from "../ConnectionManager/ConnectionManager";
import {
  getCompiledTS,
  getDatabaseConfigFilter,
  getEvaledExports,
} from "../ConnectionManager/connectionManagerUtils";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { validateConnection } from "../connectionUtils/validateConnection";
import { actualRootDir, getElectronConfig } from "../electronConfig";
import { getStatus } from "../methods/getPidStats";
import { killPID } from "../methods/statusMonitorUtils";
import { initBackupManager, statePrgl } from "../startProstgles";
import { upsertConnection } from "../upsertConnection";
import { askLLM } from "./askLLM/askLLM";
import { prostglesSignup } from "./prostglesSignup";

export const publishMethods: PublishMethods<DBGeneratedSchema> = async (
  params,
) => {
  const { dbo: dbs, clientReq, db: _dbs } = params;
  const { socket } = clientReq;

  const user: DBSSchema["users"] | undefined = params.user as any;

  const bkpManager = await initBackupManager(_dbs, dbs);
  if (!user || !user.id) {
    return {};
  }

  const getConnectionAndDbConf = async (connId: string) => {
    checkIf({ connId }, "connId", "string");
    const c = await dbs.connections.findOne({ id: connId });
    if (!c) throw "Connection not found";
    const dbConf = await dbs.database_configs.findOne(
      getDatabaseConfigFilter(c),
    );
    if (!dbConf) throw "Connection database_config not found";
    const db = connMgr.getConnectionDb(connId);
    if (!db) throw "db missing";

    return { c, dbConf, db };
  };

  const adminMethods: ReturnType<PublishMethods> = {
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
    getConnectionDBTypes: async (conId: string) => {
      /** Maybe state connection */
      // const con = await dbs.connections.findOne({ id: conId, is_state_db: true });
      if (!statePrgl) throw "statePrgl missing";
      // if(con){
      //   return statePrgl.getTSSchema()
      // }
      const dbsSchema = await statePrgl.getTSSchema();
      const c = connMgr.getConnection(conId);
      const dbSchema = await c.prgl.getTSSchema();
      return {
        dbsSchema,
        dbSchema,
      };
    },
    getMyIP: () => {
      if (!socket) throw "Socket missing";
      return connectionChecker.checkClientIP({ socket });
    },
    getConnectedIds: async (): Promise<string[]> => {
      return Object.keys(connMgr.getConnections());
    },
    getDBSize: async (conId: string) => {
      const c = connMgr.getConnection(conId);
      const size: string = await c.prgl.db.sql(
        "SELECT pg_size_pretty( pg_database_size(current_database()) ) ",
        {},
        { returnType: "value" },
      );
      return size;
    },
    getIsSuperUser: async (conId: string) => {
      const c = connMgr.getConnection(conId);
      return getIsSuperUser(c.prgl._db);
    },
    getFileFolderSizeInBytes: async (conId?: string) => {
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
      const dir = await connMgr.getFileFolderPath(conId);
      return dirSize(dir);
    },
    testDBConnection,
    validateConnection: async (c: Connections) => {
      const connection = validateConnection(c);
      return { connection, warn: "" };
    },
    getPsqlVersions: () => {
      return getInstalledPrograms(_dbs);
    },
    createConnection: async (con: Connections, sampleSchemaName?: string) => {
      const res = await upsertConnection(con, user.id, dbs, sampleSchemaName);
      const el = getElectronConfig();
      if (res.connection.is_state_db && el?.isElectron) {
        await el.setCredentials(res.connection);
      }
      return res;
    },
    reloadSchema: async (conId: string) => {
      const conn = connMgr.getConnection(conId);
      if (conId && typeof conId !== "string") {
        throw "Invalid/Inexisting connection id provided";
      }
      await conn.prgl.restart();
    },
    deleteConnection: async (
      id: string,
      opts?: { keepBackups: boolean; dropDatabase: boolean },
    ) => {
      try {
        return dbs.tx!(async (t) => {
          const con = await t.connections.findOne({ id });
          if (con?.is_state_db)
            throw "Cannot delete a prostgles state database connection";
          await connMgr.prglConnections[id]?.methodRunner?.destroy();
          await connMgr.prglConnections[id]?.onMountRunner?.destroy();
          await connMgr.prglConnections[id]?.tableConfigRunner?.destroy();
          if (opts?.dropDatabase) {
            if (!con?.db_name) throw "Unexpected: Database name missing";
            const { db: cdb, destroy: destroyCdb } = await getCDB(
              con.id,
              undefined,
              true,
            );
            const anotherDatabaseNames: { datname: string }[] = await cdb.any(`
              SELECT * 
              FROM pg_catalog.pg_database 
              WHERE datname <> current_database() 
              AND NOT datistemplate
              ORDER BY datname = 'postgres' DESC
            `);
            const _superUsers: { usename: string }[] = await cdb.any(
              `
              SELECT usename 
              FROM pg_user WHERE usesuper = true
              `,
              {},
            );
            const superUsers = _superUsers.map((u) => u.usename);
            await destroyCdb();
            const [anotherDatabaseName] = anotherDatabaseNames;
            if (!anotherDatabaseName) throw "Could not find another database";
            if (anotherDatabaseName.datname === con.db_name) {
              throw "Not expected: Another database is the same as the one being deleted";
            }

            let superUser: { user: string; password: string } | undefined;
            if (!superUsers.includes(con.db_user)) {
              const conWithSuperUsers = await t.connections.findOne({
                db_user: { $in: superUsers },
                db_host: con.db_host,
                db_port: con.db_port,
                db_pass: { "<>": null },
              });
              if (conWithSuperUsers) {
                superUser = {
                  user: conWithSuperUsers.db_user,
                  password: conWithSuperUsers.db_pass!,
                };
              }
            }
            const { db: acdb } = await getCDB(
              con.id,
              { database: anotherDatabaseName.datname, ...superUser },
              true,
            );
            const killDbConnections = () => {
              return acdb.manyOrNone(
                `
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = \${db_name}
                AND pid <> pg_backend_pid();
              `,
                con,
              );
            };
            await killDbConnections();
            await killDbConnections();
            await acdb.any(
              `
              DROP DATABASE ${asName(con.db_name)};
            `,
              con,
            );
            await connMgr.disconnect(con.id);
          }
          const conFilter = { connection_id: id };
          await t.workspaces.delete(conFilter);

          if (opts?.keepBackups) {
            await t.backups.update(conFilter, { connection_id: null });
          } else {
            const bkps = await t.backups.find(conFilter);
            for await (const b of bkps) {
              await bkpManager.bkpDelete(b.id, true);
            }
            await t.backups.delete(conFilter);
          }

          const result = await t.connections.delete({ id }, { returning: "*" });

          /** delete orphaned database_configs */
          await t.database_configs.delete({
            $notExistsJoined: { connections: {} },
          });
          return result;
        });
      } catch (err) {
        return Promise.reject(err);
      }
    },
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
      chunk: any | undefined,
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
    setFileStorage: async (
      connId: string,
      tableConfig?: ConnectionTableConfig,
      opts?: { keepS3Data?: boolean; keepFileTable?: boolean },
    ) => {
      const { db, dbConf } = await getConnectionAndDbConf(connId);

      let newTableConfig: ConnectionTableConfig | null =
        tableConfig ?
          {
            ...tableConfig,
          }
        : null;

      /** Enable file storage */
      if (tableConfig) {
        if (typeof tableConfig.referencedTables !== "undefined") {
          checkIf(tableConfig, "referencedTables", "object");
        }
        if (
          tableConfig.referencedTables &&
          Object.keys(tableConfig).length === 1
        ) {
          if (!dbConf.file_table_config) throw "Must enable file storage first";
          newTableConfig = { ...dbConf.file_table_config, ...tableConfig };
        } else {
          checkIf(tableConfig, "fileTable", "string");
          checkIf(tableConfig, "storageType", "object");
          const { storageType } = tableConfig;

          checkIf(storageType, "type", "oneOf", ["local", "S3"]);
          if (storageType.type === "S3") {
            if (
              !(await dbs.credentials.findOne({
                id: storageType.credential_id,
              }))
            ) {
              throw "Invalid credential_id provided";
            }
          }
          const KEYS = ["fileTable", "storageType"] as const;
          if (
            dbConf.file_table_config &&
            JSON.stringify(pickKeys(dbConf.file_table_config, KEYS as any)) !==
              JSON.stringify(pickKeys(tableConfig, KEYS as any))
          ) {
            throw "Cannot update " + KEYS.join("or");
          }

          newTableConfig = tableConfig;
        }

        /** Disable current file storage */
      } else {
        const fileTable = dbConf.file_table_config?.fileTable;
        if (!fileTable) throw "Unexpected: fileTable already disabled";
        await (db[DB_TRANSACTION_KEY] as DBHandlerServer["tx"])!(
          async (dbTX) => {
            const fileTableHandler = dbTX[fileTable];
            if (!fileTableHandler)
              throw "Unexpected: fileTable table handler missing";
            if (
              dbConf.file_table_config?.fileTable &&
              (dbConf.file_table_config.storageType.type === "local" ||
                !opts?.keepS3Data)
            ) {
              if (!fileTable || !fileTableHandler.delete) {
                throw "Unexpected error. fileTable handler not found";
              }

              await fileTableHandler.delete!({});
            }
            if (!opts?.keepFileTable) {
              await dbTX.sql!("DROP TABLE ${fileTable:name} CASCADE", {
                fileTable,
              });
            }
          },
        );
        newTableConfig = null;
      }
      const con = await dbs.connections.findOne({ id: connId });
      if (!con) throw "Connection not found";
      await dbs
        .tx(async (t) => {
          await connMgr.setFileTable(con, newTableConfig);
          await t.database_configs.update(
            { id: dbConf.id },
            { file_table_config: newTableConfig },
          );
        })
        .catch((err) => {
          console.log({ err });
          return Promise.reject(err);
        });
    },
    getStatus: (connId: string) => getStatus(connId, dbs),
    runConnectionQuery,
    getSampleSchemas,
    getCompiledTS: async (ts: string) => {
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
      const { c } = await getConnectionAndDbConf(connId);
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
      const { dbConf } = await getConnectionAndDbConf(connId);
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
      return {
        server: {
          // cpu: os.cpus(),
          mem: os.totalmem(),
          freemem: os.freemem(),
        },
        methodRunner: await prgl.methodRunner?.getProcStats(),
        onMountRunner: await prgl.onMountRunner?.getProcStats(),
        tableConfigRunner: await prgl.tableConfigRunner?.getProcStats(),
      };
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
      askLLM: async (question: string, schema: string, chatId: number) => {
        await askLLM(
          question,
          schema,
          chatId,
          dbs,
          user,
          allowedLLMCreds,
          accessRules,
        );
      },
    }),
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
      const ip_address = (socket as any).conn.remoteAddress;
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
    getAPITSDefinitions: () => {
      /** Must install them into the server folder! */
      const clientNodeModules = path.resolve(
        __dirname + "/../../../../client/node_modules/",
      );
      const prostglesTypes = path.resolve(
        clientNodeModules + "/prostgles-types/dist",
      );
      const prostglesClient = path.resolve(
        clientNodeModules + "/prostgles-client/dist",
      );

      return [
        ...getTSFiles(prostglesClient).map((l) => ({
          ...l,
          name: "prostgles-client",
        })),
        ...getTSFiles(prostglesTypes).map((l) => ({
          ...l,
          name: "prostgles-types",
        })),
      ];
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

function getTSFiles(dirPath: string) {
  return fs
    .readdirSync(dirPath)
    .map((path) => {
      if (path.endsWith(".d.ts")) {
        const content = fs.readFileSync(dirPath + "/" + path, {
          encoding: "utf8",
        });
        console.log(path, content);
        return { path, content };
      }
    })
    .filter(isDefined);
}

process.on("exit", (code) => {
  console.log(code);
});

export const is = {
  string: (v: any, notEmtpy = true): v is string =>
    typeof v === "string" && (notEmtpy ? !!v.length : true),
  integer: (v: any): v is number => Number.isInteger(v),
  number: (v: any): v is number => Number.isFinite(v),
  object: (v: any): v is Record<string, any> => isObject(v),
  oneOf: <T>(v: any, vals: T[]): v is T => vals.includes(v),
} as const;

export const checkIf = <Obj, isType extends keyof typeof is>(
  obj: Obj,
  key: keyof Obj,
  isType: isType,
  arg1?: Parameters<(typeof is)[isType]>[1],
): true => {
  const isOk = is[isType](obj[key], arg1 as any);
  if (!isOk)
    throw `${key.toString()} is not of type ${isType}${isType === "oneOf" ? `(${arg1})` : ""}. Source object: ${JSON.stringify(obj, null, 2)}`;
  return true;
};
const tryReadFile = (path: string) => {
  try {
    return fs.readFileSync(path, "utf8");
  } catch (err) {
    return undefined;
  }
};
export const getSampleSchemas = async (): Promise<SampleSchema[]> => {
  const path = actualRootDir + `/sample_schemas`;
  const files = fs.readdirSync(path).filter((name) => !name.startsWith("_"));
  return files
    .map((name) => {
      const schemaPath = `${path}/${name}`;
      if (fs.statSync(`${schemaPath}`).isDirectory()) {
        const workspaceConfigStr = tryReadFile(
          `${schemaPath}/workspaceConfig.ts`,
        );

        return {
          path,
          name,
          type: "dir" as const,
          tableConfigTs: tryReadFile(`${schemaPath}/tableConfig.ts`) ?? "",
          onMountTs: tryReadFile(`${schemaPath}/onMount.ts`) ?? "",
          onInitSQL: tryReadFile(`${schemaPath}/onInit.sql`) ?? "",
          workspaceConfig:
            workspaceConfigStr ?
              getEvaledExports(workspaceConfigStr).workspaceConfig
            : undefined,
        };
      }
      return {
        name,
        path,
        type: "sql" as const,
        file: tryReadFile(schemaPath) ?? "",
      };
    })
    .filter(isDefined);
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
