process.on("unhandledRejection", (reason, p) => {
  console.trace("Unhandled Rejection at: Promise", p, "reason:", reason);
});

import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { ProstglesState } from "@common/electronInitTypes";
import { isObject, type DBSSchema } from "@common/publishUtils";
import { SPOOF_TEST_VALUE } from "@common/utils";
import { spawn } from "child_process";
import type { NextFunction, Request, Response } from "express";
import path from "path";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { VoidFunction } from "prostgles-server/dist/SchemaWatch/SchemaWatch";
import { getKeys, omitKeys, type AnyObject } from "prostgles-types";
import { sidKeyName } from "./authConfig/sessionUtils";
import { getAuthSetupData } from "./authConfig/subscribeToAuthSetupChanges";
import { ConnectionManager } from "./ConnectionManager/ConnectionManager";
import { actualRootDir, getElectronConfig } from "./electronConfig";
import { initExpressAndIOServers } from "./init/initExpressAndIOServers";
import { setDBSRoutesForElectron } from "./init/setDBSRoutesForElectron";
import type {
  InitExtra,
  ProstglesInitStateWithDBS,
} from "./init/startProstgles";
import {
  getProstglesState,
  startingProstglesResult,
  tryStartProstgles,
} from "./init/tryStartProstgles";

const { app, http, io } = initExpressAndIOServers();

export const connMgr = new ConnectionManager(http, app);
export const isDocker = Boolean(process.env.IS_DOCKER);

const isTestingElectron = require.main?.filename.endsWith("testElectron.js");
const electronConfig = getElectronConfig();
const PORT =
  electronConfig && !isTestingElectron ? 0 : (
    +(process.env.PROSTGLES_UI_PORT ?? 3004)
  );
const LOCALHOST = "127.0.0.1";
const HOST =
  electronConfig ? LOCALHOST : process.env.PROSTGLES_UI_HOST || LOCALHOST;
setDBSRoutesForElectron(app, io, PORT, HOST);

/** Make client wait for everything to load before serving page */
export const waitForInitialisation =
  async (): Promise<ProstglesInitStateWithDBS> => {
    const { initState, isElectron, electronCredsProvided } =
      getProstglesState();

    // Return immediately if not in loading state or if in Electron without credentials
    if (
      initState.state !== "loading" ||
      (isElectron && !electronCredsProvided)
    ) {
      return initState;
    }

    await startingProstglesResult?.result;
    await tout(200);
    return waitForInitialisation();
  };

/**
 * Serve prostglesInitState
 */
app.get("/dbs", (req, res) => {
  const prostglesState = getProstglesState();
  const { initState } = prostglesState;
  const nonSerialiseableOrNotNeededKeys = getKeys({
    dbs: 1,
  } satisfies Record<keyof InitExtra, 1>);
  const serverState: ProstglesState = {
    ...prostglesState,
    initState:
      /**
       * Do not send full error details to the client if it's not Electron.
       * Electron can only be accessed locally so we can safely send full error details
       * */
      initState.state === "error" && !prostglesState.isElectron ?
        {
          ...initState,
          error:
            initState.errorType === "init" ?
              "Failed to start prostgles. Check logs"
            : "Could not connect to the state database. Check logs",
        }
      : initState.state === "ok" ?
        omitKeys(initState, nonSerialiseableOrNotNeededKeys)
      : initState,
  };

  const electronCreds =
    electronConfig?.isElectron && electronConfig.hasCredentials() ?
      electronConfig.getCredentials()
    : undefined;
  /** Provide credentials if there is a connection error so the user can rectify it */
  if (
    electronCreds &&
    serverState.initState.state === "error" &&
    serverState.initState.errorType === "connection" &&
    (req.cookies as AnyObject)[sidKeyName] ===
      electronConfig?.sidConfig.electronSid
  ) {
    serverState.electronCreds =
      electronCreds as typeof serverState.electronCreds;
  }
  /** Alert admin if x-real-ip is spoofable */
  let xRealIpSpoofable = false;
  const { globalSettings } = getAuthSetupData();
  if (
    req.headers["x-real-ip"] === SPOOF_TEST_VALUE &&
    globalSettings?.login_rate_limit_enabled &&
    globalSettings.login_rate_limit.groupBy === "x-real-ip"
  ) {
    xRealIpSpoofable = true;
  }
  res.json({ ...serverState, xRealIpSpoofable });
});

