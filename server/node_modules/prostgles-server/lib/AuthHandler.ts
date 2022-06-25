import { AnyObject, AuthGuardLocation, AuthGuardLocationResponse, CHANNELS, DBSchema } from "prostgles-types";
import { LocalParams, PRGLIOSocket } from "./DboBuilder";
import { DBOFullyTyped } from "./DBSchemaBuilder";
import { DB, DBHandlerServer, Prostgles } from "./Prostgles";
type Awaitable<T> = T | Promise<T>;
type AuthSocketSchema = {
  user?: AnyObject;
  register?: boolean;
  login?: boolean;
  logout?: boolean;
  pathGuard?: boolean;
};

type ExpressReq = {
  body?: AnyObject;
  query?: AnyObject;
  cookies?: AnyObject;
  params?: AnyObject;
  path: string;
  originalUrl: string;
}
type ExpressRes = {
  status: (code: number) => ({ json: (response: AnyObject) => any; });
  cookie: (name: string, value: string, options: AnyObject) => any;
  sendFile: (filepath: string) => void;
  redirect: (url: string) => void;
}

export type BasicSession = {

  /** Must be hard to bruteforce */
  sid: string;

  /** UNIX millisecond timestamp */
  expires: number;

};
export type AuthClientRequest = { socket: any } | { httpReq: ExpressReq }
export type Auth<S = void> = {
  /**
   * Name of the cookie or socket hadnshake query param that represents the session id. 
   * Defaults to "session_id"
   */
  sidKeyName?: string;

  /**
   * Response time rounding in milliseconds to prevent timing attacks on login. Login response time should always be a multiple of this value. Defaults to 500 milliseconds
   */
  responseThrottle?: number;

  expressConfig?: {
    /**
     * Express app instance. If provided Prostgles will attempt to set sidKeyName to user cookie
     */
    app: any;

    /**
     * Used in allowing logging in through express. Defaults to /login
     */
    loginRoute?: string;

    /**
     * Used in allowing logging out through express. Defaults to /logout
     */
    logoutGetPath?: string;

    /**
     * Options used in setting the cookie after a successful login
     */
    cookieOptions?: AnyObject;

    /**
     * If provided, any client requests to NOT these routes (or their subroutes) will be redirected to loginRoute and then redirected back to the initial route after logging in
     */
    publicRoutes?: string[];

    /**
     * False by default. If false and userRoutes are provided then the socket will request window.location.reload if the current url is on a user route.
     */
    disableSocketAuthGuard?: boolean;

    /**
     * Will be called after a GET request is authorised
     */
    onGetRequestOK?: (req: ExpressReq, res: ExpressRes) => any;

    /**
     * Name of get url parameter used in redirecting user after successful login. Defaults to returnURL
     */
    returnURL?: string;

    magicLinks?: {

      /**
       * Will default to /magic-link
       */
      route?: string;

      /**
       * Used in creating a session/logging in using a magic link
       */
      check: (magicId: string, dbo: DBOFullyTyped<S>, db: DB) => Awaitable<BasicSession | undefined>;
    }

  }

  getUser: (sid: string | undefined, dbo: DBOFullyTyped<S>, db: DB, client: AuthClientRequest) => Awaitable<{

    /**
     * User data used on server. Mainly used in http request auth
     */
    user: AnyObject;

    /**
     * User data sent to client. Mainly used in socket request auth
     */
    clientUser: AnyObject;

  } | undefined>;

  register?: (params: AnyObject, dbo: DBOFullyTyped<S>, db: DB) => Awaitable<BasicSession> | BasicSession;
  login?: (params: AnyObject, dbo: DBOFullyTyped<S>, db: DB) => Awaitable<BasicSession> | BasicSession;
  logout?: (sid: string | undefined, dbo: DBOFullyTyped<S>, db: DB) => Awaitable<any>;

  /**
   * If provided then then session info will be saved on socket.__prglCache and reused from there
   */
  cacheSession?: {
    getSession: (sid: string | undefined, dbo: DBOFullyTyped<S>, db: DB) => Awaitable<BasicSession>
  }
}

