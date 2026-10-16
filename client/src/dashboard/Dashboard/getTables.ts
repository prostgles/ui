import type {
  ClientTableOptions,
  ColumnOptions,
} from "@common/managedTableSchema";
import {
  reverseJoinOn,
  type ClientJoin,
  type DBSchemaTable,
} from "prostgles-types";
import type { Prgl } from "src/App";
import { getJoinedTables } from "../W_Table/tableUtils/tableUtils";
import type { DBSchemaTablesWJoins, JoinOption } from "./dashboardUtils";

export type DBSchemaTableWithOptions = DBSchemaTable<
  ClientTableOptions,
  ColumnOptions
>;

export const getTables = (
  schemaTables: DBSchemaTableWithOptions[],
  db: Prgl["db"],
  joins: ClientJoin[] | undefined,
): { tables: DBSchemaTablesWJoins } => {
  const tables = schemaTables.map((t) => {
    const foreignKeyJoins = getJoinedTables(schemaTables, t.name, db);
    const result = {
      ...t,
      ...foreignKeyJoins,
      joinOptions:
        joins ?
          getJoinOptions(joins, t.name)
        : foreignKeyJoins.joinsV2.flatMap((join): JoinOption[] =>
            join.on.map((on) => ({
              table: join.tableName,
              on: [Object.fromEntries(on)],
              paramsSchema: undefined,
              supportsMultiHop: true,
            })),
          ),
      columns: t.columns.sort((a, b) => {
        const defaultOrder = (name: string) => {
          const index = t.defaultColumns?.indexOf(name) ?? -1;
          return index < 0 ? t.columns.length : index;
        };
        const order = defaultOrder(a.name) - defaultOrder(b.name);
        if (order) return order;
        return a.ordinal_position - b.ordinal_position;
      }),
    };
    return result;
  });
  return { tables };
};

export type DBSchemaTableWithRenderInfo = ReturnType<
  typeof getTables
>["tables"][number];

const getJoinOptions = (joins: ClientJoin[], tableName: string): JoinOption[] =>
  joins.flatMap((join) => {
    if (!join.tables.includes(tableName)) return [];
    const [left, right] = join.tables;
    const target = left === tableName ? right : left;
    if (typeof join.on === "string") {
      const option: JoinOption = {
        table: target,
        on: join.on,
        paramsSchema: join.paramsSchema,
        supportsMultiHop: join.supportsMultiHop,
      };
      return left === right ?
          [option, { ...option, reversed: true }]
        : [option];
    }
    const conditions = left === tableName ? join.on : reverseJoinOn(join.on);
    return conditions.map((on) => ({
      table: target,
      on: [on],
      paramsSchema: undefined,
      supportsMultiHop: join.supportsMultiHop,
    }));
  });
