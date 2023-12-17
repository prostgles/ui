
import * as crypto from "crypto";
import fs from "fs";
import path from 'path';
import { PublishMethods } from "prostgles-server/dist/PublishParser/PublishParser";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { DatabaseConfigs, connMgr, connectionChecker } from "./index";

import { authenticator } from '@otplib/preset-default';

export type Users = Required<DBSchemaGenerated["users"]["columns"]>; 
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;

import { DBHandlerServer } from "prostgles-server/dist/DboBuilder";
import { isSuperUser } from "prostgles-server/dist/Prostgles";
import { AnyObject, asName, pickKeys } from "prostgles-types";
import { DBSSchema, isObject } from "../../commonTypes/publishUtils";
import { ConnectionTableConfig, DB_TRANSACTION_KEY } from "./ConnectionManager/ConnectionManager";
import { isDefined } from "../../commonTypes/filterUtils";
import { Backups } from "./BackupManager/BackupManager";
import { ADMIN_ACCESS_WITHOUT_PASSWORD, insertUser } from "./ConnectionChecker";
import { testDBConnection } from "./connectionUtils/testDBConnection";
import { validateConnection } from "./connectionUtils/validateConnection";
import { demoDataSetup } from "./demoDataSetup";
import { getRootDir } from "./electronConfig";
import { getCDB, getStatus, killPID } from "./methods/statusMonitor";
import { initBackupManager, statePrgl } from "./startProstgles";
import { upsertConnection } from "./upsertConnection";
import { getCompiledTS, getDatabaseConfigFilter } from "./ConnectionManager/connectionManagerUtils";

