
import { Publish, PublishParams } from "prostgles-server/dist/PublishParser";
import { omitKeys } from "prostgles-server/dist/PubSubManager";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { getKeys } from "prostgles-types";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { upsertConnection } from ".";
type DBS_PermissionRules = {
  userTypesThatCanManageUsers?: string[];
  userTypesThatCanManageConnections?: string[];
}

export const publish = async (params: PublishParams<DBSchemaGenerated>, con: Omit<DBSchemaGenerated["connections"]["columns"], "user_id">): Promise<Publish<DBSchemaGenerated>> => {
        
  const { dbo: db, user, db: _db } = params;

  if(!user || !user.id){
    return null;
  }
  const isAdmin = user.type === "admin"

  /** If user is NOT ADMIN then get the access rules */

  const { id: user_id } = user;
  // _db.any("ALTER TABLE workspaces ADD COLUMN options         JSON DEFAULT '{}'::json")

  /** Add state db */
  if(!(await db.connections.count())){ // , name: "Prostgles state database" // { user_id }
    const state_db = await upsertConnection({  
      ...con, 
      user_id, 
      name: "Prostgles state database", 
      type: !con.db_conn? 'Standard' : 'Connection URI',
      db_port: con.db_port || 5432,
      db_ssl: con.db_ssl || "disable",
      is_state_db: true,      
    } as any, user as any, db);

    try {
      const SAMPLE_DB_LABEL = "Sample database";
      const SAMPLE_DB_NAME = "sample_database";
      const databases: string[] = await _db.any(`SELECT datname FROM pg_database WHERE datistemplate = false;`)
      if(! (await db.connections.findOne({ name: SAMPLE_DB_LABEL, db_name: SAMPLE_DB_NAME })) ){
        if(!state_db) throw "state_db not found";

        if(!databases.includes(SAMPLE_DB_NAME)) {
          await _db.any("CREATE DATABASE " + SAMPLE_DB_NAME);
        }
        await upsertConnection({ 
          ...omitKeys(state_db, ["id"]),
          is_state_db: false,
          name: SAMPLE_DB_LABEL,
          db_name: SAMPLE_DB_NAME,
        }, user as any, db)
      }
    } catch(err: any){
      console.error("Failed to create sample database: ", err)
    }
  }

  const dashboardConfig: Publish<DBSchemaGenerated> = ["windows", "links", "workspaces"]
    .reduce((a: any, v: string) => ({ 
      ...a, 
      [v]: {
        select: {
          fields: "*",
          forcedFilter: { user_id  }
        },
        sync: {
          id_fields: ["id"],
          synced_field: "last_updated",
          allow_delete: true
        },

        update: {
          fields: { user_id: 0 },
          forcedData: { user_id },
          forcedFilter: { user_id },
        }, 
        insert: {
          fields: "*",
          forcedData: { user_id }
        },
        delete: {
          filterFields: "*",
          forcedFilter: { user_id }
        }
    },
  }) ,{});
  type User = DBSchemaGenerated["users"]["columns"]
  const validate = async ({ filter, update }: { filter: User; update: User }, _dbo: DBOFullyTyped<DBSchemaGenerated>, mustUpdate = false): Promise<User> => {
    if("password" in update){
      const users = await _dbo.users.find(filter);
      if(users.length !== 1){
        throw "Cannot update: update filter must match exactly one user";
      }
      const { password } = (await _dbo.sql!("SELECT crypt(${password}, ${id}::text) as password", { ...update, id: users[0].id }, { returnType: "row" }))!
      if(typeof password !== "string") throw "Not ok";
      if(mustUpdate){
        await _dbo.users.update(filter, { password })
      }
      return {
        ...update,
        password
      }
    }
    return update;
  }

  const userTypeFilter = { "access_control_user_types": { user_type: user.type } }
  
  let res: Publish<DBSchemaGenerated> = {

    /* DASHBOARD */
    ...(dashboardConfig as object),
    access_control_user_types: isAdmin && "*",
    credentials: isAdmin? {
      select: {
        fields: { key_secret: 0 }
      },
      delete: "*",
      insert: { fields: { id: 0 }, forcedData: { user_id: user.id } },
      update: "*",
    } : undefined,
    access_control: isAdmin? "*" : { select: { fields: "*", forcedFilter: { $existsJoined: userTypeFilter } } },
    credential_types: isAdmin && { select: "*" },
    connections: {
      select: {
        fields: isAdmin? "*" : { id: 1, name: 1, created: 1 },
        orderByFields: { db_conn: 1, created: 1 },
        forcedFilter: isAdmin? 
          {} : 
          { $existsJoined: { "access_control.access_control_user_types": userTypeFilter["access_control_user_types"] } as any }
      },
      update: user.type === "admin" && {
        fields: {
          name: 1, table_config: 1, backups_config: 1
        }
      }
    },
    user_types: isAdmin && {
      insert: "*",
      select: {
        fields: "*",
      },
      delete: {
        filterFields: "*",
        validate: (async filter => {
          const adminVal = await db.user_types.findOne({ $and: [filter ?? {}, { id: "admin" }] });
          if(adminVal) throw "Cannot delete the admin value";
        })
      }
    },
    users: isAdmin? {
      select: "*",
      insert: {
        fields: "*",
        // validate: async (row, _dbo) => validate({ update: row, filter: row }, _dbo),
        postValidate: async(row, _dbo) => validate({ update: row, filter: { id: row.id } as any }, _dbo, true) as any,
      },
      update: {
        fields: "*",
        validate: validate as any,
        dynamicFields: [{
          /* For own user can only change these fields */
          fields: { username: 1, password: 1, status: 1, options: 1 },
          filter: { id: user.id }
        }]
      },
      delete: {
        filterFields: "*",
        forcedFilter: { "id.<>": user.id  } // Cannot delete your admin user
      }
    } : {
      select: {
        fields: {
          "2fa": false,
          // password: false
        },
        forcedFilter: { id: user_id }
      },
      update: {
        fields: { password: 1 },
        forcedFilter: { id: user_id },
        validate: validate as any,
      }
    },

    backups: {
      select: true,
    },
    magic_links: isAdmin && {
      insert: {
        fields: { magic_link: 0 }
      },
      select: true,
      update: true,
      delete: true,
    }
  }

  const curTables = Object.keys(res || {});
  // @ts-ignore
  const remainingTables = getKeys(db).filter(k => db[k]?.find).filter(t => !curTables.includes(t));
  const adminExtra = remainingTables.reduce((a, v) => ({ ...a, [v]: "*" }), {});
  res = {
    ...(res as object),
    ...(isAdmin? adminExtra : {})
  }
  
  return res;
}