import type { DB } from "prostgles-server/dist/Prostgles";
import { omitKeys } from "prostgles-server/dist/PubSubManager/PubSubManager";
import type { DBS } from ".";
import { validateConnection } from "./connectionUtils/validateConnection";
import type { DBSConnectionInfo} from "./electronConfig";
import { isDemoMode } from "./electronConfig"; 
import { upsertConnection } from "./upsertConnection";
import { tryCatch } from "prostgles-types";

/** Add state db if missing */
export const insertStateDatabase = async (db: DBS, _db: DB, con: DBSConnectionInfo | Partial<DBSConnectionInfo>) => {

  const connectionCount = await db.connections.count();
  if(!connectionCount){
    
    const { state_db, error } = await tryCatch(async () => {
      const { connection: state_db } = await upsertConnection({
        ...con,
        user_id: null, 
        name: "Prostgles UI state database", 
        type: !con.db_conn? "Standard" : "Connection URI",
        db_port: con.db_port || 5432,
        db_ssl: con.db_ssl || "disable",
        is_state_db: true,      
      } as any, null, db);

      return { state_db };
    });

    if(error){
      console.error("Failed to insert state database", error);
      throw error;
    } else {
      console.log("Inserted state database ", state_db?.db_name);
    }

    try {
      const SAMPLE_DB_LABEL = "Sample database";
      const SAMPLE_DB_NAME = "sample_database";
      const sampleConnection = await db.connections.findOne({ name: SAMPLE_DB_LABEL, db_name: SAMPLE_DB_NAME });
      if(!sampleConnection){
        if(!state_db) throw "state_db not found";
        
        const databases: string[] = (await _db.any(`SELECT datname FROM pg_database WHERE datistemplate = false;`)).map(({ datname }) => datname)
        if(!databases.includes(SAMPLE_DB_NAME)) {
          await _db.any("CREATE DATABASE " + SAMPLE_DB_NAME);
        }
        const stateCon = { ...omitKeys(state_db, ["id"]) };
        const validatedSampleDBConnection = validateConnection({
          ...stateCon,
          type: "Standard",
          name: SAMPLE_DB_LABEL,
          db_name: SAMPLE_DB_NAME,
        })
        const { connection: con, database_config } = await upsertConnection({ 
          ...stateCon,
          ...validatedSampleDBConnection,
          is_state_db: false,
          name: SAMPLE_DB_LABEL,
        }, null, db);
        console.log("Inserted sample connection for db ", con.db_name);

        if(isDemoMode()){

          const demoModeUserRole = "default";
          const ac = await db.access_control.insert({ 
            database_id: database_config.id, 
            dbPermissions: { allowSQL: true, type: "Run SQL" }, 
            dbsPermissions: { createWorkspaces: true },
          }, { returning: "*" });

          await db.access_control_user_types.insert({
            access_control_id: ac.id, 
            user_type: demoModeUserRole 
          });
        }
      }
    } catch(err: any){
      console.error("Failed to create sample database: ", err)
    }
  }
}