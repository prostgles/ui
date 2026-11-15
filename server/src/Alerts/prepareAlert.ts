import type { GetClientDBHandlers } from "prostgles-server";
import type { AlertsOptions } from "./AlertTypes";
import type { AlertSchema } from "./getAlertTables";
import { prepareQueryAlert } from "./prepareQueryAlert";

export const prepareAlert = async ({
  options,
  alert,
  recipientId,
  getClientDBHandlers,
  signal,
  filterRows,
}: {
  options: AlertsOptions;
  alert: Pick<
    Required<AlertSchema["alerts"]["columns"]>,
    "definition" | "config_key" | "schedule"
  >;
  recipientId: string;
  getClientDBHandlers: GetClientDBHandlers;
  signal: AbortSignal;
  filterRows: Parameters<typeof prepareQueryAlert>[2];
}) => {
  const { clientDb } = await getClientDBHandlers(
    { userId: recipientId },
    undefined,
  );
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZone: alert.schedule.timezone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const date = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  signal.throwIfAborted();
  const context = {
    clientDb,
    recipientId,
    localDate: `${date.year}-${date.month}-${date.day}`,
    signal,
  };
  if (alert.definition) {
    return prepareQueryAlert(alert.definition, context, filterRows);
  }
  const configuredAlert =
    alert.config_key ? options.rules?.[alert.config_key] : undefined;
  if (!configuredAlert || !("prepare" in configuredAlert))
    throw new Error("Alert prepare callback is no longer configured");
  return configuredAlert.prepare(context);
};
