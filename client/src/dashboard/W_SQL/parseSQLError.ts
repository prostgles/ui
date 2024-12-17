import { getMonaco } from "../SQLEditor/SQLEditor";
import type { W_SQL } from "./W_SQL";
import { parseError } from "./runSQL";
import { runSQLErrorHints } from "./runSQLErrorHints";

export const parseSQLError = async function (
  this: W_SQL,
  {
    sql,
    err: rawErr,
    trimmedSql,
  }: { sql: string; trimmedSql: string; err: any },
) {
  const { MarkerSeverity } = await getMonaco();
  const {
    prgl: { db },
  } = this.props;
  const err = parseError(rawErr);
  let message: string = err?.message;
  const hint = await runSQLErrorHints(
    err,
    this.props.suggestions?.suggestions,
    db.sql!,
    trimmedSql,
  );
  if (hint) {
    message = hint;
  } else {
    const { hint, detail, where } = err || {};
    message +=
      (hint ? " \n " + hint : "") +
      (detail ? " \n " + detail : "") +
      (where ? " \n where: " + where : "");
  }

  /** Ensure error starts from the correct offset due to added query id string */
  const startOffset = (this.hashedSQL || "").indexOf(
    sql.trimEnd().slice(0, -1),
  );
  const rawPosition = +err?.position || 0;
  const position = Math.max(0, rawPosition - startOffset);
  const maxLen = 1e5; //sql.length - position;
  const length = Math.max(
    maxLen,
    err?.position ? +err?.length : sql.trimEnd().length,
  );

  return {
    code: err?.code || "",
    message,
    severity: MarkerSeverity.Error,
    position,
    length,
  };
};
