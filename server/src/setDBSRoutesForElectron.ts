import { pickKeys } from "prostgles-types";
import { testDBConnection } from "./connectionUtils/testDBConnection";
import { validateConnection } from "./connectionUtils/validateConnection";
import type { Express } from "express";
import { getElectronConfig } from "./electronConfig";
import { getInitState, tryStartProstgles } from "./startProstgles";
import type { Server } from "socket.io";

export const setDBSRoutesForElectron = (
  app: Express,
  io: Server,
  port: number,
  host: string,
) => {
  const initState = getInitState();
  if (!initState.isElectron) return;

  const ele = getElectronConfig();
  if (!ele?.sidConfig.electronSid) {
    throw "Electron sid missing";
  }

  app.post("/dbs", async (req, res) => {
    if (req.body.deleteExisting) {
      const electronConfig = getElectronConfig();
      electronConfig?.setCredentials(undefined);
      res.json({ msg: "DBS changed. Restart system" });
      return;
    }

    const creds = pickKeys(req.body, [
      "db_conn",
      "db_user",
      "db_pass",
      "db_host",
      "db_port",
      "db_name",
      "db_ssl",
      "type",
    ]);
    if (req.body.validate) {
      try {
        const connection = validateConnection(creds);
        res.json({ connection });
      } catch (warning) {
        res.json({ warning });
      }
      return;
    }

    if (!creds.db_conn || !creds.db_host) {
      res.json({ warning: "db_conn or db_host Missing" });
      return;
    }

    const sendWarning = (
      warning: any,
      electronConfig?: ReturnType<typeof getElectronConfig>,
    ) => {
      res.json({ warning });
      electronConfig?.setCredentials(undefined);
    };

    try {
      const electronConfig = getElectronConfig();

      try {
        await testDBConnection(creds);
        const startup = await tryStartProstgles({
          app,
          io,
          con: creds,
          port,
          host,
        });

        if (!startup.ok) {
          throw startup;
        }
        electronConfig?.setCredentials(creds);
        res.json({ msg: "DBS changed. Restart system" });
      } catch (warning) {
        sendWarning(warning, electronConfig);
      }
    } catch (warning) {
      sendWarning(warning);
    }
  });
};
