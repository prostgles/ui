import type { SQLHandler } from "prostgles-types";
import type { W_SQL_ActiveQuery } from "../W_SQL";

export const getQueryTotalRowCount = async (
  sql: SQLHandler,
  query: Extract<W_SQL_ActiveQuery, { state: "ended" }>,
  limit: number | string | null,
  isSelect: boolean,
) => {
  if (
    (query.info?.command !== "SELECT" && !isSelect) ||
    !limit ||
    query.rowCount < Number(limit)
  ) {
    return undefined;
  }
  const { rows } = await sql(
    ` 
      SET LOCAL statement_timeout TO 2000;
      SELECT count(*) as count 
      FROM (
        ${query.trimmedSql}
      ) t; 
    `,
    {},
    { returnType: "default-with-rollback" },
  ).catch((e) => {
    console.error("Failed to get total count", e);
    return { rows: [] };
  });

  const count = rows[0]?.count;
  const countNum = Number(count);
  if (Number.isFinite(countNum)) {
    return countNum;
  }
  return undefined;
};
