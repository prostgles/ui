
import { Publish, PublishParams } from "prostgles-server/dist/PublishParser/PublishParser"; 
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { getKeys } from "prostgles-types"; 
import { connectionChecker } from "."; 
import { getACRules } from "./ConnectionManager/ConnectionManager";
import { isDefined } from "../../commonTypes/filterUtils";
import { ValidateUpdateRow } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";

export const publish = async (params: PublishParams<DBSchemaGenerated>, con: Omit<DBSchemaGenerated["connections"]["columns"], "user_id">): Promise<Publish<DBSchemaGenerated>> => {
        
  const { dbo: db, user, db: _db, socket } = params;

  if(!user || !user.id){
    return null;  
  }
  const isAdmin = user.type === "admin"

  const { id: user_id, } = user;

  /** Admin users are always allowed everything */
  const acs = isAdmin? undefined : await getACRules(db, user as any);
  
  const createEditDashboards = isAdmin || acs?.some(({ dbsPermissions }) => dbsPermissions?.createWorkspaces);

  const publishedWspIDs = acs?.flatMap(ac => ac.dbsPermissions?.viewPublishedWorkspaces?.workspaceIds).filter(isDefined) || []; 

  const dashboardConfig: Publish<DBSchemaGenerated> = (["windows", "links", "workspaces"] as const)
    .reduce((a, v) => ({
      ...a, 
      [v]: {
        select: {
          fields: "*",
          forcedFilter: { 
            $or: [
              { user_id  }, 
              /** User either owns the item or the item has been shared/published to the user */
              { [v === "workspaces"? "id" : "workspace_id"]: { $in: publishedWspIDs } }
            ] 
          }
        },
        sync: {
          id_fields: ["id"],
          synced_field: "last_updated",
          allow_delete: true
        },
        ...(createEditDashboards && {
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
        })
    },
  }) ,{});

  type User = DBSchemaGenerated["users"]["columns"];
  const getValidateAndHashUserPassword = (mustUpdate = false) => {
    const validateFunc: ValidateUpdateRow<User, DBSchemaGenerated> = async ({ dbx, filter, update }) => {
      if("password" in update){
        //@ts-ignore
        const [user, ...otherUsers] = await dbx.users.find(filter);
        if(!user || otherUsers.length){
          throw "Cannot update: update filter must match exactly one user";
        }
        const { password } = (await dbx.sql!("SELECT crypt(${password}, ${id}::text) as password", { ...update, id: user.id }, { returnType: "row" }))!
        if(typeof password !== "string") throw "Not ok";
        if(mustUpdate){
          await dbx.users.update(filter, { password })
        }
        return {
          ...update,
          password
        } 
      }
      update.last_updated ??= Date.now();
      return update  
    }
    return validateFunc;
  }

  const userTypeFilter = { "access_control_user_types": { user_type: user.type } }
  
  let dashboardTables: Publish<DBSchemaGenerated> = {

    /* DASHBOARD */
    ...(dashboardConfig as object),
    access_control_user_types: isAdmin && "*",
    credentials: isAdmin && {
      select: {
        fields: { key_secret: 0 }
      },
      delete: "*",
      insert: { 
        fields: { id: 0 }, 
        forcedData: { user_id: user.id } 
      },
      update: "*",
    },
    credential_types: isAdmin && { select: "*" },
    access_control: isAdmin? "*" : { select: { fields: "*", forcedFilter: { $existsJoined: userTypeFilter } } },
    database_configs: isAdmin? "*" : {
      select: { fields: { id: 1 } }
    },
    connections: {
      select: {
        fields: isAdmin? "*" : { id: 1, name: 1, created: 1 },
        orderByFields: { db_conn: 1, created: 1 },
        forcedFilter: isAdmin? 
          {} : 
          { $existsJoined: { "database_configs.access_control.access_control_user_types": userTypeFilter["access_control_user_types"] } as any }
      },
      update: user.type === "admin" && {
        fields: {
          name: 1,
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
      select: { fields: { "2fa": 0, password: 0 } },
      insert: {
        fields: { is_online: 0, created: 0, "2fa": 0, last_updated: 0 },
        // validate: async (row, _dbo) => validate({ update: row, filter: row }, _dbo),
        postValidate: async ({ row, dbx, localParams }) => { await getValidateAndHashUserPassword(true)({ localParams, update: row, dbx, filter: { id: row.id }}) },
      },
      update: {
        fields: { is_online: 0 },
        validate: getValidateAndHashUserPassword(),
        dynamicFields: [{
          /* For own user can only change these fields */
          fields: { username: 1, password: 1, status: 1, options: 1, passwordless_admin: 1 },
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
          password: false
        },
        forcedFilter: { id: user_id }
      },
      update: {
        fields: { password: 1, options: 1 },
        forcedFilter: { id: user_id },
        validate: getValidateAndHashUserPassword(),
      }
    },
    sessions: {
      delete: isAdmin? "*" : {
        filterFields: "*",
        forcedFilter: { user_id }
      },
      select: {
        fields: { id: 0 },
        forcedFilter: isAdmin? undefined : { user_id }
      },
      update: isAdmin? "*" : {
        fields: { active: 1 },
        forcedFilter: { user_id, active: true },
      }
    },
    backups: {
      select: true,
      update: isAdmin && {
        fields: ["restore_status"]
      }
    },
    magic_links: isAdmin && {
      insert: {
        fields: { magic_link: 0 }
      },
      select: true,
      update: true,
      delete: true,
    },

    login_attempts: {
      select: "*"
    },

    global_settings: isAdmin && {
      select: "*",
      update: {
        fields: {
          allowed_origin: 1,
          allowed_ips: 1,
          trust_proxy: 1,
          allowed_ips_enabled: 1,
          session_max_age_days: 1,
        },
        postValidate: async ({ row, dbx: dbsTX }) => {
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
          return undefined;
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