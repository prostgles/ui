import {
  getJSONBSchemaValidationError,
  type JSONB,
  type SelectParams,
} from "prostgles-types";
import { parseDetailedFilter } from "@common/detailedFilterSchema";
import { getFinalFilter } from "@common/filterUtils";
import type { AlertContext, AlertMessage } from "./AlertTypes";
import { alertQuerySchema } from "./alertQuerySchema";
import { renderEmailText } from "../Emails/renderEmailText";
import { getAlertDeduplicationMs } from "./deduplicateAlertRows";

export const prepareQueryAlert = async (
  rule: JSONB.GetType<typeof alertQuerySchema>,
  { clientDb, recipientId, localDate, signal }: AlertContext,
  filterRows: (
    rows: Record<string, unknown>[],
  ) => Promise<Record<string, unknown>[]>,
): Promise<AlertMessage | null> => {
  validateAlertQuery(rule);
  const inputs = { recipientId, localDate };
  const { table, filter, having, ...selectParams } = rule.query;
  signal.throwIfAborted();
  const handler = Object.hasOwn(clientDb, table) ? clientDb[table] : undefined;
  if (!handler?.find) {
    throw new Error(`Alert query cannot read ${table}`);
  }
  /* Only find is exposed. Permission checks also cover joined tables and selected fields. */
  const queryRows = await handler.find(
    getFinalFilter(parseDetailedFilter(filter)),
    {
      limit: null,
      ...(selectParams as SelectParams),
      ...(having && {
        having: getFinalFilter(parseDetailedFilter(having)),
      }),
    },
  );
  signal.throwIfAborted();
  const rows = await filterRows(queryRows);
  if (!rows.length) return null;
  const data = Object.fromEntries(
    Object.entries(rule.template.data).map(([name, binding]) => [
      name,
      rows
        .map((row) =>
          renderEmailText(binding.text, row, false, binding.nullText),
        )
        .join(binding.separator),
    ]),
  );
  const values = { ...inputs, rows, data };
  return {
    title: renderEmailText(rule.template.title, values),
    body: renderEmailText(rule.template.body, values),
  };
};

export const validateAlertQuery = (
  rule: JSONB.GetType<typeof alertQuerySchema>,
) => {
  const { error } = getJSONBSchemaValidationError(alertQuerySchema, rule);
  if (error) throw new Error(`Invalid alert rule: ${error}`);
  parseDetailedFilter(rule.query.filter);
  if (rule.query.having) parseDetailedFilter(rule.query.having);
  if (rule.deduplicate) getAlertDeduplicationMs(rule.deduplicate);
};