export type ClientInfo = {
  user?: AnyObject;
  clientUser?: AnyObject;
  sid?: string;
}

export default class AuthHandler {
  protected opts?: Auth;
  dbo: DBHandlerServer;
  db: DB;
  sidKeyName?: string;
  returnURL?: string;

  loginRoute?: string;
  logoutGetPath?: string;

  constructor(prostgles: Prostgles) {
    this.opts = prostgles.opts.auth as any;
    if (prostgles.opts.auth?.expressConfig) {
      this.returnURL = prostgles.opts.auth?.expressConfig?.returnURL || "returnURL";
      this.loginRoute = prostgles.opts.auth?.expressConfig?.loginRoute || "/login";
      this.logoutGetPath = prostgles.opts.auth?.expressConfig?.logoutGetPath || "/logout";
    }
    if(!prostgles.dbo || !prostgles.db) throw "dbo or db missing";
    this.dbo = prostgles.dbo;
    this.db = prostgles.db;
  }

  validateSid = (sid: string | undefined) => {
    if (!sid) return undefined;
    if (typeof sid !== "string") throw "sid missing or not a string";
    return sid;
  }

  matchesRoute = (route: string | undefined, clientFullRoute: string) => {
    return route && clientFullRoute && (
      route === clientFullRoute ||
      clientFullRoute.startsWith(route) && ["/", "?", "#"].includes(clientFullRoute.slice(-1))
    )
  }

  isUserRoute = (pathname: string) => {
    const pubRoutes = [
      ...this.opts?.expressConfig?.publicRoutes || [],
    ];
    if (this.loginRoute) pubRoutes.push(this.loginRoute);
    if (this.logoutGetPath) pubRoutes.push(this.logoutGetPath);

    return Boolean(!pubRoutes.find(publicRoute => {
      return this.matchesRoute(publicRoute, pathname); // publicRoute === pathname || pathname.startsWith(publicRoute) && ["/", "?", "#"].includes(pathname.slice(-1));
    }));
  }

  private setCookieAndGoToReturnURLIFSet = (cookie: { sid: string; expires: number; }, r: { req: ExpressReq; res: ExpressRes }) => {
    const { sid, expires } = cookie;
    const { res, req } = r;
    if (sid) {
      let maxAge = 1000 * 60 * 60 * 24; // 24 hours
      if(expires && Number.isFinite(expires) && !isNaN(+ new Date(expires))){
        maxAge = (+ new Date(expires) - Date.now())
      }
      let options = {
        maxAge,
        httpOnly: true, // The cookie only accessible by the web server
        //signed: true // Indicates if the cookie should be signed
      }
      const cookieOpts = { ...options, secure: true, sameSite: "strict", ...(this.opts?.expressConfig?.cookieOptions || {}) };
      const cookieData = sid;
      if(!this.sidKeyName || !this.returnURL) throw "sidKeyName or returnURL missing"
      res.cookie(this.sidKeyName, cookieData, cookieOpts);
      const successURL = getReturnUrl(req, this.returnURL) || "/";
      res.redirect(successURL);

    } else {
      throw ("no user or session")
    }
  }

  getUser = async (clientReq: AuthClientRequest): Promise<AnyObject | undefined> => {
    if(!this.sidKeyName || !this.opts?.getUser) throw "sidKeyName or this.opts.getUser missing"
    const sid = "httpReq" in clientReq? clientReq.httpReq?.cookies?.[this.sidKeyName] : clientReq.socket
    if (!sid) return undefined;

    try {
      return this.throttledFunc(async () => {

        return this.opts!.getUser(this.validateSid(sid), this.dbo as any, this.db, clientReq);
      }, 50)
    } catch (err) {
      console.error(err);
    }
    return undefined;
  }

