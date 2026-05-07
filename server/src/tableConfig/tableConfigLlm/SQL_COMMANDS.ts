import { SQL_COMMANDS } from "@common/mcp/SQL_COMMANDS";
import type { Statement } from "pgsql-ast-parser";
import { getKeys } from "prostgles-types";

const SQL_COMMANDS_VALIDATED = SQL_COMMANDS satisfies Record<
  Statement["type"],
  1
>;

const SQL_COMMAND_GROUPS = {
  select: ["select", "with", "with recursive"],
  insert: ["insert"],
  update: ["update"],
  delete: ["delete"],
};

export const SQL_COMMANDS_ARRAY = getKeys(SQL_COMMANDS);
