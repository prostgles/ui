import { useMemoDeep, usePromise } from "prostgles-client";
import { useMemo } from "react";
import type { DBSSchema } from "@common/publishUtils";
import type { Prgl } from "../../../App";

type P = Pick<Prgl, "connection" | "db" | "tables"> & {
  activeChat: DBSSchema["llm_chats"] | undefined;
};
export const useLLMSchemaStr = ({ db, connection, tables, activeChat }: P) => {
  const { db_schema_permissions } = activeChat ?? {};
  const cachedSchemaPermissions = useMemoDeep(
    () => db_schema_permissions || undefined,
    [db_schema_permissions],
  );

  const tableConstraints = usePromise(async () => {
    if (!db.sql) return;

    const schemas = Object.entries(connection.db_schema_filter || { public: 1 })
      .filter(([k, v]) => v)
      .map(([k, v]) => k);
    if (!schemas.includes("public")) schemas.push("public");
    const query = `SELECT  
      rel.oid as table_oid, 
      conname,
      quote_ident(conname) as escaped_conname,
      conkey ,  
      pg_get_constraintdef(c.oid) as definition, 
      contype, 
      rel.relname as table_name ,
      format('%I', rel.relname) as escaped_table_name,
      nspname as schema
      FROM pg_catalog.pg_constraint c
      INNER JOIN pg_catalog.pg_class rel
        ON rel.oid = c.conrelid
      LEFT JOIN pg_catalog.pg_class frel
        ON frel.oid = c.confrelid
      INNER JOIN pg_catalog.pg_namespace nsp
        ON nsp.oid = connamespace
      WHERE nspname IN (\${schemas:csv})
    `;

    const res = (await db.sql(query, { schemas }, { returnType: "rows" })) as {
      table_oid: number;
      conname: string;
      escaped_conname: string;
      conkey: number[];
      definition: string;
      contype: "c" | "f" | "p" | "u" | "e";
      table_name: string;
      escaped_table_name: string;
      schema: string;
    }[];

    return res;
  }, [db, connection.db_schema_filter]);

  const dbSchemaForPrompt = useMemo(() => {
    if (
      !tableConstraints ||
      !cachedSchemaPermissions ||
      cachedSchemaPermissions.type === "None"
    )
      return "";
    const allowedTables =
      cachedSchemaPermissions.type === "Full" ?
        tables
      : tables.filter((t) => {
          return cachedSchemaPermissions.tables.some(
            (allowedTableName) => allowedTableName === t.name,
          );
        });
    const res = allowedTables
      .map((t) => {
        const constraints = tableConstraints.filter(
          (c) => c.table_oid === t.info.oid,
        );

        const singlePkeyConstraints = new Set<string>();
        const singlePkeyColPositions = new Set<number>();
        constraints
          .filter((c) => c.contype === "p" && c.conkey.length === 1)
          .forEach((c) => {
            singlePkeyConstraints.add(c.conname);
            singlePkeyColPositions.add(c.conkey[0]!);
          });

        const colDefs = t.columns
          .sort((a, b) => a.ordinal_position - b.ordinal_position)
          .map((c) => {
            const dataTypePrecisionInfo =
              c.udt_name.startsWith("int") ? ""
              : c.character_maximum_length ? `(${c.character_maximum_length})`
              : c.numeric_precision ?
                `(${c.numeric_precision}${c.numeric_scale ? `, ${c.numeric_scale}` : ""})`
              : "";
            return [
              `  ${addDoubleQuotesIfNeeded(c.name)} ${c.udt_name}${dataTypePrecisionInfo}`,
              c.is_pkey && singlePkeyColPositions.has(c.ordinal_position) ?
                "PRIMARY KEY"
              : "",
              !c.is_pkey && !c.is_nullable ? "NOT NULL" : "",
              !c.is_pkey && c.has_default ? `DEFAULT ${c.column_default}` : "",
            ]
              .filter((v) => v)
              .join(" ");
          })
          .concat(
            constraints
              .filter((c) => !singlePkeyConstraints.has(c.conname))
              .map((c) => `CONSTRAINT ${c.escaped_conname} ${c.definition}`),
          )
          .join(",\n ");
        const query = `CREATE TABLE ${t.name} (\n${colDefs}\n)`;
        return {
          query,
          constraints,
        };
      })
      /** Tables will least fkeys first */
      .sort((a, b) => {
        const aFkeys = a.constraints.filter((c) => c.contype === "f");
        const bFkeys = b.constraints.filter((c) => c.contype === "f");
        return aFkeys.length - bFkeys.length;
      })
      .map((t) => t.query)
      .join(";\n");

    return res;
  }, [tables, tableConstraints, cachedSchemaPermissions]);

  return { dbSchemaForPrompt };
};

const addDoubleQuotesIfNeeded = (name: string) => {
  const identifierRegex = /^[a-z_][a-z0-9_]*$/;
  const needsDoubleQuotes = !identifierRegex.test(name);
  return needsDoubleQuotes ? JSON.stringify(name) : name;
};