  async init() {
    if (!this.opts) return;

    this.opts.sidKeyName = this.opts.sidKeyName || "session_id";
    const { sidKeyName, login, getUser, expressConfig } = this.opts;
    this.sidKeyName = this.opts.sidKeyName;

    if (typeof sidKeyName !== "string" && !login) {
      throw "Invalid auth: Provide { sidKeyName: string } ";
    }
    /**
     * Why ??? Collision with socket.io ???
     */
    if (this.sidKeyName === "sid") throw "sidKeyName cannot be 'sid' please provide another name.";

    if (!getUser) throw "getUser missing from auth config";

    if (expressConfig) {
      const { app, publicRoutes = [], onGetRequestOK, magicLinks } = expressConfig;
      if (publicRoutes.find(r => typeof r !== "string" || !r)) {
        throw "Invalid or empty string provided within publicRoutes "
      }

      if (app && magicLinks) {
        const { route = "/magic-link", check } = magicLinks;
        if (!check) throw "Check must be defined for magicLinks";
        app.get(`${route}/:id`, async (req: ExpressReq, res: ExpressRes) => {
          const { id } = req.params ?? {};

          if (typeof id !== "string" || !id) {
            res.status(404).json({ msg: "Invalid magic-link id. Expecting a string" });
          } else {
            try {
              const session = await this.throttledFunc(async () => {
                return check(id, this.dbo as any, this.db);
              });
              if (!session) {
                res.status(404).json({ msg: "Invalid magic-link" });
              } else {
                this.setCookieAndGoToReturnURLIFSet(session, { req, res });
              }

            } catch (e) {
              res.status(404).json({ msg: e });
            }
          }
        });
      }

      if (app && this.loginRoute) {
        

        app.post(this.loginRoute, async (req: ExpressReq, res: ExpressRes) => {
          try {
            const { sid, expires } = await this.loginThrottled(req.body || {}) || {};

            if (sid) {

              this.setCookieAndGoToReturnURLIFSet({ sid, expires }, { req, res });

            } else {
              throw ("no user or session")
            }
          } catch (err) {
            console.log(err)
            res.status(404).json({ err: "Invalid username or password" });
          }


        });

        if (app && this.logoutGetPath && this.opts.logout) {
          app.get(this.logoutGetPath, async (req: ExpressReq, res: ExpressRes) => {
            const sid = this.validateSid(req?.cookies?.[sidKeyName]);
            if (sid) {
              try {
                await this.throttledFunc(() => {

                  return this.opts!.logout!(req?.cookies?.[sidKeyName], this.dbo as any, this.db);
                })
              } catch (err) {
                console.error(err);
              }
            }
            res.redirect("/")
          });
        }

        if (app && Array.isArray(publicRoutes)) {

          /* Redirect if not logged in and requesting non public content */
          app.get('*', async (req: ExpressReq, res: ExpressRes) => {
            const clientReq: AuthClientRequest = { httpReq: req }
            const getUser = this.getUser;
            try {
              const returnURL = getReturnUrl(req, this.returnURL)


              /**
               * Requesting a User route
               */
              if (this.isUserRoute(req.path)) {
                /* Check auth. Redirect if unauthorized */
                const u = await getUser(clientReq);
                if (!u) {
                  res.redirect(`${this.loginRoute}?returnURL=${encodeURIComponent(req.originalUrl)}`);
                  return;
                }

                /* If authorized and going to returnUrl then redirect. Otherwise serve file */
              } else if (returnURL && (await getUser(clientReq))) {

                res.redirect(returnURL);
                return;

                /** If Logged in and requesting login then redirect */
              } else if (this.matchesRoute(this.loginRoute, req.path) && (await getUser(clientReq))) {

                res.redirect("/");
                return;
              }

              if (onGetRequestOK) {
                onGetRequestOK(req, res)
              }

            } catch (error) {
              console.error(error);
              res.status(404).json({ msg: "Something went wrong", error });
            }

          });
        }
      }
    }
  }

