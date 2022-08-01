
import { Publish, PublishParams } from "prostgles-server/dist/PublishParser";
import { omitKeys } from "prostgles-server/dist/PubSubManager";
import { DBSchemaGenerated } from "./DBoGenerated";
import { AnyObject, getKeys } from "prostgles-types"
import { upsertConnection } from ".";
type DBS_PermissionRules = {
  userTypesThatCanManageUsers?: string[];
  userTypesThatCanManageConnections?: string[];
}

export const publish = async (params: PublishParams<DBSchemaGenerated>, con: Omit<DBSchemaGenerated["connections"]["columns"], "user_id">): Promise<Publish> => {
        
  const { dbo: db, user, db: _db } = params;

  if(!user || !user.id){
    return null;
  }

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
          name: SAMPLE_DB_NAME
        } as any, user as any, db)
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

  const validate = async ({ filter, update }: { filter: AnyObject; update: AnyObject }) => {
    if("password" in update){
      const users = await db.users.find(filter);
      if(users.length !== 1){
        throw "Cannot update: update filter must match exactly one user";
      }
      const { password } = await _db.one("SELECT crypt(${password}, ${id}::text) as password", { ...update, id: users[0].id })
      return {
        ...update,
        password
      }
    }
    return update;
  }

  let res: Publish<DBSchemaGenerated> = {

    /* DASHBOARD */
    ...(dashboardConfig as object),
    access_control_user_types: user?.type === "admin"? "*" : {
      select: true
    },
    credentials: user?.type === "admin"? {
      select: {
        fields: { key_secret: 0 }
      },
      delete: "*",
      insert: { fields: { id: 0 }, forcedData: { user_id: user.id } },
      update: "*",
    } : undefined,
    credential_types: user?.type === "admin"? { select: "*" } : undefined,
    connections: {
      select: {
        fields: "*",
        forcedFilter: user?.type === "admin"? 
          {} : 
          { $existsJoined: { "access_control.access_control_user_types": { user_type: user.type } } as any }
      },
      update: user.type !== "admin"? undefined : {
        fields: {
          name: 1, table_config: 1, backups_config: 1
        }
      }
    },
    user_types: user?.type === "admin"? {
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
    } : false,
    users: user?.type === "admin"? {
      select: "*",
      insert: {
        fields: "*",
        // validate: (row) => validate({ update: row, filter: row })
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
        fields: "*",
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
    }
  }

  const curTables = Object.keys(res);
  // @ts-ignore
  const remainingTables = getKeys(db).filter(k => db[k]?.find).filter(t => !curTables.includes(t));
  const adminExtra = remainingTables.reduce((a, v) => ({ ...a, [v]: "*" }), {});
  res = {
    ...(res as object),
    ...(user.type === "admin"? adminExtra : {}),
  }
  return res;
}