export const publishMethods:  PublishMethods<DBSchemaGenerated> = async (params) => { //  socket, dbs: DBObj, _dbs, user: Users
  const { dbo: dbs, socket, db: _dbs } = params;
  const ip_address = (socket as any).conn.remoteAddress;

  const user: DBSSchema["users"] | undefined = params.user as any;


  const bkpManager = await initBackupManager(_dbs, dbs);
  if(!user || !user.id) {
    return {};
  }

  const getConnectionAndDbConf = async (connId: string) => {
    checkIf({ connId }, "connId", "string")
    const c = await dbs.connections.findOne({ id: connId });
    if(!c) throw "Connection not found";
    const dbConf = await dbs.database_configs.findOne(getDatabaseConfigFilter(c));
    if(!dbConf) throw "Connection not found";
    const db = connMgr.getConnectionDb(connId);
    if(!db) throw "db missing";

    return { c, dbConf, db };
  }

  const adminMethods: ReturnType<PublishMethods> = {
    makeFakeData: async (connId: string) => {
      const c = connMgr.getConnection(connId);
      const con = await dbs.connections.findOne({ id: connId });
      if(!c || !con) throw "bad connid";
      return demoDataSetup(c.prgl?._db!, "sample");
    },
    disablePasswordless: async (newAdmin: { username: string; password: string }) => {

      const noPwdAdmin = await ADMIN_ACCESS_WITHOUT_PASSWORD(dbs);
      if(!noPwdAdmin) throw "No passwordless admin found";

      await insertUser(dbs, _dbs, { username: newAdmin.username, password: newAdmin.password, type: "admin" });
      await dbs.users.update({ id: noPwdAdmin.id }, { status: "disabled" });
      await dbs.sessions.delete({});
    },
    getConnectionDBTypes: async (conId: string) => {

      /** Maybe state connection */
      const con = await dbs.connections.findOne({ id: conId, is_state_db: true });
      if(con){
        if(!statePrgl) throw "statePrgl missing";
        return statePrgl.getTSSchema()
      }

      const c = connMgr.getConnection(conId);
      if(c){
        return c.prgl?.getTSSchema();
      }

      console.error(`Not found`)

      return undefined;
    },
    getMyIP: () => {
      return connectionChecker.checkClientIP({ socket })
    },
    getConnectedIds: async (): Promise<string[]> => {
      return Object.keys(connMgr.getConnections());
    },
    getDBSize: async (conId: string) => {
      const db = connMgr.getConnection(conId);
      const size: string = await db?.prgl?.db?.sql?.("SELECT pg_size_pretty( pg_database_size(current_database()) ) ", { }, { returnType: "value" });
      return size;
    },
    getIsSuperUser: async (conId: string) => {
      const db = connMgr.getConnection(conId);
      if(!db?.prgl?._db) throw "Connection instance not found";
      return isSuperUser(db.prgl._db);
    },
    getFileFolderSizeInBytes: (conId?: string) => {
      const dirSize = (directory: string): number => {
        if(!fs.existsSync(directory)) return 0;
        const files = fs.readdirSync(directory);
        const stats = files.flatMap(file => {
          const fileOrPathDir = path.join(directory, file) 
          const stat = fs.statSync(fileOrPathDir);
          if(stat.isDirectory()){
            return dirSize(fileOrPathDir)
          }
          return stat.size;
        });
      
        return stats.reduce( ( accumulator, size) => accumulator + size, 0 );
      }
      
      if(conId && (typeof conId !== "string" || !connMgr.getConnection(conId))){
        throw "Invalid/Inexisting connection id provided"
      }
      const dir = connMgr.getFileFolderPath(conId);
      return dirSize(dir);
    },
    testDBConnection,
    validateConnection: async (c: Connections) => {
      let warn = "";
      const connection = validateConnection(c);
      if(connection.db_ssl){
        warn = ""
      }
      return { connection, warn }
    },
    createConnection: async (con: Connections) => {
      return upsertConnection(con, user.id, dbs);
    },
    reloadSchema: async (conId: string) => {
      const conn = connMgr.getConnection(conId)
      if(conId && typeof conId !== "string" || !conn?.prgl){
        throw "Invalid/Inexisting connection id provided"
      }
      await conn.prgl.restart();
    },
    deleteConnection: async (id: string, opts?: { keepBackups: boolean; dropDatabase: boolean; }) => {

      try {
        return dbs.tx!(async t => {
          const con = await t.connections.findOne({ id });
          if(con?.is_state_db) throw "Cannot delete a prostgles state database connection";
          if(opts?.dropDatabase){
            if(!con?.db_name) throw "Unexpected: Database name missing";
            const cdb = await getCDB(con.id, undefined, true);
            const anotherDatabaseNames: { datname: string }[] = await cdb.any(`
              SELECT * FROM pg_catalog.pg_database 
              WHERE datname <> current_database() 
              AND NOT datistemplate
              ORDER BY datname = 'postgres' DESC
            `);
            cdb.$pool.end();
            const [anotherDatabaseName] = anotherDatabaseNames;
            if(!anotherDatabaseName) throw "Could not find another database";

            const acdb = await getCDB(con.id, { database: anotherDatabaseName.datname }, true);
            const killDbConnections = () => {
              return acdb.manyOrNone(`
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = \${db_name};
              `, con).catch(e => 1)
            }
            await killDbConnections();
            await killDbConnections();
            await acdb.any(`
              DROP DATABASE ${asName(con.db_name)};
            `, con);
            await connMgr.disconnect(con.id);
          }
          const conFilter = { connection_id: id };
          await t.workspaces.delete(conFilter);
          await t.access_control.delete({ 
            $existsJoined: {  
              path: ["database_configs", "connections"],
              filter: { id }
            } 
          });

          if(opts?.keepBackups){
            await t.backups.update(conFilter, { connection_id: null });
          } else {
            const bkps = await t.backups.find(conFilter);
            for await(const b of bkps){
              await bkpManager.bkpDelete(b.id, true);
            }
            await t.backups.delete(conFilter);
          }
          
          const result = await t.connections.delete({ id }, { returning: "*" });

          /** delete orphaned database_configs */
          await t.database_configs.delete({ $notExistsJoined: { connections: {} } });
          return result;
        });

      } catch(err){
        return Promise.reject(err);
      }
    },
    disconnect: async (conId: string) => {
      return connMgr.disconnect(conId);
    },
    pgDump: bkpManager.pgDump,
    pgRestore: async (arg1: { bkpId: string; connId?: string }, opts?: any) => bkpManager.pgRestore(arg1, undefined, opts),
    bkpDelete: bkpManager.bkpDelete,
    
    streamBackupFile: async (c: "start" | "chunk" | "end", id: null | string, conId: string | null, chunk: any | undefined, sizeBytes: number | undefined, restore_options: Backups["restore_options"]) => {

      if(c === "start" && id && conId && sizeBytes){
        const s = bkpManager.getTempFileStream(id, user.id);
        await bkpManager.pgRestoreStream(id, conId, s.stream, sizeBytes, restore_options);
        
        return s.streamId;

      } else if(c === "chunk" && id && chunk){
        return new Promise((resolve, reject) => { 
          bkpManager.pushToStream(id, chunk, (err) => {
            if(err){
              reject(err)
            } else {
              resolve(1);
            }
          })
        });

      } else if(c === "end" && id){
        bkpManager.closeStream(id)

      } else  throw new Error("Not expected");
    },
    setTableConfig: async (connId: string, tableConfig: DatabaseConfigs["table_config"] | undefined = undefined) => {
      const { c, db, dbConf } = await getConnectionAndDbConf(connId);
      await dbs.tx!(async t => {
        await connMgr.getConnection(connId)?.prgl?.update ?.({ tableConfig: (tableConfig || undefined) as any });
        await t.database_configs.update({ id: dbConf.id }, { table_config: tableConfig });
      })
    },
    setFileStorage: async (connId: string, tableConfig?: ConnectionTableConfig, opts?: { keepS3Data?: boolean; keepFileTable?: boolean }) => {
      const { c, db, dbConf } = await getConnectionAndDbConf(connId);

      let newTableConfig: ConnectionTableConfig | null = tableConfig? {
        ...tableConfig
      } : null;

      /** Enable file storage */
      if(tableConfig){
        if(typeof tableConfig?.referencedTables !== "undefined") {
          checkIf(tableConfig, "referencedTables", "object");
        }
        if(tableConfig.referencedTables && Object.keys(tableConfig).length === 1){
          if(!dbConf.file_table_config) throw "Must enable file storage first"; 
          newTableConfig = { ...dbConf.file_table_config, ...tableConfig }
        } else {

          checkIf(tableConfig, "fileTable", "string")
          checkIf(tableConfig, "storageType", "object");
          const { storageType } = tableConfig;
          
          checkIf(storageType!, "type", "oneOf", ["local", "S3"])
          if(storageType?.type === "S3"){
            if(!(await dbs.credentials.findOne({ id: storageType.credential_id }))){
              throw "Invalid credential_id provided";
            }
          }
          const KEYS = ["fileTable", "storageType"] as const;
          if(dbConf.file_table_config && JSON.stringify(pickKeys(dbConf.file_table_config, KEYS as any)) !== JSON.stringify(pickKeys(tableConfig, KEYS as any))){
            throw "Cannot update " + KEYS.join("or");
          }
           
          newTableConfig = tableConfig;
        }

      /** Disable current file storage */
      } else {
        const fileTable = dbConf.file_table_config?.fileTable;
        if(!fileTable) throw "Unexpected: fileTable already disabled";
        await (db[DB_TRANSACTION_KEY] as DBHandlerServer["tx"])!(async dbTX => {

          const fileTableHandler = dbTX[fileTable];
          if(!fileTableHandler) throw "Unexpected: fileTable table handler missing";
          if(dbConf.file_table_config?.fileTable && (dbConf.file_table_config.storageType.type === "local" || dbConf.file_table_config.storageType.type === "S3" && !opts?.keepS3Data)){
            if(!fileTable || !fileTableHandler.delete) {
              throw "Unexpected error. fileTable handler not found";
            }
            
            await fileTableHandler?.delete!({});
          }
          if(!opts?.keepFileTable){
            await dbTX.sql!("DROP TABLE ${fileTable:name} CASCADE", { fileTable })
          }
        });
        newTableConfig = null;
      }
      const con = await dbs.connections.findOne({ id: connId });
      if(!con) throw "Connection not found";
      await dbs.tx?.(async t => {
        await connMgr.setFileTable(con, newTableConfig);
        await t.database_configs.update({ id: dbConf.id }, { file_table_config: newTableConfig });
      }).catch(err => {
        console.log({err});
        return Promise.reject(err)
      });
    },
    deleteAccessRule: (id: string) => {
      return dbs.access_control.delete({ id })
    },
    upsertAccessRule: (ac: DBSSchema["access_control"]) => {
      if(!ac) return dbs.access_control.insert(ac);
      return dbs.access_control.update({ id: ac.id }, ac);
    },
    getStatus: (connId: string) => getStatus(connId, dbs),
    runConnectionQuery: async (connId: string, query: string, args?: AnyObject | any[]): Promise<AnyObject[]> => {
      const cdb = await getCDB(connId);
      return cdb.any(query, args);
    },
    getSampleSchemas: async (): Promise<{ name: string; file: string; type: "sql" | "ts" }[]> => {
      const path = getRootDir() + `/sample_schemas`;
      const files = fs.readdirSync(path);
      return files.map(name => {
        const extension = name.split(".").at(-1)?.toLowerCase() ?? "unknown";
        if(["sql", "ts"].includes(extension)){
          return {
            name,
            type: extension as "ts" | "sql",
            file: fs.readFileSync(`${path}/${name}`, { encoding: "utf-8" }),
          }
        }
      }).filter(isDefined);
    }, 
    getCompiledTS: async (ts: string) => {
      return getCompiledTS(ts);
    },
    killPID,
  }

  const userMethods = !user.id? {} : {
    generateToken: async (days: number) => {
      if(!Number.isInteger(days)) {
        throw "Expecting an integer days but got: " + days;
      }

      const session = await dbs.sessions.insert({ 
        expires: Date.now() + days * 24 * 3600 * 1000, 
        user_id: user.id, 
        user_type: user.type, 
        type: "api_token", 
        ip_address 
      }, { returning: "*" });
      
      return session.id;
    },
    create2FA: async () => {
      const userName = user.username;
      const service = 'Prostgles UI';
      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(userName, service, secret);
      
      const recoveryCode = crypto.randomBytes(26).toString("hex");
      const hashedRecoveryCode = await dbs.sql!("SELECT crypt(${recoveryCode}, ${uid}::text)", { uid: user.id, recoveryCode }, { returnType: "value" })
      await dbs.users.update({ id: user.id }, { "2fa": { secret, recoveryCode: hashedRecoveryCode, enabled: false } })
      return { 
        url: otpauth,
        secret,
        recoveryCode
      };
    },
    enable2FA: async (token: string) => {
      const latestUser = await dbs.users.findOne({ id: user.id })
      const secret = latestUser?.["2fa"]?.secret;
      if(!secret) throw "Secret not found";
      
      //totp.verify({ secret, token }) -> Does not work.
      const isValid = authenticator.check(token, secret); 
      
      if(!isValid) throw "Invalid code";
      await dbs.users.update({ id: user.id }, { "2fa": { ...latestUser["2fa"]!, enabled: true } });
      return "ok"
    },
    disable2FA: () => {
      return dbs.users.update({ id: user.id }, { "2fa": null });
    },
    getAPITSDefinitions: () => {

      /** Must install them into the server folder! */
      const clientNodeModules = path.resolve(__dirname + "/../../../../client/node_modules/");
      const prostglesTypes = path.resolve(clientNodeModules + "/prostgles-types/dist");
      const prostglesClient = path.resolve(clientNodeModules + "/prostgles-client/dist");

      return [
        ...getTSFiles(prostglesClient).map(l => ({ ...l, name: "prostgles-client" })),
        ...getTSFiles(prostglesTypes).map(l => ({ ...l, name: "prostgles-types" })),
      ];
    }
  }
  
  return {
    ...userMethods,
    ...(user.type === "admin"? adminMethods : undefined),
    startConnection: async (con_id: string) => {
      try {
        const socketPath = await connMgr.startConnection(con_id, dbs, _dbs, socket);
        return socketPath;
      } catch (error){
        console.error("Could not start connection " + con_id, error);
        // Used to prevent data leak to client
        if(user.type === "admin"){
          throw error;
        } else {
          throw `Something went wrong when connecting to ${con_id}`;
        }
      }
    }
  }
}


function getTSFiles(dirPath: string){
  return fs.readdirSync(dirPath).map(path => {
    if(path.endsWith(".d.ts")){
      const content = fs.readFileSync(dirPath + "/" + path, { encoding: "utf8" });
      console.log(path, content);
      return { path, content };
    }
  }).filter(isDefined)
}


process.on("exit", code => {
  console.log(code)
});

export const is = {
  string: (v: any, notEmtpy = true): v is string => typeof v === "string" && (notEmtpy? !!v.length : true),
  integer: (v: any): v is number => Number.isInteger(v),
  number: (v: any): v is number => Number.isFinite(v),
  object: (v: any): v is Record<string, any> => isObject(v),
  oneOf: <T>(v: any, vals: T[]): v is T => vals.includes(v),
} as const;

export const checkIf = <Obj, isType extends keyof typeof is>(obj: Obj, key: keyof Obj, isType: isType, arg1?: Parameters<typeof is[isType]>[1]): true => {
  const isOk = is[isType](obj[key], arg1 as any);
  if(!isOk) throw `${key} is not of type ${isType}${isType === "oneOf"? `(${arg1})` : ""}. Source object: ${JSON.stringify(obj, null, 2)}`;
  return true;
}

