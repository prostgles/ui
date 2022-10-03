import { BACKUP_FOLDERNAME, getFileMgr } from "./BackupManager";
import { Auth, BasicSession } from 'prostgles-server/dist/AuthHandler';
import { MEDIA_ROUTE_PREFIX, PROSTGLES_STRICT_COOKIE, ROOT_DIR, log, Users, API_PATH } from "./index";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { omitKeys } from "prostgles-server/dist/PubSubManager";
import { DB } from "prostgles-server/dist/Prostgles";
import { authenticator } from "otplib";
import { Express } from "express"
import path from "path";
import { DBSSchema } from "../../commonTypes/publishUtils";


let authCookieOpts = (process.env.PROSTGLES_STRICT_COOKIE || PROSTGLES_STRICT_COOKIE)? {} : {
  secure: false,
  sameSite: "lax"    //  "none"
};

const getBasicSession = (s: DBSSchema["sessions"]): BasicSession => {
  return { ...s, sid: s.id, expires: +s.expires, onExpiration: s.type === "api_token"? "show_error" : "redirect" };
}

const makeSession = async (user: Users | undefined, dbo: DBOFullyTyped<DBSchemaGenerated> , expires: number = 0): Promise<BasicSession> => {

  if(user){
    const session = await dbo.sessions.insert({ 
      user_id: user.id, 
      user_type: user.type, 
      expires, 
    }, { returning: "*" }) as any;
    
    return getBasicSession(session); //60*60*60 }; 
  } else {
    throw "Invalid user";
  }
}

export const getAuth = (app: Express): Auth<DBSchemaGenerated> => {
  
  const auth: Auth<DBSchemaGenerated> = {
    sidKeyName: "sid_token",
    getUser: async (sid, db, _db: DB) => {
      log("getUser", sid);
      const s = await db.sessions.findOne({ id: sid });
      let user;
      if(s) {
        user = await db.users.findOne({ id: s.user_id });
        if(user){
          const state_db = await db.connections.findOne({ is_state_db: true });
          return {
            user,
            clientUser: { 
              sid: s.id, 
              uid: user.id, 
              state_db_id: state_db?.id,
              has_2fa: !!user["2fa"]?.enabled,
              ...omitKeys(user, ["password", "2fa"]) 
            }
          }
        }
      }
      // console.trace("getUser", { user, s })
      return undefined;
    },
    login: async ({ username = null, password = null, totp_token = null, totp_recovery_code = null } = {}, db, _db: DB) => {
      let u: Users | undefined;
      log("login", username)
      /**
       * If no login config provided then login automatically
       */
      // if(!PRGL_USERNAME){
      //   username = EMPTY_USERNAME; 
      //   password = EMPTY_PASSWORD;
      // }
      try {
        u = await _db.one("SELECT * FROM users WHERE username = ${username} AND password = crypt(${password}, id::text);", { username, password });
      } catch(e){
        throw "no match";
      }
      if(!u) {
        // console.log( await db.users.find())
        throw "something went wrong: " + JSON.stringify({ username, password });
      }
      if(u && u.status !== "active") throw "inactive";

      if(u["2fa"]?.enabled){
        if(totp_recovery_code && typeof totp_recovery_code === "string"){
          const areMatching = await _db.any("SELECT * FROM users WHERE id = ${id} AND \"2fa\"->>'recoveryCode' = crypt(${code}, id::text) ", { id: u.id, code: totp_recovery_code.trim() });
          if(!areMatching.length){
            throw "Invalid token"
          }
        } else if(totp_token && typeof totp_token === "string"){

          if(!authenticator.verify({ secret: u["2fa"].secret, token: totp_token })){
            throw "Invalid token"
          }
        } else {
          throw "Token missing";
        }
      }

      let s = await db.sessions.findOne({ user_id: u.id })
      if(!s || (+s.expires || 0) < Date.now()){
        // will expire after 24 hours,
        return makeSession(u, db, Date.now() + 1000 * 60 * 60 * 24)
      }
      
      return getBasicSession(s)
    },
    logout: async (sid, db, _db: DB) => {
      if(!sid) throw "err";
      const s = await db.sessions.findOne({ id: sid });
      if(!s) throw "err";
      await db.sessions.delete({ id: sid })
      return true; 
    },
    cacheSession: {
      getSession: async (sid, db) => {
        let s = await db.sessions.findOne({ id: sid });
        if(s) return getBasicSession(s)
        // throw "dwada"
        return undefined as any;
      }
    },
    expressConfig:  {
      app,
      // userRoutes: ["/", "/connection", "/connections", "/profile", "/jobs", "/chats", "/chat", "/account", "/dashboard", "/registrations"],
      publicRoutes: ["/manifest.json", "/favicon.ico", API_PATH], // ["/"],
      onGetRequestOK: async (req, res, { getUser, db, dbo: dbs }) => {
        console.log("onGetRequestOK", req.path);

        const BKP_PREFFIX = "/"+BACKUP_FOLDERNAME;
        if(req.path.startsWith(BKP_PREFFIX)){
          const userData = await getUser();
          if(userData?.user?.type !== "admin"){
            res.sendStatus(401);
          } else {
            const bkpId = req.path.slice(BKP_PREFFIX.length + 1);
            if(!bkpId) {
              res.sendStatus(404);
            } else {
              const bkp = await dbs.backups.findOne({ id: bkpId  });
              if(!bkp){
                res.sendStatus(404);
              } else {
                const { fileMgr } = await getFileMgr(dbs, bkp.credential_id);
                if(bkp.credential_id){
                  /* Allow access at a download rate of 50KBps */
                  const presignedURL = await fileMgr.getFileS3URL(bkp.id, (bkp.sizeInBytes ?? 1e6)/50);
                  if(!presignedURL){
                    res.sendStatus(404);
                  } else {
                    res.redirect(presignedURL)
                  }
                } else {
                  try {
                    res.type("text/plain")
                    res.sendFile(path.join(ROOT_DIR + BKP_PREFFIX + "/" + bkp.id));
                  } catch(err){
                    res.sendStatus(404);
                  }
                }
              }
            }
          }
        } else if(req.path.startsWith(MEDIA_ROUTE_PREFIX)){
          req.next?.();
        /* Must be socket io reconnecting */
        } else if(req.query.transport === "polling"){
          req.next?.()
        } else {
          res.sendFile(path.join(ROOT_DIR + '/../client/build/index.html'));
        }
      },
      cookieOptions: authCookieOpts,
      magicLinks: {
        check: async (id, dbo, db) => {
          const mlink = await dbo.magic_links.findOne({ id });
          
          if(mlink){
            if(mlink.expires < Date.now()) throw "Expired magic link";
          } else throw new Error("Magic link not found")
          const user = await dbo.users.findOne({ id: mlink.user_id });
          if(!user) throw new Error("User from Magic link not found")
          return makeSession(user, dbo , mlink.expires);
        }
      }
    }
  }
  return auth;
};
