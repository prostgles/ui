import { randomBytes } from "crypto";
import type { Express, RequestHandler } from "express";
import { removeExpressRoute } from "prostgles-server/dist/Auth/AuthHandler";
import { assertJSONBObjectAgainstSchema } from "prostgles-server/dist/JSONBValidation/JSONBValidation";
import { getSerialisableError, pickKeys, tryCatchV2 } from "prostgles-types";
import type { Server } from "socket.io";
import { DEFAULT_ELECTRON_CONNECTION } from "../../../commonTypes/electronInitTypes";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { validateConnection } from "../connectionUtils/validateConnection";
import { getElectronConfig } from "../electronConfig";
import { getProstglesState, tryStartProstgles } from "./tryStartProstgles";

/**
 * Used in Electron to set the DB connection and show any connection errors
 */
export const setDBSRoutesForElectron = (
  app: Express,
  io: Server,
  port: number,
  host: string,
) => {
  const initState = getProstglesState();
  if (!initState.isElectron) return;

  const ele = getElectronConfig();
  if (!ele?.sidConfig.electronSid) {
    throw "Electron sid missing";
  }

  removeExpressRoute(app, ["/dbs"], "post");
  app.post("/dbs", onPostDBSRequestHandler(app, io, port, host));
};

const onPostDBSRequestHandler =
  (app: Express, io: Server, port: number, host: string): RequestHandler =>
  async (req, res) => {
    const electronConfig = getElectronConfig();
    try {
      if (!electronConfig?.isElectron) {
        throw "Not an electron app";
      }
      const data = pickKeys(req.body, ["connection", "mode"]);
      assertJSONBObjectAgainstSchema(
        {
          connection: {
            type: {
              type: { enum: ["Standard"] },
              db_conn: { type: "string" },
              db_host: { type: "string" },
              db_port: { type: "number" },
              db_user: { type: "string" },
              db_name: { type: "string" },
              db_pass: { type: "string" },
              db_ssl: {
                enum: [
                  "disable",
                  "allow",
                  "prefer",
                  "require",
                  "verify-ca",
                  "verify-full",
                ],
              },
            },
          },
          mode: { enum: ["validate", "quick", "manual"] },
        } as const,
        data,
        "/connection",
      );

      const { connection, mode } = data;

      const initialCredentials = pickKeys(connection, [
        "db_conn",
        "db_user",
        "db_pass",
        "db_host",
        "db_port",
        "db_name",
        "db_ssl",
        "type",
      ]);

      if (mode === "validate") {
        const connection = validateConnection(initialCredentials);
        res.json({ connection });
        return;
      }

      if (!initialCredentials.db_conn || !initialCredentials.db_host) {
        throw "db_conn or db_host Missing";
      }

      const { data: validatedCreds, error } = await tryCatchV2(async () => {
        if (mode === "manual") {
          await testDBConnection(initialCredentials);
          return initialCredentials;
        }

        const { db_user, db_name } = DEFAULT_ELECTRON_CONNECTION;
        let db_pass = randomBytes(12).toString("hex");
        /**
         * Quick mode = login with provided credentials to ensure DEFAULT_ELECTRON_CONNECTION db and user exist
         * */
        await testDBConnection(
          { ...initialCredentials, db_name: "postgres" },
          undefined,
          async (c) => {
            const userExists = await c.oneOrNone<{ usename: string }>(
              `SELECT usename FROM pg_catalog.pg_user WHERE usename = $1`,
              [db_user],
            );
            if (!userExists) {
              await c.none(
                `CREATE USER ${db_user} WITH ENCRYPTED PASSWORD $1 SUPERUSER`,
                [db_pass],
              );
              /** Overwrite password only if using different username */
            } else if (initialCredentials.db_user !== db_user) {
              await c.none(
                `ALTER USER ${db_user} WITH ENCRYPTED PASSWORD $1 SUPERUSER`,
                [db_pass],
              );
            } else {
              db_pass = initialCredentials.db_pass;
            }
            const dbExists = await c.oneOrNone<{ datname: string }>(
              `SELECT datname FROM pg_catalog.pg_database WHERE datname = $1`,
              [db_name],
            );
            if (!dbExists) {
              await c.none(`CREATE DATABASE ${db_name} WITH OWNER ${db_user} `);
            } else {
              /** If db exists, ensure user has access */
              await c.none(
                `GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO ${db_user}`,
              );
            }
          },
        );

        const newConnectionDetails = validateConnection({
          ...initialCredentials,
          type: "Standard",
          db_user,
          db_name,
          db_pass,
        });
        await testDBConnection(newConnectionDetails, true);
        return newConnectionDetails;
      });

      if (error) {
        throw error;
      }

      const startup = await tryStartProstgles({
        app,
        io,
        con: validatedCreds,
        port,
        host,
      });

      if (startup.state === "error") {
        throw startup;
      }
      electronConfig.setCredentials(validatedCreds);
      res.json({ msg: "DBS changed. Restart system" });
      return;
    } catch (err) {
      res.json({ warning: getSerialisableError(err) });
      electronConfig?.setCredentials(undefined);
    }
  };
