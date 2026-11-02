import type { PluginDefinition } from "@src/Plugins/Plugins";
import {
  createJobDefiner,
  type GetClientDBHandlers,
  type JobsOptions,
} from "prostgles-server";
import { parseCronSchedule } from "prostgles-server/dist/Jobs/cronSchedule";
import { connectionManager, type DBS } from "..";
import type { ProstglesContext } from "../schemaConfig";
import type { AlertsOptions } from "./AlertTypes";
import type { EmailOutboxOptions } from "../Emails/EmailOutboxTypes";
import { enqueueAlerts } from "./enqueueAlerts";
import {
  getAlertTableNames,
  getAlertTables,
  type AlertSchema,
} from "./getAlertTables";
import { runAlertDelivery } from "./runAlertDelivery";
import { validateAlertQuery } from "./prepareQueryAlert";
import { getAlertTableOptions } from "./getAlertTableOptions";
import { pickKeys } from "prostgles-types";
import { getAlertFunctions } from "./getAlertFunctions";

export const getAlertsPlugin = (
  connectionId: string,
  options: AlertsOptions | undefined,
  jobsTableName: string,
  emailOutbox: EmailOutboxOptions | undefined,
  syncUsers: boolean,
  dbs: DBS,
): PluginDefinition | undefined => {
  if (!options) return;
  const channelNames = Object.keys(options.channels);
  if (!channelNames.length) {
    throw new Error("alerts requires at least one channel");
  }
  const names = getAlertTableNames(options);
  const tables = getAlertTables(options, jobsTableName, syncUsers);
  for (const [key, alert] of Object.entries(options.rules ?? {})) {
    if (!key.trim() || !alert.name.trim())
      throw new Error(`Invalid configured alert: ${key}`);
    if ("query" in alert) {
      if ("prepare" in alert)
        throw new Error(`Alert ${key} must use either query or prepare`);
      validateAlertQuery(
        pickKeys(alert, ["query", "template", "deduplicate"]),
      );
    } else if (typeof alert.prepare !== "function") {
      throw new Error(`Alert ${key} requires a query or prepare callback`);
    } else if ("deduplicate" in alert) {
      throw new Error(`Alert ${key} requires a query to deduplicate rows`);
    }
    if (
      !alert.channels.length ||
      alert.channels.some((name) => !options.channels[name])
    )
      throw new Error(`Invalid alert channels for ${key}`);
    parseCronSchedule({ type: "schedule", ...alert.schedule });
  }

  const getClientDBHandlers: GetClientDBHandlers = (request, scope) =>
    connectionManager
      .getActiveConnection(connectionId)
      .prgl.getClientDBHandlers(request, scope);
  const defineJob = createJobDefiner<void, ProstglesContext>();
  const jobDefinitions = {
    __prostgles_alertSchedule: defineJob({
      trigger: { type: "schedule", cron: "* * * * * *" },
      retention: { succeeded: { maxCount: 1 }, failed: "7d" },
      onConflict: "skip",
      run: ({ dbo }) => enqueueAlerts(dbo, options, dbs, syncUsers),
    }),
    __prostgles_alertDelivery: defineJob({
      trigger: {
        type: "row",
        table: names.deliveries,
        on: ["insert"],
        jobIdColumn: "job_id",
      },
      retry: { maxAttempts: 3, backoff: "exponential", delayMs: 1000 },
      concurrency: 4,
      run: ({ dbo, row, signal, run }) =>
        runAlertDelivery(
          dbo,
          options,
          getClientDBHandlers,
          row as Required<AlertSchema["deliveries"]["columns"]>,
          signal,
          run.id,
          emailOutbox,
          dbs,
          syncUsers,
          jobsTableName,
        ),
    }),
  } satisfies JobsOptions<void, ProstglesContext>["definitions"];

  return {
    functions: getAlertFunctions(options, dbs, syncUsers, getClientDBHandlers),
    tableOptions: getAlertTableOptions(names),
    tableConfig: {
      [names.channels]: {
        info: { label: "Alert channels" },
        isLookupTable: {
          values: Object.fromEntries(
            channelNames.map((channel) => [channel, {}]),
          ),
        },
        publish: { insert: false, update: false, delete: false },
      },
      [names.alerts]: tables.alerts,
      [names.deliveries]: {
        ...tables.deliveries,
        publish: { insert: false, update: false, delete: false },
      },
    },
    tableHooks: {
      [names.alerts]: {
        beforeEach: [
          {
            commands: { insert: 1, update: 1 },
            validate: async ({ data }) => {
              if (data.user_filter) {
                await dbs.users.find(data.user_filter, {
                  select: ["id"],
                  limit: 0,
                });
              }
              if (
                data.channels &&
                (!Array.isArray(data.channels) ||
                  data.channels.some(
                    (channel) => !channelNames.includes(channel),
                  ))
              ) {
                throw new Error("Invalid alert channels");
              }
              if (data.definition) {
                validateAlertQuery(
                  data.definition as NonNullable<
                    AlertSchema["alerts"]["columns"]["definition"]
                  >,
                );
              }
              if (data.schedule)
                parseCronSchedule({
                  type: "schedule",
                  ...(data.schedule as AlertSchema["alerts"]["columns"]["schedule"]),
                });
            },
          },
        ],
      },
    },
    jobDefinitions,
  };
};
