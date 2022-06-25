import prostgles from "prostgles-client";
import io from "socket.io-client";

import isomorphic from "../isomorphic_queries";
import client_only from "../client_only_queries";
export { DBHandlerClient, Auth } from "prostgles-client/dist/prostgles";

const start = Date.now();
const log = (msg: string, extra?: any) => {
  console.log(...[`(client) t+ ${(Date.now() - start)}ms ` + msg, extra].filter(v => v));
}
log("Started client...");

const url = process.env.PRGL_CLIENT_URL || "http://127.0.0.1:3001",
  path = process.env.PRGL_CLIENT_PATH || "/teztz/s",
  socket = io(url, { path, query: { token: "haha" }  }), //  
  stopTest = (err?) => {
    if(err) log("Stopping client due to error: " + JSON.stringify(err));

    setTimeout(() => {
      socket.emit("stop-test", !err? err : { err: err.toString(), error: err }, cb => {
  
        log("Stopping client...");
        if(err) console.trace(err);
    
  
      });
      setTimeout(() => {
        process.exit(err? 1 : 0)
      }, 1000);
    }, 1000);
    
  };
  
try {
  /* TODO find out why connection does not happen on rare occasions*/
  socket.on("connected", () => {
    log("Client connected.")
  });
  socket.on("connect", () => {
    log("Client connect.")
  });
  socket.on("connect_failed", (err) => {
    log("connect_failed", err)
  })
  socket.on("start-test", (data) => {
    log("start-test", data)
    prostgles({
      socket, // or simply io()
      onReconnect: (socket) => {
        log("Reconnected")          
      },
      onReady: async (db, methods, tableSchema, auth) => {
        log("onReady.auth", auth)
        try {
          log("Starting Client isomorphic tests")
          // try {
            await isomorphic(db);
          // } catch(e){
          //   throw { isoErr: e }
          // }
          log("Client isomorphic tests successful")
  
          // try {
            await client_only(db, auth, log, methods, tableSchema);
          // } catch(e){
          //   throw { ClientErr: e }
          // }
          log("Client-only replication tests successful")
  
  
          stopTest();

        } catch (err){
          console.trace(err)
          stopTest(err);
          // throw err;
        }
      }
    }); 
  
  })

} catch(e) {
  console.trace(e)
  stopTest(e);
  throw e;
}
 