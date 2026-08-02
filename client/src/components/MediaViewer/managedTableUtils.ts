import type { citationsTableColumns } from "@common/managedTableSchema";
import type { JSONB, TS_PG_Types } from "prostgles-types";

type PgTypeToTsCategory<PgType extends string> = {
  [TsType in keyof typeof TS_PG_Types]: PgType extends (
    (typeof TS_PG_Types)[TsType][number]
  ) ?
    TsType
  : never;
}[keyof typeof TS_PG_Types];

type TsCategoryToValue<TsType> =
  TsType extends "number" ? number
  : TsType extends "string" ? string
  : TsType extends "boolean" ? boolean
  : TsType extends "number[]" ? number[]
  : TsType extends "string[]" ? string[]
  : TsType extends "boolean[]" ? boolean[]
  : TsType extends "any[]" ? unknown[]
  : unknown;

type SqlTypeToPgUdt<Sql extends string> =
  Lowercase<Sql> extends `smallint${string}` ? "int2"
  : Lowercase<Sql> extends `int${string}` | `integer${string}` ? "int4"
  : Lowercase<Sql> extends `bigint${string}` ? "int8"
  : Lowercase<Sql> extends `decimal${string}` | `numeric${string}` ? "numeric"
  : Lowercase<Sql> extends `real${string}` ? "float4"
  : Lowercase<Sql> extends `double precision${string}` ? "float8"
  : Lowercase<Sql> extends `boolean${string}` ? "bool"
  : Lowercase<Sql> extends `character varying${string}` ? "varchar"
  : Lowercase<Sql> extends `character${string}` ? "char"
  : Lowercase<Sql> extends `timestamp with time zone${string}` ? "timestamptz"
  : Lowercase<Sql> extends `timestamp${string}` ? "timestamp"
  : Lowercase<Sql> extends `date${string}` ? "date"
  : Lowercase<Sql> extends `${infer Type}[]${string}` ?
    `_${SqlTypeToPgUdt<Type>}`
  : Lowercase<Sql> extends `${infer Type} ${string}` ? SqlTypeToPgUdt<Type>
  : Lowercase<Sql>;

type IsNotNull<Sql extends string> =
  Uppercase<Sql> extends (
    `${string}NOT NULL${string}` | `${string}PRIMARY KEY${string}`
  ) ?
    true
  : false;

type PsqlTypeToTsType<Sql extends string> =
  TsCategoryToValue<PgTypeToTsCategory<SqlTypeToPgUdt<Sql>>> extends (
    infer Value
  ) ?
    IsNotNull<Sql> extends true ?
      Value
    : Value | null
  : never;

type ColumnConfig =
  | string
  | {
      sqlDefinition?: string;
      jsonbSchema?: JSONB.JSONBSchema;
      jsonbSchemaType?: JSONB.ObjectType["type"];
      [key: string]: unknown;
    };

type TableConfigType<T extends Record<string, ColumnConfig>> = {
  [Col in keyof T]: T[Col] extends string ? PsqlTypeToTsType<T[Col]>
  : T[Col] extends { sqlDefinition: string } ?
    PsqlTypeToTsType<T[Col]["sqlDefinition"]>
  : T[Col] extends { jsonbSchema: JSONB.JSONBSchema } ?
    JSONB.GetSchemaType<T[Col]["jsonbSchema"]>
  : T[Col] extends { jsonbSchemaType: JSONB.ObjectType["type"] } ?
    JSONB.GetSchemaType<{ type: T[Col]["jsonbSchemaType"] }>
  : unknown;
};

export type CitationsTableRow = TableConfigType<typeof citationsTableColumns>;
