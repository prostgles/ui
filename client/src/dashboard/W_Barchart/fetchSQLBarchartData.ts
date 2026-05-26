import type { SQLHandler } from "prostgles-types";
import type { LinkSyncItem } from "../Dashboard/dashboardUtils";

export const fetchSQLBarchartData = async (
  sql: SQLHandler,
  linkOpts: Extract<LinkSyncItem["options"], { type: "barchart" }>,
) => {};
