import type { DBSSchema } from "@common/publishUtils";
import { pickKeys } from "prostgles-types";
import * as cors from "cors";
import { getElectronConfig } from "@src/electronConfig";
export const getCorsOptions = (
  {
    cors: corsSettings,
    cors_csp_devmode_enabled,
  }: Pick<DBSSchema["database_configs"], "cors" | "cors_csp_devmode_enabled">,
  { is_state_db, port }: Pick<DBSSchema["connections"], "port" | "is_state_db">,
  stateAppPort: number,
) => {
  const corsOptions: cors.CorsOptions = {
    ...(corsSettings && pickKeys(corsSettings, ["methods", "allowedHeaders"])),
    /**
     * In devmode, allow credentials so that cookies can be set when accessing from web app dev (http://localhost:5173/)
     */
    credentials:
      !is_state_db && cors_csp_devmode_enabled ? true : (
        corsSettings?.credentialsAllowed
      ),
    origin: (requestedOrigin, cb) => {
      if (!requestedOrigin || getElectronConfig()?.isElectron) {
        return cb(null, true);
      }

      const allowedOrigins = [...(corsSettings?.allowedOrigins ?? [])];
      if (cors_csp_devmode_enabled) {
        allowedOrigins.push(`http://localhost:${stateAppPort}`);
        if (!is_state_db) {
          allowedOrigins.push("http://localhost:5173");
          if (port) {
            allowedOrigins.push(`http://localhost:${port}`);
          }
        }
      }
      if (allowedOrigins.includes(requestedOrigin)) {
        return cb(null, true);
      }
      console.error(`CORS policy: Origin ${requestedOrigin} blocked`);
      return cb(
        new Error(
          `CORS policy: Origin ${requestedOrigin} not allowed${
            allowedOrigins.length ?
              `, allowed origins: ${allowedOrigins.join(", ")}`
            : ""
          }`,
        ),
      );
    },
  };
  return corsOptions;
};
