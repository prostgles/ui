
import { HAS_EMPTY_USERNAME, EMPTY_USERNAME, connMgr, testDBConnection, BareConnectionDetails, validateConnection, upsertConnection } from "./index";
import { PublishMethods } from "prostgles-server/dist/PublishParser";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import fs from "fs";
import path from 'path';
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import * as crypto from "crypto";

import { authenticator } from '@otplib/preset-default';

export type Users = Required<DBSchemaGenerated["users"]["columns"]>; 
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
type DBS = DBOFullyTyped<DBSchemaGenerated>;

import BackupManager, { Backups } from "./BackupManager";
import { ConnectionString } from "connection-string";
import { isSuperUser } from "prostgles-server/dist/Prostgles";
import { ConnectionTableConfig, DB_TRANSACTION_KEY } from "./ConnectionManager";
import { DBHandlerServer, isPojoObject } from "prostgles-server/dist/DboBuilder";
import { deepStrictEqual } from "assert";
import { pickKeys } from "prostgles-server/dist/PubSubManager";
export let bkpManager: BackupManager;

export const publishMethods:  PublishMethods<DBSchemaGenerated> = async (params) => { //  socket, dbs: DBObj, _dbs, user: Users
  const { user, dbo: dbs, socket, db: _dbs } = params;

  bkpManager ??= new BackupManager(dbs);

  if(!user || !user.id) {

    const makeMagicLink = async (user: Users, dbo: DBS, returnURL: string) => {
      const mlink = await dbo.magic_links.insert({ 
        expires: Number.MAX_SAFE_INTEGER, // Date.now() + 24 * 3600 * 1000, 
        user_id: user.id,
    
      }, {returning: "*"});
              
      return {
        id: user.id,
        magic_login_link_redirect: `/magic-link/${mlink.id}?returnURL=${returnURL}`
      };
    }
    /** If no user exists then make */
    if(await HAS_EMPTY_USERNAME(dbs)){
      const u = await dbs.users.findOne({ username: EMPTY_USERNAME });
      if(!u) throw "User found for magic link"
      const mlink = await makeMagicLink(u, dbs, "/")
      socket.emit("redirect", mlink.magic_login_link_redirect);
    }

    return {};
  }

  const reStartConnection = async (conId: string) => {
    return connMgr.startConnection(conId, socket, dbs, _dbs, true);
  };

  const adminMethods = {
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
      const dirSize = async (directory: string) => {
        if(!fs.existsSync(directory)) return 0;
        const files = fs.readdirSync( directory );
        const stats = files.map( file => fs.statSync( path.join( directory, file ) ) );
      
        return stats.reduce( ( accumulator, { size } ) => accumulator + size, 0 );
      }
      
      if(conId && (typeof conId !== "string" || !connMgr.getConnection(conId))){
        throw "Invalid/Inexisting connection id provided"
      }
      const dir = connMgr.getFileFolderPath(conId);
      return dirSize(dir);
    },
    testDBConnection,
    validateConnection: async (c: Connections) => {
      const connection = validateConnection(c);
      let warn = "";
      if(connection.db_ssl){
        warn = ""
      }
      return { connection, warn }
    },
    createConnection: async (con: Connections) => {
      return upsertConnection(con, user as any, dbs);
    },
    deleteConnection: async (id: string, opts?: { keepBackups: boolean }) => {

      try {
        return dbs.tx!(async t => {
          const con = await t.connections.findOne({ id });
          if(con?.is_state_db) throw "Cannot delete a prostgles state database connection"
          const conFilter = { connection_id: id }
          await t.workspaces.delete(conFilter);
          await t.access_control.delete(conFilter);

          if(opts?.keepBackups){
            await t.backups.update(conFilter, { connection_id: null });
          } else {
            const bkps = await t.backups.find(conFilter);
            for await(const b of bkps){
              await bkpManager.bkpDelete(b.id);
            }
            await t.backups.delete(conFilter);
          }

          const result = await t.connections.delete({ id, user_id: user.id }, { returning: "*" });
          return result;
        });

      } catch(err){
        return Promise.reject(err);
      }
    },
    reStartConnection,
    disconnect: async (conId: string) => {
      return connMgr.disconnect(conId);
    },
    pgDump: bkpManager.pgDump,
    pgRestore: async (arg1: { bkpId: string; connId?: string }, opts?: any) => bkpManager.pgRestore(arg1, undefined, opts),
    bkpDelete: bkpManager.bkpDelete,
    
    streamBackupFile: async (c: "start" | "chunk" | "end", id: null | string, conId: string | null, chunk: any | undefined, sizeBytes: number | undefined, restore_options: Backups["restore_options"]) => {
      // socket.on("stream", console.log)
      // console.log(arguments);

      if(c === "start" && id && conId && sizeBytes){
        const s = bkpManager.getTempFileStream(id, user.id);
        await bkpManager.pgRestoreStream(id, conId, s.stream, sizeBytes, restore_options);
        // s.stream.on("close", () => console.log(1232132));
        
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

    setFileStorage: async (connId: string, tableConfig?: ConnectionTableConfig, opts?: { keepS3Data?: boolean; keepFileTable?: boolean }) => {
      checkIf({ connId }, "connId", "string")
      const c = await dbs.connections.findOne({ id: connId });
      if(!c) throw "Connection not found";
      const db = connMgr.getConnectionDb(connId);
      if(!db) throw "db missing";

      /** Enable file storage */
      if(tableConfig){
        checkIf(tableConfig, "referencedTables", "object");
        if(tableConfig.referencedTables && Object.keys(tableConfig).length === 1){
          if(!c.table_config) throw "Must enable file storage first";
          await dbs.connections.update({ id: connId }, { table_config: { ...c.table_config, ...tableConfig } });
          
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
          if(c.table_config && JSON.stringify(pickKeys(c.table_config, KEYS as any)) !== JSON.stringify(pickKeys(tableConfig, KEYS as any))){
            throw "Cannot update " + KEYS.join("or");
          }
          
          await dbs.connections.update({ id: connId }, { table_config: tableConfig });
        }

      /** Disable current file storage */
      } else {
        const fileTable = c.table_config?.fileTable;
        if(!fileTable) throw "Unexpected: fileTable already disabled";
        await (db[DB_TRANSACTION_KEY] as DBHandlerServer["tx"])!(async dbTX => {

          const fileTableHandler = dbTX[fileTable];
          if(!fileTableHandler) throw "Unexpected: fileTable table handler missing";
          if(c.table_config?.fileTable && (c.table_config.storageType.type === "local" || c.table_config.storageType.type === "S3" && !opts?.keepS3Data)){
            if(!fileTable || !fileTableHandler.delete) {
              throw "Unexpected error. fileTable handler not found";
            }
            
            await fileTableHandler?.delete!({});
          }
          if(!opts?.keepFileTable){
            await dbTX.sql!("DROP TABLE ${fileTable:name} CASCADE", { fileTable })
          }
        })
        await dbs.connections.update({ id: connId }, { table_config: null });
      }
      await reStartConnection?.(connId);
    }
  }

  const userMethods = !user.id? {} : {
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
    }
  }
  
  return {
    ...userMethods,
    ...(user.type === "admin"? adminMethods : undefined),
    startConnection: async (con_id: string) => {
      return connMgr.startConnection(con_id, socket, dbs, _dbs);
    }
  }
}
process.on("exit", code => {
  console.log(code)
});

export const is = {
  string: (v: any, notEmtpy = true): v is string => typeof v === "string" && (notEmtpy? !!v.length : true),
  integer: (v: any): v is number => Number.isInteger(v),
  number: (v: any): v is number => Number.isFinite(v),
  object: (v: any): v is Record<string, any> => isPojoObject(v),
  oneOf: <T>(v: any, vals: T[]): v is T => vals.includes(v),
} as const;

export const checkIf = <Obj, isType extends keyof typeof is>(obj: Obj, key: keyof Obj, isType: isType, arg1?: Parameters<typeof is[isType]>[1]): true => {
  const isOk = is[isType](obj[key], arg1 as any);
  if(!isOk) throw `${key} is not of type ${isType}${isType === "oneOf"? `(${arg1})` : ""}. Source object: ${JSON.stringify(obj, null, 2)}`;
  return true;
}