import type { DBHandlerServer } from "prostgles-server";
import { parseCronSchedule } from "prostgles-server/dist/Jobs/cronSchedule";
import type { AlertsOptions } from "./AlertTypes";
import { getAlertDb } from "./getAlertTables";
import type { DBS } from "..";
import { getAlertRecipients } from "./getAlertRecipients";
import { getSerialisableError } from "prostgles-types";

/** Poll persisted schedules. Missed occurrences while workers are stopped are not replayed. */
export const enqueueAlerts = async (
  dbo: DBHandlerServer,
  options: AlertsOptions,
  dbs: DBS,
  syncUsers: boolean,
) => {
  const now = new Date();
  const alerts = await getAlertDb(dbo, options).alerts.find(
    { enabled: true },
    { limit: null },
  );
  const schedulingErrors: { alertId: string; error: unknown }[] = [];
  for (const alert of alerts) {
    try {
      const occurrence = parseCronSchedule({
        type: "schedule",
        ...alert.schedule,
      })(now);
      if (!occurrence) continue;
      const recipients = await getAlertRecipients(
        dbs,
        dbo,
        alert.user_filter,
        syncUsers,
      );
      if (!recipients.length) continue;
      await dbo.tx(async (dbx) => {
        const tables = getAlertDb(dbx, options);
        /* The unique constraint arbitrates between workers. Row hooks queue delivery jobs in this transaction. */
        await tables.deliveries.insertMany(
          recipients.flatMap((recipient) =>
            alert.channels.map((channel) => ({
              alert_id: alert.id,
              user_id: recipient.id,
              channel,
              occurrence: occurrence.toISOString(),
              definition: alert.definition,
              revision: alert.revision,
              outcome: "pending",
            })),
          ),
          { onConflict: "DoNothing" },
        );
      });
    } catch (error) {
      schedulingErrors.push({
        alertId: alert.id,
        error: getSerialisableError(error),
      });
    }
  }
  if (schedulingErrors.length) {
    throw new Error("Failed to schedule one or more alerts", {
      cause: schedulingErrors,
    });
  }
};