  throttledFunc = <T>(func: () => Promise<T>, throttle = 500): Promise<T> => {

    return new Promise(async (resolve, reject) => {

      let interval: NodeJS.Timeout, result: any, error: any, finished = false;

      /**
       * Throttle response times to prevent timing attacks
       */
      interval = setInterval(() => {
        if (finished) {
          clearInterval(interval);
          if (error) {
            reject(error);
          } else {
            resolve(result)
          }
        }
      }, throttle);


      try {
        result = await func();
      } catch (err) {
        console.log(err)
        error = err;
      }

      finished = true;
    })
  }

  loginThrottled = async (params: AnyObject): Promise<BasicSession> => {
    if (!this.opts?.login) throw "Auth login config missing";
    const { responseThrottle = 500 } = this.opts;

    return this.throttledFunc(async () => {
      let result = await this.opts?.login?.(params, this.dbo as any, this.db);
      const err = {
        msg: "Bad login result type. \nExpecting: undefined | null | { sid: string; expires: number } but got: " + JSON.stringify(result) 
      }
      
      if(!result) throw err;
      if(result && (typeof result.sid !== "string" || typeof result.expires !== "number") || !result && ![undefined, null].includes(result)) {
        throw err
      }
      if(result && result.expires < Date.now()){
        throw { msg: "auth.login() is returning an expired session. Can only login with a session.expires greater than Date.now()"}
      }

      return result;
    }, responseThrottle);

  }


  /**
   * Will return first sid value found in : http cookie or query params
   * Based on sid names in auth
   * @param localParams 
   * @returns string
   */
  getSID(localParams: LocalParams): string | undefined {
    if (!this.opts) return undefined;

    const { sidKeyName } = this.opts;

    if (!sidKeyName || !localParams) return undefined;

    if (localParams.socket) {
      const querySid = localParams.socket?.handshake?.query?.[sidKeyName];
      let rawSid = querySid;
      if (!rawSid) {
        const cookie_str = localParams.socket?.handshake?.headers?.cookie;
        const cookie = parseCookieStr(cookie_str);
        rawSid = cookie[sidKeyName];
      }
      return this.validateSid(rawSid);

    } else if (localParams.httpReq) {
      return this.validateSid(localParams.httpReq?.cookies?.[sidKeyName]);

    } else throw "socket OR httpReq missing from localParams";

    function parseCookieStr(cookie_str: string | undefined): any {
      if (!cookie_str || typeof cookie_str !== "string") return {}
      return cookie_str.replace(/\s/g, '').split(";").reduce<AnyObject>((prev, current) => {
        const [name, value] = current.split('=');
        prev[name] = value;
        return prev
      }, {});
    }
  }

  async getClientInfo(localParams: Pick<LocalParams, "socket" | "httpReq">): Promise<ClientInfo | undefined> {
    if (!this.opts) return {};

    const getSession = this.opts.cacheSession?.getSession;
    const isSocket = "socket" in localParams
    if(getSession && isSocket && localParams.socket?.__prglCache){
      const { session, user, clientUser } = localParams.socket.__prglCache;
      const isValid = this.isValidSocketSession(localParams.socket, session)
      if(isValid){

        return {
          sid: session.sid,
          user, 
          clientUser,
        }
      } else return {};
    }

    const res = await this.throttledFunc(async () => {

      const { getUser } = this.opts ?? {};

      if (getUser && localParams && (localParams.httpReq || localParams.socket)) {
        const sid = this.getSID(localParams);
        const clientReq = localParams.httpReq? { httpReq: localParams.httpReq } : { socket: localParams.socket };
        let user, clientUser;
        if(sid){
          const res = await getUser(sid, this.dbo as any, this.db, clientReq);
          user = res?.user;
          clientUser = res?.clientUser;
        }
        if(getSession && isSocket){
          const session = await getSession(sid, this.dbo as any, this.db)
          if(session?.expires && user && clientUser && localParams.socket){
            localParams.socket.__prglCache = { 
              session,
              user, 
              clientUser,
            }
          }
        }
        if(sid) {
          return { sid, user, clientUser }
        }
      }
  
      return {};
    }, 5);

    return res;
  }

