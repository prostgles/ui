import type { SQLHandler } from "prostgles-types";
import type { SQLSuggestion } from "../SQLEditor/SQLEditor";
import { isObject } from "../../../../commonTypes/publishUtils";
import { parseError } from "./runSQL";

export const runSQLErrorHints = async (
  rawErr: any,
  suggestions: SQLSuggestion[] | undefined,
  sql: SQLHandler,
  query: string,
): Promise<string | undefined> => {
  const err = parseError(rawErr);
  const message: string =
    isObject(err) ? err.message?.toLowerCase?.() : undefined;
  try {
    const where: string | undefined = err?.message;
    let hint;
    if (typeof message !== "string") {
    } else if (
      message.endsWith(" is not a function") &&
      query.toLowerCase().includes("drop function")
    ) {
      const funcName = message.split("()")[0];
      const [funcInfo] = await sql(
        `SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_name = \${funcName}`,
        { funcName },
        { returnType: "rows" },
      );
      if (funcInfo) {
        hint = `Hint: DROP ${funcInfo.routine_type} ${funcInfo.routine_name}();`;
      }
    } else if (message.startsWith("error: permission denied for schema ")) {
      const schemaName = message.split("for schema ")[1] ?? "schema_name";
      const currentPGUser =
        (await sql(`SELECT "current_user"()`, {}, { returnType: "value" })) ??
        "this_user";
      hint = `Hint: Must grant usage on schema from a more privileged account: \nGRANT USAGE ON SCHEMA ${schemaName} TO ${currentPGUser}`;
    } else if (
      where?.startsWith("PL/pgSQL function ") &&
      where.endsWith("at RAISE")
    ) {
      const funcStartKwd = " function ";
      const funcName = where.slice(
        where.indexOf(funcStartKwd) + funcStartKwd.length,
        where.indexOf("("),
      );
      const funcS = suggestions?.find(
        (s) => s.funcInfo && s.funcInfo.escaped_identifier.includes(funcName),
      );
      if (funcS?.funcInfo?.definition) {
        const lineNumKwd = " line ";
        const lineNumber = +where.slice(
          where.lastIndexOf(lineNumKwd) + lineNumKwd.length,
          where.lastIndexOf(" at RAISE"),
        );
        if (Number.isInteger(lineNumber)) {
          return (
            message +
            "\n\n" +
            where +
            ":\n\n" +
            funcS.funcInfo.definition
              .split("\n")
              .map((l, i) => `L${i + 1}     ${l}`)
              .slice(Math.max(0, lineNumber - 5), lineNumber + 5)
              .join("\n")
          );
        }
      }
    } else if (message === "error: syntax error at end of input") {
      hint = "Hint: More commands expected at end of query";
    } else if (
      message.includes(`error: cannot drop the currently open database`) ||
      (message.startsWith(`error: database "`) &&
        message.includes("is being accessed by other users") &&
        query.trim().toLowerCase().startsWith("drop database"))
    ) {
      try {
        const { server_version } = (await sql(
          "SHOW server_version;",
          {},
          { returnType: "row" },
        )) as any;
        if (server_version >= "13" || server_version.startsWith("13")) {
          hint =
            'Hint: Connect to a different database and run the command with "WITH (FORCE);"';
        } else {
          let isSameCon = true;
          try {
            const { current_database } = (await sql(
              "SELECT current_database() as current_database",
              {},
              { returnType: "row" },
            )) as any;
            isSameCon = query.includes(current_database);
          } catch (e) {}
          hint =
            "Hint: Must disconnect all users first. " +
            (isSameCon ?
              "Run the following queries from another connection (this one will be closed). "
            : "") +
            "Replace 'mydb' as required: \n\nALTER DATABASE mydb CONNECTION LIMIT 0; \n SELECT pg_terminate_backend(pid) \nFROM pg_stat_activity WHERE datname = 'mydb'; \n DROP DATABASE mydb;";
        }
      } catch (e) {}
    } else if (
      message.startsWith("error: function") &&
      message.endsWith("does not exist") &&
      err.code === "42883" &&
      suggestions
    ) {
      const errFuncDef = message.slice(16, -15);
      const errFuncName = errFuncDef.split("(")[0];
      if (errFuncName) {
        const matchingFuncs = suggestions.filter(
          (f) => f.type === "function" && f.name === errFuncName,
        );
        if (matchingFuncs.length) {
          hint =
            "Similar functions: " +
            matchingFuncs
              .map(
                (f) =>
                  `${f.escapedIdentifier}(${f.args?.map((a) => a.data_type).join(", ")})`,
              )
              .join(", ");
        } else {
          hint = "Hint: Check name or ensure the required extension is enabled";
        }
      }
    } else if (
      message.includes("type") &&
      message.match(`geometry|geography`) &&
      message.includes("does not exist")
    ) {
      hint = "Hint: Might need postgis for this: CREATE EXTENSION postgis;";
    } else if (
      message.includes("cannot be dropped because some objects depend on it")
    ) {
      hint = `Hint: Try reassigning objects: \nREASSIGN OWNED BY ${JSON.stringify(message.split('"')[1] || "your_user")} TO postgres;`;
    }

    if (hint) {
      return message + `\n\n${hint}`;
    }
  } catch (e) {
    console.error(e);
  }

  return undefined;
};
