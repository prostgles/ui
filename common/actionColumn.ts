import type { AnyObject, JSONB, ParsedJoinPath } from "prostgles-types";
import {
  getTableFilterFromDetailedGroupFilter,
  type GroupedDetailedFilter,
} from "./filterUtils";

export const ACTION_VARIANTS = ["text", "faded", "filled", "outline"] as const;
export const ACTION_COLORS = [
  "default",
  "action",
  "danger",
  "warn",
  "green",
  "indigo",
  "inherit",
  "transparent",
  "white",
] as const;
export const ACTION_PROPERTIES = [
  "text",
  "icon",
  "variant",
  "color",
  "disabledInfo",
  "isLoading",
] as const;
export type ActionProperty = (typeof ACTION_PROPERTIES)[number];

export const actionButtonStateSchema = {
  text: { type: "string", optional: true },
  icon: { type: "string", optional: true },
  variant: { enum: ACTION_VARIANTS, optional: true },
  color: { enum: ACTION_COLORS, optional: true },
  disabledInfo: { type: "string", optional: true },
  isLoading: { type: "boolean", optional: true },
} as const;

export type ActionButtonState = JSONB.GetObjectType<
  typeof actionButtonStateSchema
>;

export const actionColumnParamsSchema = {
  methodName: "string",
  argName: "string",
  joinPath: {
    optional: true,
    arrayOf: {
      type: {
        table: "string",
        on: { arrayOf: { record: { values: "string" } } },
      },
    },
  },
  conditions: {
    arrayOf: {
      type: { filter: "any", value: { type: actionButtonStateSchema } },
    },
  },
  defaultValue: { type: actionButtonStateSchema, optional: true },
} as const;

export const actionColumnsParamsSchema = {
  actions: {
    arrayOf: {
      oneOfType: [{ columnName: "string" }, actionColumnParamsSchema],
    },
  },
} as const;

export type ActionColumnsParams = JSONB.GetObjectType<
  typeof actionColumnsParamsSchema
>;

export type ActionCaseValue = {
  conditions: { filter: GroupedDetailedFilter; value: ActionButtonState }[];
  defaultValue?: ActionButtonState;
  joinPath?: ParsedJoinPath[];
};

export const getActionValueKey = (columnName: string) => `${columnName}__state`;

export const getActionCaseSelect = (
  value: ActionCaseValue,
): AnyObject | undefined => {
  const branches = value.conditions.flatMap(({ filter, value: result }) => {
    const condition = getTableFilterFromDetailedGroupFilter(filter);
    if (!Object.keys(condition).length) return [];
    return [
      [
        value.joinPath?.length ?
          { $existsJoined: { path: value.joinPath, filter: condition } }
        : condition,
        JSON.stringify(result),
      ],
    ];
  });
  // A default-only state does not need a database expression.
  if (!branches.length) return;
  return { $case: branches, $else: JSON.stringify(value.defaultValue ?? {}) };
};