/* Must provide index.html if there is an error OR prostgles is loading */
const serveIndexIfNoCredentialsOrInitError = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await waitForInitialisation();
  const {
    isElectron,
    initState: { state },
    electronCredsProvided,
  } = getProstglesState();
  if (state !== "ok" || (isElectron && !electronCredsProvided)) {
    if (req.method === "GET" && !req.path.startsWith("/dbs")) {
      res.sendFile(path.resolve(actualRootDir + "/../client/build/index.html"));
      return;
    }
  }

  next();
};

// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.use(serveIndexIfNoCredentialsOrInitError);

/** Startup procedure
 * If electron:
 *  - serve index
 *  - serve prostglesInitState
 *  - Check for any existing older prostgles schema versions AND allow deleting curr db OR connect to new db
 *  - start prostgles IF or WHEN creds provided
 *  - remove serve index after prostgles is ready
 *
 * If docker/default
 *  - serve index if loading
 *  - serve prostglesInitState
 *  - try start prostgles
 *  - If failed to connect then also serve index
 */
const startProstgles = ({ host, port }: { host: string; port: number }) => {
  if (electronConfig) {
    const creds = electronConfig.getCredentials();
    if (creds) {
      void tryStartProstgles({ app, io, host, port, con: creds });
    } else {
      console.log("Electron: No credentials");
    }
    setDBSRoutesForElectron(app, io, port, host);
  } else {
    void tryStartProstgles({ app, io, host, port, con: undefined });
  }
};

export function restartProc(cb?: VoidFunction) {
  console.warn("Restarting process");
  if (process.env.process_restarting) {
    delete process.env.process_restarting;
    // Give old process one second to shut down before continuing ...
    setTimeout(() => {
      cb?.();
      restartProc();
    }, 1000);
    return;
  }

  // Restart process ...
  const command = process.argv[0];
  if (!command) {
    throw new Error("No command found to restart process");
  }
  const args = process.argv.slice(1);
  spawn(command, args, {
    env: { process_restarting: "1" },
    stdio: "ignore",
  }).unref();
}

export const tout = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, timeout);
  });
};

export type BareConnectionDetails = Pick<
  Connections,
  | "type"
  | "db_conn"
  | "db_host"
  | "db_name"
  | "db_pass"
  | "db_port"
  | "db_user"
  | "db_ssl"
  | "ssl_certificate"
>;
export type DBS = DBOFullyTyped<DBGeneratedSchema>;
export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
export type DatabaseConfigs = DBSSchema["database_configs"];

export const log = (msg: string, extra?: any) => {
  console.log(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    ...[`(server): ${new Date().toISOString()} ` + msg, extra].filter((v) => v),
  );
};

type OnServerReadyResult = {
  // dbs: DBS;
  port: number;
};

export const startServer = async (
  onReady?: (
    result: OnServerReadyResult,
    startupResult: ProstglesInitStateWithDBS,
  ) => void | Promise<void>,
) => {
  const actualPort = await new Promise<number>((resolve) => {
    const server = http.listen(PORT, HOST, () => {
      const address = server.address();
      const port = isObject(address) ? address.port : PORT;
      const host = isObject(address) ? address.address : HOST;

      startProstgles({ host, port });

      console.log(
        `\n\nexpress listening on port ${port} (${host}:${port})\n\n`,
      );

      resolve(port);
    });
  });

  const startupResult = await waitForInitialisation();
  await onReady?.({ port: actualPort }, startupResult);
  return { connMgr };
};

/**
 * Start the server if not electron
 * Otherwise it will be started from electron/main.ts
 */
if (require.main === module) {
  void startServer((result, dbStartupInfo) => {
    if (dbStartupInfo.state === "error") {
      console.error("Failed to start prostgles", dbStartupInfo);
      process.exit(1);
    }
    console.log("Server started", result);
  });
}
