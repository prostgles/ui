import { useMemoDeep, usePromise } from "prostgles-client/dist/prostgles";
import type { Prgl } from "../../App";

type P = Pick<Prgl, "connection" | "db" | "tables">;
export const useLLMSchemaStr = ({ db, connection, tables }: P) => {
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

  const schemaStr = useMemoDeep(() => {
    const res = tables
      .map((t) => {
        const constraints =
          tableConstraints?.filter((c) => c.table_name === t.name) ?? [];
        return `CREATE TABLE ${t.name} (\n${t.columns
          .map((c) => {
            return [
              `  ${c.name} ${c.udt_name}`,
              c.is_pkey ? "PRIMARY KEY"
              : c.is_nullable ? ""
              : "NOT NULL",
              !c.is_pkey && c.has_default ? `DEFAULT ${c.column_default}` : "",
              c.references ?
                c.references.map((r) => `REFERENCES ${r.ftable} (${r.fcols})`)
              : "",
            ]
              .filter((v) => v)
              .join(" ");
          })
          .concat(constraints.map((con) => con.definition))
          .join(",\n ")}\n)`;
      })
      .join(";\n");

    return res;
  }, [tables, tableConstraints]);

  return { schemaStr };
};
