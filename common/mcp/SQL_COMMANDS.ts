import { fromEntries } from "../utils";

export const SQL_COMMANDS = {
  "alter enum": 1,
  "alter table": 1,
  "alter index": 1,
  "alter sequence": 1,
  begin: 1,
  comment: 1,
  commit: 1,
  select: 1,
  "create composite type": 1,
  "create enum": 1,
  "create extension": 1,
  "create function": 1,
  "create index": 1,
  "create materialized view": 1,
  "create schema": 1,
  "create sequence": 1,
  "create table": 1,
  "create view": 1,
  deallocate: 1,
  delete: 1,
  do: 1,
  "drop function": 1,
  "drop index": 1,
  "drop sequence": 1,
  "drop table": 1,
  "drop trigger": 1,
  "drop type": 1,
  insert: 1,
  prepare: 1,
  "refresh materialized view": 1,
  "set names": 1,
  "set timezone": 1,
  "start transaction": 1,
  "truncate table": 1,
  "union all": 1,
  "with recursive": 1,
  raise: 1,
  rollback: 1,
  set: 1,
  show: 1,
  tablespace: 1,
  union: 1,
  update: 1,
  values: 1,
  with: 1,
} as const;

const SELECT_GROUP = ["select", "with", "with recursive"] as const;

const SQL_COMMAND_GROUPS = {
  select: ["select", "with", "with recursive"],
  insert: 1,
  update: 1,
  delete: 1,
} as const satisfies Partial<
  Record<keyof typeof SQL_COMMANDS, 1 | (keyof typeof SQL_COMMANDS)[]>
>;

const GROUPED_COMMANDS = Object.values(
  SQL_COMMAND_GROUPS,
).flat() as (keyof typeof SQL_COMMANDS)[];

const SQL_COMMANDS_TRIMED = {
  ...fromEntries(
    Object.keys(SQL_COMMANDS)
      .filter(
        (key) => !GROUPED_COMMANDS.includes(key as keyof typeof SQL_COMMANDS),
      )
      .map((key) => [key as keyof typeof SQL_COMMANDS, 1] as const),
  ),
  ...SQL_COMMAND_GROUPS,
} as const;

export const SQL_COMMANDS_ARRAY = Object.keys(SQL_COMMANDS_TRIMED) as Exclude<
  keyof typeof SQL_COMMANDS,
  (typeof SELECT_GROUP)[number]
>[];
