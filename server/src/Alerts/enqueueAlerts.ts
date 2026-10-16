import type { DBHandlerServer } from "prostgles-server";
import { parseCronSchedule } from "prostgles-server/dist/Jobs/cronSchedule";
import type { AlertsOptions } from "./AlertTypes";
import { getAlertDb } from "./getAlertTables";

/** Poll persisted schedules. Missed occurrences while workers are stopped are not replayed. */
export const enqueueAlerts = async (
  dbo: DBHandlerServer,
  options: AlertsOptions,
) => {
  const now = new Date();
  const alerts = await getAlertDb(dbo, options).alerts.find(
    { enabled: true },
    { limit: null },
  );
  for (const alert of alerts) {
    const occurrence = parseCronSchedule({
      type: "schedule",
      ...alert.schedule,
    })(now);
    if (!occurrence) continue;
    await dbo.tx(async (dbx) => {
      const tables = getAlertDb(dbx, options);
      const recipients = await tables.recipients.find(
        { alert_id: alert.id, enabled: true },
        { limit: null },
      );
      if (!recipients.length) return;
      // The unique constraint arbitrates between workers. Row hooks queue delivery jobs in this transaction.
      await tables.deliveries.insertMany(
        recipients.map((recipient) => ({
          alert_id: alert.id,
          recipient_id: recipient.id,
          user_id: recipient.user_id,
          channel: recipient.channel,
          occurrence: occurrence.toISOString(),
          definition: alert.definition,
          revision: alert.revision,
          outcome: "pending",
        })),
        { onConflict: "DoNothing" },
      );
    });
  }
};
