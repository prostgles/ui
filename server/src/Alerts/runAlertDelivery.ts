import type { DBHandlerServer, GetClientDBHandlers } from "prostgles-server";
import type { AlertsOptions } from "./AlertTypes";
import { getAlertDb, type AlertSchema } from "./getAlertTables";

export const runAlertDelivery = async (
  dbo: DBHandlerServer,
  options: AlertsOptions,
  getClientDBHandlers: GetClientDBHandlers,
  delivery: Required<AlertSchema["deliveries"]["columns"]>,
  signal: AbortSignal,
) => {
  if (delivery.outcome !== "pending") return;
  const { alerts, recipients, deliveries } = getAlertDb(dbo, options);
  const eligible = async () => {
    const alert = await alerts.findOne({
      id: delivery.alert_id,
      enabled: true,
      revision: delivery.revision,
    });
    const recipient = await recipients.findOne({
      id: delivery.recipient_id,
      alert_id: delivery.alert_id,
      user_id: delivery.user_id,
      channel: delivery.channel,
      enabled: true,
    });
    return alert && recipient ? alert : undefined;
  };
  const skip = (reason: string) =>
    deliveries.update({ id: delivery.id }, { outcome: "skipped", reason });
  const alert = await eligible();
  if (!alert) {
    await skip("Alert or recipient changed or was disabled");
    return;
  }
  const definition = options.types[delivery.definition.type];
  const channel = options.channels[delivery.channel];
  if (!definition || !channel)
    throw new Error("Alert type or channel is no longer configured");
  const { clientDb } = await getClientDBHandlers(
    { userId: delivery.user_id },
    definition.permissionScope?.(delivery.user_id),
  );
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: alert.schedule.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const date = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  signal.throwIfAborted();
  const message = await definition.prepare({
    clientDb,
    params: delivery.definition.params,
    recipientId: delivery.user_id,
    localDate: `${date.year}-${date.month}-${date.day}`,
    signal,
  });
  if (!message) {
    await skip("No matching items");
    return;
  }
  signal.throwIfAborted();
  if (!(await eligible())) {
    await skip("Alert or recipient changed or was disabled");
    return;
  }
  const result = await channel.send({
    recipientId: delivery.user_id,
    message,
    idempotencyKey: delivery.id,
    signal,
  });
  await deliveries.update(
    { id: delivery.id },
    { outcome: "sent", provider_id: result.providerId },
  );
};
