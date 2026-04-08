import { connectionManager } from "@src/index";
import type { McpCallContext } from "../ProstglesMCPServerTypes";

export const getExistingTablesSchema = async (
  tableNames: string[] | undefined,
  { chat, connection_id, clientReq }: McpCallContext,
) => {
  const { db_schema_permissions, db_data_permissions } = chat;

  const connection =
    connectionManager.getConnectionStartedInstance(connection_id);
  const connectionData = connection.con;
  const {
    clientSchema: { tableSchema },
    clientSql,
  } = await connection.prgl.getClientDBHandlers(clientReq, {
    allowSql: true,
  });
  const definitions = await (async () => {
    const schemas = Object.entries(
      connectionData.db_schema_filter || { public: 1 },
    )
      .filter(([k, v]) => v)
      .map(([k, v]) => k);
    if (!schemas.includes("public")) {
      schemas.push("public");
    }
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

    const tableConstraints = (await clientSql(
      query,
      { schemas },
      { returnType: "rows" },
    )) as {
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

    const viewDefinitions = (await clientSql(
      `
      SELECT 
        regclass(table_schema|| '.' ||table_name  )::OID as oid, 
        table_name, 
        view_definition 
      FROM information_schema.views 
      WHERE table_schema IN (\${schemas:csv})`,
      { schemas },
      { returnType: "rows" },
    )) as { oid: number; table_name: string; view_definition: string }[];

    return { tableConstraints, viewDefinitions };
  })();

  if (!db_schema_permissions || db_schema_permissions.type === "None") {
    throw new Error("User does not have permissions to view database schema");
  }

  if (
    (db_schema_permissions.type === "OnRequest" ||
      db_schema_permissions.type === "Full") &&
    tableNames
  ) {
    const allTables = tableSchema.map((t) => t.name);
    const invalidTableNames = tableNames.filter((t) => !allTables.includes(t));
    if (invalidTableNames.length > 0) {
      throw new Error(
        `The following requested tables do not exist or are not accessible: ${invalidTableNames.join(", ")}`,
      );
    }
  }

  const allowedTables =
    db_schema_permissions.type === "Full" ?
      tableSchema
    : tableSchema.filter((t) => {
        if (db_schema_permissions.type === "OnRequest") {
          return !tableNames || tableNames.includes(t.name);
        }
        if (db_schema_permissions.type === "SameAsData") {
          if (!db_data_permissions) {
            return false;
          }
          if (db_data_permissions.mode === "custom") {
            const tableRule = db_data_permissions.tablePermissions[t.name];
            return (
              tableRule?.delete ||
              tableRule?.insert ||
              tableRule?.select ||
              tableRule?.update
            );
          }
          return true;
        }
        return db_schema_permissions.tables.some(
          (allowedTableName) => allowedTableName === t.name,
        );
      });
  const { tableConstraints, viewDefinitions } = definitions;
  const viewDefinitonsMap = new Map(
    viewDefinitions.map((v) => [v.oid.toString(), v.view_definition]),
  );
  const res = allowedTables
    .map((t) => {
      const viewDefinition = viewDefinitonsMap.get(t.oid.toString());
      if (viewDefinition) {
        return {
          query: `CREATE VIEW ${t.name} AS ${viewDefinition}`,
          constraints: [],
        };
      }

      const constraints = tableConstraints.filter((c) => c.table_oid === t.oid);

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
          /** Hacky. TODO: Must improve schema info */
          const serialDataType =
            c.is_pkey && c.has_default && !c.column_default ?
              c.udt_name === "int4" ? "SERIAL"
              : c.udt_name === "int8" ? "BIGSERIAL"
              : ""
            : "";

          const dataTypeWIthPrecision =
            serialDataType || `${c.udt_name}${dataTypePrecisionInfo}`;
          return [
            `  ${addDoubleQuotesIfNeeded(c.name)} ${dataTypeWIthPrecision}`,
            c.is_pkey && singlePkeyColPositions.has(c.ordinal_position) ?
              "PRIMARY KEY"
            : "",
            !c.is_pkey && !c.is_nullable ? "NOT NULL" : "",
            !c.is_pkey && c.has_default ? `DEFAULT ${c.column_default}` : "",
            c.is_generated ? "GENERATED" : "",
          ]
            .filter((v) => v)
            .join(" ");
        })
        .concat(
          constraints
            .filter((c) => !singlePkeyConstraints.has(c.conname))
            .map((c) => `  CONSTRAINT ${c.escaped_conname} ${c.definition}`),
        )
        .join(",\n");
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
};

const addDoubleQuotesIfNeeded = (name: string) => {
  const identifierRegex = /^[a-z_][a-z0-9_]*$/;
  const needsDoubleQuotes = !identifierRegex.test(name);
  return needsDoubleQuotes ? JSON.stringify(name) : name;
};
