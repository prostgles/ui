import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { DBSSchema } from "@common/publishUtils";
import type { DBSchemaTable } from "prostgles-types";
import { getJoinedTables } from "../W_Table/tableUtils/tableUtils";
import type { DBSchemaTablesWJoins } from "./dashboardUtils";

export const getTables = (
  schemaTables: DBSchemaTable[],
  connectionTableOptions: DBSSchema["connections"]["table_options"],
  db: DBHandlerClient,
  capitaliseNames = false,
): { tables: DBSchemaTablesWJoins } => {
  const tables = schemaTables.map((t) => {
    const { columns, label, ...tableOpts } =
      connectionTableOptions?.[t.name] ?? {};
    const result = {
      ...tableOpts,
      label:
        label || (capitaliseNames ? convertSnakeToReadable(t.name) : t.name),
      ...t,
      ...getJoinedTables(schemaTables, t.name, db),
      columns: t.columns
        .map((c) => ({
          ...c,
          label: capitaliseNames ? convertSnakeToReadable(c.name) : c.name,
          icon: columns?.[c.name]?.icon,
        }))
        .sort((a, b) => {
          return a.ordinal_position - b.ordinal_position;
        }),
    };
    return result;
  });
  return { tables };
};

const convertSnakeToReadable = (str: string) => {
  // ^[a-z0-9]+    : Starts with one or more lowercase letters or digits
  // (?:_[a-z0-9]+)* : Followed by zero or more groups of an underscore and one or more lowercase letters/digits
  // $             : Ends the string
  const snakeCaseRegex = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

  if (str && snakeCaseRegex.test(str)) {
    const words = str.split("_");
    const readableWords = words.map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
    return readableWords.join(" ");
  }
  return str;
};
