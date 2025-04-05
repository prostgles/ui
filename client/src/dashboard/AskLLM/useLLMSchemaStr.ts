import { useMemoDeep, usePromise } from "prostgles-client/dist/prostgles";
import { useMemo } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";

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
    const query = `SELECT conname,
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
      conname: string;
      conkey: number[];
      definition: string;
      contype: string;
      table_name: string;
      escaped_table_name: string;
      schema: string;
    }[];

    return res;
  }, [db, connection.db_schema_filter]);

  const schemaStr = useMemo(() => {
    if (!tableConstraints || !cachedSchemaPermissions) return "";
    const allowedTables =
      cachedSchemaPermissions.type === "Full" ? tables : tables;
    // .filter((t) => {
    //     return cachedSchemaPermissions.tables?.some((l) => l.hehe === t.name);
    //   });
    const res = allowedTables
      .map((t) => {
        const constraints = tableConstraints.filter(
          (c) => c.table_name === t.name,
        );

        const colDefs = t.columns
          .sort((a, b) => a.ordinal_position - b.ordinal_position)
          .map((c) => {
            return [
              `  ${c.name} ${c.udt_name}`,
              !c.is_pkey && !c.is_nullable ? "NOT NULL" : "",
              !c.is_pkey && c.has_default ? `DEFAULT ${c.column_default}` : "",
            ]
              .filter((v) => v)
              .join(" ");
          })
          .concat(
            constraints.map((c) => `CONSTRAINT ${c.conname} ${c.definition}`),
          )
          .join(",\n ");
        return `CREATE TABLE ${t.name} (\n${colDefs}\n)`;
      })
      .join(";\n");

    return res;
  }, [tables, tableConstraints, cachedSchemaPermissions]);

  return { schemaStr };
};
