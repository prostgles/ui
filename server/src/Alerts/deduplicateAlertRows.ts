import { createHash } from "node:crypto";
import type { DBHandlerServer } from "prostgles-server";
import type { AlertQueryDefinition } from "./alertQuerySchema";
import type { AlertsOptions } from "./AlertTypes";
import { getAlertDb, type AlertSchema } from "./getAlertTables";

export const deduplicateAlertRows = async (
  dbo: DBHandlerServer,
  options: AlertsOptions,
  jobsTableName: string,
  delivery: Required<AlertSchema["deliveries"]["columns"]>,
  deduplicate: AlertQueryDefinition["deduplicate"],
  rows: Record<string, unknown>[],
) => {
  if (!deduplicate) return rows;
  const durationMs = getAlertDeduplicationMs(deduplicate);
  const keyedRows = rows.map((row) => ({
    row,
    key: createHash("sha256")
      .update(
        JSON.stringify(
          deduplicate.key.map((column) => {
            const value = Object.hasOwn(row, column) ? row[column] : undefined;
            if (
              typeof value !== "string" &&
              typeof value !== "boolean" &&
              !(typeof value === "number" && Number.isFinite(value))
            ) {
              throw new Error(
                `Alert deduplication key requires a selected, non-null scalar column: ${column}`,
              );
            }
            return [column, value];
          }),
        ),
      )
      .digest("hex"),
  }));
  return dbo.tx(async (dbx) => {
    const { alerts, deliveries } = getAlertDb(dbx, options);
    /* Serialize key claims across workers. Release the lock before contacting a channel. */
    await alerts.findOne(
      { id: delivery.alert_id },
      { select: "", forUpdate: true },
    );
    const overlappingDeliveries = await deliveries.find(
      {
        $and: [
          {
            alert_id: delivery.alert_id,
            user_id: delivery.user_id,
            channel: delivery.channel,
            is_test: false,
            id: { $ne: delivery.id },
            deduplication_keys: { $ne: null },
          },
          {
            deduplication_keys: {
              $overlaps: keyedRows.map(({ key }) => key),
            },
          },
          {
            $or: [
              {
                outcome: "sent",
                sent_at: {
                  $gt: new Date(Date.now() - durationMs).toISOString(),
                },
              },
              {
                outcome: "pending",
                $existsJoined: {
                  path: [jobsTableName],
                  filter: { status: { $in: ["pending", "running"] } },
                },
              },
            ],
          },
        ],
      },
      { select: ["deduplication_keys"], limit: null },
    );
    const suppressedKeys = new Set(
      overlappingDeliveries.flatMap(
        ({ deduplication_keys }) => deduplication_keys ?? [],
      ),
    );
    /* Retries keep their original items, rechecking both permissions and suppression. */
    const reservedKeys =
      delivery.deduplication_keys && new Set(delivery.deduplication_keys);
    const included = keyedRows.filter(({ key }) => {
      if (suppressedKeys.has(key) || (reservedKeys && !reservedKeys.has(key)))
        return false;
      suppressedKeys.add(key);
      return true;
    });
    await deliveries.update(
      { id: delivery.id },
      { deduplication_keys: included.map(({ key }) => key) },
    );
    return included.map(({ row }) => row);
  });
};

export const getAlertDeduplicationMs = (
  deduplicate: NonNullable<AlertQueryDefinition["deduplicate"]>,
) => {
  if (
    !deduplicate.key.length ||
    deduplicate.key.some((column) => !column.trim()) ||
    new Set(deduplicate.key).size !== deduplicate.key.length
  ) {
    throw new Error(
      "Alert deduplication requires distinct, non-empty key columns",
    );
  }
  const units: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  const match = /^([1-9]\d*)(s|m|h|d|w)$/.exec(deduplicate.for);
  const durationMs = match ? Number(match[1]) * units[match[2]!]! : NaN;
  if (!Number.isSafeInteger(durationMs) || durationMs > 8.64e15) {
    throw new Error(
      "Alert deduplicate.for requires a positive duration such as 30m, 24h or 7d",
    );
  }
  return durationMs;
};
