import { usePromise } from "prostgles-client/dist/react-hooks";
import { getTableRulesErrors } from "../../../../../commonTypes/publishUtils";
import { omitKeys } from "prostgles-types";
import type { TablePermissionControlsProps } from "./TablePermissionControls";

type Args = Pick<TablePermissionControlsProps, "contextData" | "table"> &
  Pick<Partial<TablePermissionControlsProps>, "tableRules">;

export const useLocalTableRulesErrors = ({
  contextData,
  table,
  tableRules,
}: Args) => {
  const localTableRulesErrors = usePromise(async () => {
    if (!table || !contextData?.user || !tableRules) return;

    const columnNames = table.columns.map((c) => c.name);
    const tableRErrs = await getTableRulesErrors(
      omitKeys(tableRules, ["tableName" as any]),
      columnNames,
      contextData,
    );
    return tableRErrs;
  }, [tableRules, table, contextData]);

  return localTableRulesErrors;
};
