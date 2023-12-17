import { omitKeys, pickKeys } from "prostgles-server/dist/PubSubManager/PubSubManager";
import { DBS, Users } from ".";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { testDBConnection } from "./connectionUtils/testDBConnection";
import { validateConnection } from "./connectionUtils/validateConnection";


export const upsertConnection = async (con: DBSchemaGenerated["connections"]["columns"], user_id: Users["id"] | null, dbs: DBS) => {
  
  const c = validateConnection({ 
    ...con, 
    user_id,
    last_updated: Date.now()
  });
  const { canCreateDb } = await testDBConnection(con);
  try {
    let connection;
    if(con.id){
      if(!(await dbs.connections.findOne({ id: con.id }))){
        throw "Connection not found: " + con.id
      }
      connection = await dbs.connections.update({ id: con.id }, omitKeys(c, ["id"]) , { returning: "*", multi: false });
    } else {
      await dbs.database_configs.insert(pickKeys({ ...c }, ["db_host", "db_name", "db_port"]) as any, { fixIssues: true, returning: "*", onConflictDoNothing: true });
      connection = await dbs.connections.insert({ ...c, info: { canCreateDb } }, { returning: "*" });
    }

    if(!connection){
      throw "Could not create connection"
    }
    const database_config = await dbs.database_configs.findOne({ $existsJoined: { connections: { id: connection?.id } } });
    if(!database_config){
      throw "Could not create database_config"
    }
    return { connection, database_config };
  } catch(e: any){
    console.error(e);
    if(e && e.code === "23502"){
      throw { err_msg: ` ${e.column} cannot be empty` }
    }
    throw e;
  }
}