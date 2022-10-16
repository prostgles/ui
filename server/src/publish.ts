
import { Publish, PublishParams } from "prostgles-server/dist/PublishParser";
import { omitKeys } from "prostgles-server/dist/PubSubManager";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { getKeys } from "prostgles-types";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { connectionChecker, upsertConnection } from ".";
import { getCIDRRangesQuery } from "../../commonTypes/publishUtils";
type DBS_PermissionRules = {
  userTypesThatCanManageUsers?: string[];
  userTypesThatCanManageConnections?: string[];
}

export const publish = async (params: PublishParams<DBSchemaGenerated>, con: Omit<DBSchemaGenerated["connections"]["columns"], "user_id">): Promise<Publish<DBSchemaGenerated>> => {
        
  const { dbo: db, user, db: _db, socket } = params;

  if(!user || !user.id){
    return null;
  }
  const isAdmin = user.type === "admin"

  /** If user is NOT ADMIN then get the access rules */

  const { id: user_id } = user;
  // _db.any("ALTER TABLE workspaces ADD COLUMN options         JSON DEFAULT '{}'::json")


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
  
  let dashboardTables: Publish<DBSchemaGenerated> = {

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
      insert: { fields: ["status", "options"] }
    },
    magic_links: isAdmin && {
      insert: {
        fields: { magic_link: 0 }
      },
      select: true,
      update: true,
      delete: true,
    },

    global_settings: isAdmin && {
      select: "*",
      update: {
        fields: {
          allowed_origin: 1,
          allowed_ips: 1,
          trust_proxy: 1,
          allowed_ips_enabled: 1,
        },
        postValidate: async (row, dbsTX) => {
          if(!row.allowed_ips?.length){
            throw "Must include at least one allowed IP CIDR"
          }
          // const ranges = await Promise.all(
          //   row.allowed_ips?.map(
          //     cidr => db.sql!(
          //       getCIDRRangesQuery({ cidr, returns: ["from", "to"] }), 
          //       { cidr }, 
          //       { returnType: "row" }
          //     )
          //   )
          // )
          const { isAllowed, ip } = await connectionChecker.checkClientIP({ socket, dbsTX });

          if(!isAllowed) throw `Cannot update to a rule that will block your current IP.  \n Must allow ${ip} within Allowed IPs`
          return row;
        }
      }
    }
  }

  const curTables = Object.keys(dashboardTables || {});
  // @ts-ignore
  const remainingTables = getKeys(db).filter(k => db[k]?.find).filter(t => !curTables.includes(t));
  const adminExtra = remainingTables.reduce((a, v) => ({ ...a, [v]: "*" }), {});
  dashboardTables = {
    ...(dashboardTables as object),
    ...(isAdmin? adminExtra : {})
  }
  
  return dashboardTables;
}