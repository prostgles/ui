import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useMemo } from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { DatabaseAccessEditorProps } from "./DatabaseAccessEditor";
import {
  getTableSchemaDriftState,
  type TableSchemaDriftState,
} from "./getTableSchemaDriftState";

const NEW_OBJECT_OID = -1;

export type TableSchemaWithDriftState = DBSchemaTableWJoins & {
  ddlState: TableSchemaDriftState | undefined;
};

export const useDatabaseAccessEditorTables = ({
  value,
  newTables,
}: Pick<DatabaseAccessEditorProps, "newTables"> & {
  value: Extract<DatabaseAccessEditorProps["value"], { mode: "custom" }>;
}) => {
  const { tables } = usePrgl();
  const newTablesDdl = value.ddlStatements ?? "";
  return useMemo(() => {
    const updatedTables = tables.map((t) => {
      const newTable = newTables?.find((nt) => nt.name === t.name);
      return {
        ...t,
        ddlState:
          newTable && getTableSchemaDriftState(t, newTable, newTablesDdl),
      };
    });
    return [
      ...updatedTables,
      ...(newTables
        ?.filter((nt) => !tables.some((t) => t.name === nt.name))
        .map((t) => ({
          isCitationTable: false,
          oid: NEW_OBJECT_OID,
          isView: false,
          joins: [],
          joinsV2: [],
          publishInfo: {},
          label: t.name,
          name: t.name,
          qualifiedNameParts: {
            schema: t.schema ?? "",
            name: t.name,
          },
          ddlState: getTableSchemaDriftState(
            tables.find((et) => et.name === t.name),
            t,
            newTablesDdl,
          ),
          columns: t.columns.map(({ name, dataType }) => ({
            oid: NEW_OBJECT_OID,
            name,
            label: name,
            comment: "",
            icon: undefined,
            delete: true,
            ordinal_position: -1,
            is_nullable: true,
            is_updatable: true,
            is_generated: true,
            udt_name: "text",
            data_type: dataType,
            tsDataType: "string",
            element_type: undefined,
            element_udt_name: undefined,
            is_pkey: false,
            has_default: false,
            select: true,
            insert: true,
            update: true,
            orderBy: true,
            filter: true,
          })),
        })) ?? []),
    ].toSorted((a, b) => {
      const aRule = value.tablePermissions[a.name];
      const bRule = value.tablePermissions[b.name];
      /** Bring tables with rules first */
      if (aRule && !bRule) return -1;
      if (!aRule && bRule) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [newTables, newTablesDdl, tables, value.tablePermissions]);
};
