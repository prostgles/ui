export const COMMANDS = [
  { cmd: "\\d", opts: "[S+]", desc: "list tables, views, and sequences" },
  {
    cmd: "\\d",
    opts: "[S+]",
    desc: "describe table, view, sequence, or index",
  },
  { cmd: "\\da", opts: "[S]", desc: "list aggregates" },
  { cmd: "\\dA", opts: "[+]", desc: "list access methods" },
  { cmd: "\\dAc", opts: "[+]", desc: "list operator classes" },
  { cmd: "\\dAf", opts: "[+]", desc: "list operator families" },
  { cmd: "\\dAo", opts: "[+]", desc: "list operators of operator families" },
  {
    cmd: "\\dAp",
    opts: "[+]",
    desc: "list support functions of operator families",
  },
  { cmd: "\\db", opts: "[+]", desc: "list tablespaces" },
  { cmd: "\\dc", opts: "[S+]", desc: "list conversions" },
  { cmd: "\\dC", opts: "[+]", desc: "list casts" },
  {
    cmd: "\\dd",
    opts: "[S]",
    desc: "show object descriptions not displayed elsewhere",
  },
  { cmd: "\\dD", opts: "[S+]", desc: "list domains" },
  { cmd: "\\ddp", desc: "list default privileges" },
  { cmd: "\\dE", opts: "[S+]", desc: "list foreign tables" },
  { cmd: "\\des", opts: "[+]", desc: "list foreign servers" },
  { cmd: "\\det", opts: "[+]", desc: "list foreign tables" },
  { cmd: "\\deu", opts: "[+]", desc: "list user mappings" },
  { cmd: "\\dew", opts: "[+]", desc: "list foreign-data wrappers" },
  {
    cmd: "\\df",
    opts: "[anptw]",
    desc: "list [only agg/normal/procedure/trigger/window]",
  },
  { cmd: "\\dF", opts: "[+]", desc: "list text search configurations" },
  { cmd: "\\dFd", opts: "[+]", desc: "list text search dictionaries" },
  { cmd: "\\dFp", opts: "[+]", desc: "list text search parsers" },
  { cmd: "\\dFt", opts: "[+]", desc: "list text search templates" },
  { cmd: "\\dg", opts: "[S+]", desc: "list roles" },
  { cmd: "\\di", opts: "[S+]", desc: "list indexes" },
  { cmd: "\\dl", desc: "list large objects, same as \\lo_list" },
  { cmd: "\\dL", opts: "[S+]", desc: "list procedural languages" },
  { cmd: "\\dm", opts: "[S+]", desc: "list materialized views" },
  { cmd: "\\dn", opts: "[S+]", desc: "list schemas" },
  { cmd: "\\do", opts: "[S+]", desc: "list operators" },
  { cmd: "\\dO", opts: "[S+]", desc: "list collations" },
  { cmd: "\\dp", desc: "list table, view, and sequence access privileges" },
  {
    cmd: "\\dP",
    opts: "[itn+]",
    desc: "list [only index/table] partitioned relations [n=nested]",
  },
  { cmd: "\\drds", desc: "list per-database role settings" },
  { cmd: "\\dRp", opts: "[+]", desc: "list replication publications" },
  { cmd: "\\dRs", opts: "[+]", desc: "list replication subscriptions" },
  { cmd: "\\ds", opts: "[S+]", desc: "list sequences" },
  { cmd: "\\dt", opts: "[S+]", desc: "list tables" },
  { cmd: "\\dT", opts: "[S+]", desc: "list data types" },
  { cmd: "\\du", opts: "[S+]", desc: "list roles" },
  { cmd: "\\dv", opts: "[S+]", desc: "list views" },
  { cmd: "\\dx", opts: "[+]", desc: "list extensions" },
  { cmd: "\\dX", desc: "list extended statistics" },
  { cmd: "\\dy", opts: "[+]", desc: "list event triggers" },
  { cmd: "\\l", opts: "[+]", desc: "list databases" },
  // { cmd: "\\sf func_name", opts: "[+]",  desc: "show a function's definition" },
  // { cmd: "\\sv view_name", opts: "[+]",  desc: "show a view's definition" },
  // { cmd: "\\z",                desc: "same as \\dp" },
] as const;

import { execSync } from "child_process";
import * as fs from "fs";
import { validateConnection } from "./connectionUtils/validateConnection";
import type { DBSConnectionInfo } from "./electronConfig";
let started = false;
export const getPSQLQueries = (con: DBSConnectionInfo) => {
  if (started) return;
  started = true;
  const c = validateConnection(con);
  const queries: { cmd: string; desc: string; query: string }[] = [];
  COMMANDS.forEach((command) => {
    /* First is empty */
    const opts = (" " + ("opts" in command ? command.opts : ""))
      .replaceAll("[", "")
      .replaceAll("]", "")
      .split("");

    opts.forEach((opt, i) => {
      const cmd = `\\${command.cmd}${opts
        .slice(0, i + 1)
        .join("")
        .trim()}`;
      if (cmd.includes("dRp+")) return;
      try {
        const queryAndResult = execSync(
          `psql 'postgres://${c.db_user}:${c.db_pass}@${c.db_host}/${c.db_name}' -w -E -c '${cmd}'`,
        ).toString();
        const query = queryAndResult
          .split("********* QUERY **********")[1]
          ?.split("**************************")[0];

        if (query) {
          queries.push({
            ...command,
            cmd,
            query,
          });
        }
        console.log(`psql ${cmd} ok`);
      } catch (err) {
        console.error(`psql ${cmd} fail:`, err);
      }
    });
  });

  fs.writeFileSync(
    __dirname + `/../../../../commonTypes/psql_queries.json`,
    JSON.stringify(queries, null, 2),
    { encoding: "utf-8" },
  );
};