  isValidSocketSession = (socket: PRGLIOSocket, session: BasicSession): boolean => {
    const hasExpired = Boolean(session && session.expires <= Date.now())
    if(this.opts?.expressConfig?.publicRoutes && !this.opts.expressConfig?.disableSocketAuthGuard){
      if(hasExpired){
        socket.emit(CHANNELS.AUTHGUARD, { shouldReload: true });
        throw ""
      }
    }
    return Boolean(session && !hasExpired);
  }

  makeSocketAuth = async (socket: PRGLIOSocket): Promise<AuthSocketSchema> => {
    if (!this.opts) return {};

    let auth: Partial<Record<keyof Omit<AuthSocketSchema, "user">, boolean | undefined>> & { user?: AnyObject | undefined } = {};

    if (this.opts.expressConfig?.publicRoutes && !this.opts.expressConfig?.disableSocketAuthGuard) {

      auth.pathGuard = true;

      socket.removeAllListeners(CHANNELS.AUTHGUARD)
      socket.on(CHANNELS.AUTHGUARD, async (params: AuthGuardLocation, cb = (err: any, res?: AuthGuardLocationResponse) => { }) => {

        try {
          const { pathname } = typeof params === "string" ? JSON.parse(params) : (params || {});
          if (pathname && typeof pathname !== "string") console.warn("Invalid pathname provided for AuthGuardLocation: ", pathname)
          if (pathname && typeof pathname === "string" && this.isUserRoute(pathname) && !(await this.getClientInfo({ socket }))?.user) {
            cb(null, { shouldReload: true });
          } else {
            cb(null, { shouldReload: false });
          }

        } catch (err) {
          console.error("AUTHGUARD err: ", err);
          cb(err)
        }
      });
    }

    const {
      register,
      logout
    } = this.opts;
    const login = this.loginThrottled

    let handlers: { 
      name: keyof Omit<AuthSocketSchema, "user">;
      ch: string;
      func: Function;
    }[] = [
      { func: (params: any, dbo: any, db: DB) => register?.(params, dbo, db), ch: CHANNELS.REGISTER, name: "register" as keyof Omit<AuthSocketSchema, "user"> },
      { func: (params: any, dbo: any, db: DB) => login(params), ch: CHANNELS.LOGIN, name: "login" as keyof Omit<AuthSocketSchema, "user"> },
      { func: (params: any, dbo: any, db: DB) => logout?.(this.getSID({ socket }), dbo, db), ch: CHANNELS.LOGOUT, name: "logout"  as keyof Omit<AuthSocketSchema, "user">}
    ].filter(h => h.func);

    const usrData = await this.getClientInfo({ socket });
    if (usrData) {
      auth.user = usrData.clientUser;
      handlers = handlers.filter(h => h.name === "logout");
    }

    handlers.map(({ func, ch, name }) => {
      auth[name] = true;

      socket.removeAllListeners(ch)
      socket.on(ch, async (params: any, cb = (...callback: any) => { }) => {

        try {
          if (!socket) throw "socket missing??!!";

          const res = await func(params, this.dbo as any, this.db);
          if (name === "login" && res && res.sid) {
            /* TODO: Re-send schema to client */
          }

          cb(null, true);

        } catch (err) {
          console.error(name + " err", err);
          cb(err)
        }
      });
    });

    return auth;
  }
}

/**
 * AUTH
 */
function getReturnUrl(req: ExpressReq, name?: string) {
  if (req?.query?.returnURL && name) {
    return decodeURIComponent(req?.query?.[name]);
  }
  return null;
}