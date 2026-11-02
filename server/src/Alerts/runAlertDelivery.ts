import type { DBHandlerServer, GetClientDBHandlers } from "prostgles-server";
import type { AlertsOptions } from "./AlertTypes";
import { getAlertDb, type AlertSchema } from "./getAlertTables";
import type { EmailOutboxOptions } from "../Emails/EmailOutboxTypes";
import { getEmailOutboxDb } from "../Emails/getEmailOutboxTables";
import { prepareAlert } from "./prepareAlert";
import type { DBS } from "..";
import { getAlertRecipients } from "./getAlertRecipients";
import { deduplicateAlertRows } from "./deduplicateAlertRows";

export const runAlertDelivery = async (
  dbo: DBHandlerServer,
  options: AlertsOptions,
  getClientDBHandlers: GetClientDBHandlers,
  delivery: Required<AlertSchema["deliveries"]["columns"]>,
  signal: AbortSignal,
  jobId: string,
  emailOutbox: EmailOutboxOptions | undefined,
  dbs: DBS,
  syncUsers: boolean,
  jobsTableName: string,
) => {
  if (delivery.outcome !== "pending") return;
  const { alerts, deliveries } = getAlertDb(dbo, options);
  const outbox =
    emailOutbox ? getEmailOutboxDb(dbo, emailOutbox).outbox : undefined;
  const sentEmail = await outbox?.findOne({
    alert_delivery_id: delivery.id,
    outcome: "sent",
  });
  if (sentEmail) {
    await deliveries.update(
      { id: delivery.id },
      {
        outcome: "sent",
        provider_id: sentEmail.provider_id,
        sent_at: sentEmail.sent_at,
      },
    );
    return;
  }
  const eligible = async () => {
    const alert = await alerts.findOne({
      id: delivery.alert_id,
      ...(!delivery.is_test && { enabled: true }),
      revision: delivery.revision,
    });
    if (!alert?.channels.includes(delivery.channel)) return undefined;
    const [recipient] = await getAlertRecipients(
      dbs,
      dbo,
      delivery.is_test ?
        { id: delivery.user_id, type: "admin" }
      : { $and: [alert.user_filter, { id: delivery.user_id }] },
      syncUsers,
    );
    return recipient ? alert : undefined;
  };
  const skip = async (reason: string) => {
    await dbo.tx(async (dbx) => {
      await getAlertDb(dbx, options).deliveries.update(
        { id: delivery.id },
        { outcome: "skipped", reason },
      );
      if (emailOutbox) {
        await getEmailOutboxDb(dbx, emailOutbox).outbox.update(
          { alert_delivery_id: delivery.id, outcome: "pending" },
          { outcome: "skipped", reason },
        );
      }
    });
  };
  const alert = await eligible();
  if (!alert) {
    await skip("Alert or recipient changed or was disabled");
    return;
  }
  const definition = delivery.definition;
  const channel = options.channels[delivery.channel];
  if (!channel) throw new Error("Alert channel is no longer configured");
  const message = await prepareAlert({
    options,
    alert: { ...alert, definition },
    getClientDBHandlers,
    recipientId: delivery.user_id,
    signal,
    filterRows: (rows) =>
      delivery.is_test ?
        Promise.resolve(rows)
      : deduplicateAlertRows(
          dbo,
          options,
          jobsTableName,
          delivery,
          definition?.deduplicate,
          rows,
        ),
  });
  if (!message) {
    if (delivery.is_test) {
      throw new Error("Cannot send test alert: no matching items to notify");
    }
    await skip("No matching items to notify");
    return;
  }
  signal.throwIfAborted();
  if (!(await eligible())) {
    await skip("Alert or recipient changed or was disabled");
    return;
  }
  const result = await channel.send({
    dbo,
    jobId,
    recipientId: delivery.user_id,
    message:
      delivery.is_test ?
        { ...message, title: `[TEST] ${message.title}` }
      : message,
    idempotencyKey: delivery.id,
    signal,
  });
  await deliveries.update(
    { id: delivery.id },
    {
      outcome: "sent",
      provider_id: result.providerId,
      sent_at: new Date().toISOString(),
    },
  );
};
