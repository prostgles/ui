import { isEmpty } from "src/utils/utils";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { DatabaseAccessEditorProps } from "./DatabaseAccessEditor";

export type TableSchemaDriftState = ReturnType<typeof getTableSchemaDriftState>;

export const getTableSchemaDriftState = (
  existingTable: DBSchemaTableWJoins | undefined,
  newTable: NonNullable<DatabaseAccessEditorProps["newTables"]>[number],
  ddl: string,
) => {
  if (!existingTable) {
    return { state: "new", ddl } as const;
  }
  const columnDriftDdl: Record<string, string[]> = {};
  existingTable.columns.forEach((ec) => {
    const nc = newTable.columns.find((c) => c.name === ec.name);
    if (!nc) {
      columnDriftDdl[ec.name] = [`DROP COLUMN ${ec.name}`];
      return;
    }

    if (nc.dataType !== ec.udt_name) {
      columnDriftDdl[ec.name] = [
        `ALTER COLUMN ${ec.name} TYPE ${nc.dataType}`,
        `ALTER COLUMN ${ec.name} SET DATA TYPE ${nc.dataType}`,
      ];
    }
    if (Boolean(nc.nullable) !== Boolean(ec.is_nullable)) {
      columnDriftDdl[ec.name] = [
        ...(columnDriftDdl[ec.name] ?? []),
        nc.nullable ?
          `ALTER COLUMN ${ec.name} DROP NOT NULL`
        : `ALTER COLUMN ${ec.name} SET NOT NULL`,
      ];
    }
  });

  newTable.columns.forEach((nc) => {
    const ec = existingTable.columns.find((c) => c.name === nc.name);
    if (!ec) {
      columnDriftDdl[nc.name] = [
        `ADD COLUMN ${nc.name} ${nc.dataType} ${
          nc.isPrimaryKey ? "PRIMARY KEY"
          : nc.nullable ? ""
          : "NOT NULL"
        }`,
      ];
    }
  });

  if (isEmpty(columnDriftDdl)) {
    return { state: "matches", ddl } as const;
  }
  return {
    state: "drifted" as const,
    ddl,
    patchDdl: `ALTER TABLE ${existingTable.name}\n${Object.values(
      columnDriftDdl,
    )
      .flat()
      .map((s) => `  ${s}`)
      .join(",\n")};`,
  } as const;
};
