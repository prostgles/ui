import type { JSONB } from "prostgles-types";
import { actionButtonStateSchema } from "./actionColumn";

/** A stored button state. Change methodName to expose stop/retry actions. */
export const actionColumnValueSchema = {
  methodName: { type: "string", optional: true },
  argName: { type: "string", optional: true },
  ...actionButtonStateSchema,
  details: {
    type: "string",
    optional: true,
    description: "Markdown progress or result details",
  },
} as const;

export type ActionColumnValue = JSONB.GetObjectType<
  typeof actionColumnValueSchema
>;

/**
 * Use in tableConfig.columns. The method receives primitive row fields through its sole
 * matching RowLookup/ValueLookup argument (or argName when explicitly set).
 * The optional methodName is the fallback for subsequent stored states.
 */
export const createActionColumn = (methodName?: string) =>
  ({
    nullable: true,
    defaultValue: JSON.stringify(methodName ? { methodName } : {}),
    jsonbSchema: {
      type: actionColumnValueSchema,
      defaultValue: methodName ? { methodName } : {},
    },
  }) as const;
