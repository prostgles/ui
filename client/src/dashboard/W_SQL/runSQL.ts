import type { SQLResult } from "prostgles-client/dist/prostgles";
import type {
  SQLHandler,
  SQLResultInfo,
  SocketSQLStreamHandlers,
} from "prostgles-types";
import type { WindowData } from "../Dashboard/dashboardUtils";
import { STARTING_KEYWORDS } from "../SQLEditor/SQLCompletion/CommonMatchImports";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";
import type { W_SQL_ActiveQuery, W_SQLState } from "./W_SQL";
import type { W_SQL } from "./W_SQL";
import { SQL_NOT_ALLOWED } from "./W_SQL";
import { parseSQLError } from "./parseSQLError";
import { getFieldsWithActions, parseSqlResultCols } from "./parseSqlResultCols";
import { parseExplainResult } from "./parseExplainResult";

export async function runSQL(this: W_SQL, sort: ColumnSort[] = []) {
  const { activeQuery } = this.state;
  if (activeQuery?.state === "running") {
    alert("Must stop active query first");
    return;
  }

  const selected_sql =
    this.sqlRef?.getSelectedText() ||
    (await this.sqlRef?.getCurrentCodeBlock())?.text;
  const sql = selected_sql || this.d.w?.sql || "";
  const { db } = this.props.prgl;
  const w = this.d.w;
  if (w && w.selected_sql !== selected_sql) {
    w.$update({ selected_sql });
  }

  if (!w || !db.sql) {
    this.setState({
      error:
        !db.sql ? SQL_NOT_ALLOWED : (
          "Internal error (w is missing). Try refreshing the page"
        ),
    });
    return;
  }

  this.props.childWindows.forEach((cw) => {
    if (!cw.minimised && (cw.type === "map" || cw.type === "timechart")) {
      cw.$update({ minimised: true });
    }
  });

  let trimmedSql = sql.trimEnd();

  let isSelect: boolean | undefined;

  const _query = `${sql}`
    .trim()
    .toLowerCase()
    .split("\n")
    .filter(
      (v, i) => i || !(v.trim().startsWith("/*") && v.trim().endsWith("*/")),
    ) /* Ignore psql top comments */
    .map((v) => v.split("--")[0])
    .join("\n")
    .trim();
  const knownCommands = STARTING_KEYWORDS.map((k) => k.toLowerCase());
  const firstCommand = knownCommands.find(
    (c) => _query === c || _query.startsWith(c),
  );
  if (firstCommand) {
    isSelect =
      firstCommand === "select" &&
      !_query.slice(0, -1).includes(";") &&
      !_query.replaceAll("\n", " ").includes(" into ");
  }

  if (isSelect && trimmedSql.endsWith(";"))
    trimmedSql = trimmedSql.slice(0, -1);

  this.hashedSQL = sql;

  let notifEventSub: W_SQLState["notifEventSub"];

  this.state.notifEventSub?.removeListener();

  try {
    /* Show table automatically after running a query */
    const o: WindowData<"sql">["options"] = w.options;

    if (o.hideTable) w.$update({ options: { ...o, hideTable: false } });

    const limit = w.limit === null ? null : w.limit || 100;

    let sqlSorted = trimmedSql;
    if (isSelect && sort.length) {
      try {
        /**
         * Test for errors first to ensure the wrapped LIMIT/ORDER BY does not introduce unrelated errors
         *  TODO: Better option to check for errors BUT need to Ensure the query ends with a ";"
         *    this.hashedSQL = `DO $SYNTAX_CHECK$ BEGIN RETURN; \n ${_sqlLimited} \nEND; $SYNTAX_CHECK$;`
         */
        this.hashedSQL = `EXPLAIN ${sqlSorted}`;
        await db.sql(this.hashedSQL);
        this.hashedSQL = ` SELECT * FROM (\n ${sqlSorted} \n ) t LIMIT 0`;
        const { fields } = await db.sql(
          this.hashedSQL,
          {},
          { returnType: "default-with-rollback" },
        );

        const orderBy =
          sort
            .filter((s) => fields[s.key])
            .map(
              (s) =>
                `${(s.key as number) + 1}` +
                ([1, true].includes(s.asc as any) ? " ASC " : " DESC "),
            )
            .join(", ") || " TRUE::BOOLEAN ";

        await db.sql(
          ` SELECT * FROM (\n ${sqlSorted} \n ) t ORDER BY ${orderBy} LIMIT 0`,
        );
        sqlSorted = ` SELECT * FROM (\n ${sqlSorted} \n ) t ORDER BY ${orderBy}`;
      } catch (error) {
        sqlSorted = trimmedSql;
        w.$update({ sort: [] });
      }
    }
    this._queryHashAlias =
      `--prostgles-` + hashFnv32a(sqlSorted + Date.now(), true);
    this.hashedSQL = this._queryHashAlias + " \n" + sqlSorted;
    let rowCount: number | undefined;
    let totalRowCount: number | undefined;
    const hashedSQL = this.hashedSQL;
    const setRunningQuery = (extra?: {
      handler: SocketSQLStreamHandlers | undefined;
    }) => {
      this.streamData.set({ rows: [] });
      this.setState({
        rows: undefined,
        cols: undefined,
        sqlResult: false,
        page: 0,
        ...extra,
        sort: sqlSorted !== trimmedSql ? sort : [],
        activeQuery: {
          pid: extra?.handler?.pid ?? this.state.handler?.pid ?? -1,
          state: "running",
          trimmedSql,
          started: new Date(),
          hashedSQL,
        },
      });
    };

    if (this.state.handler) {
      setRunningQuery();
      await this.state.handler.run(hashedSQL);
      return;
    }

    let fields: SQLResult<"stream">["fields"] | undefined = undefined;
    let info: SQLResultInfo | undefined = undefined;
    let rows: any[] = [];
    const stream = await db.sql(hashedSQL, undefined, {
      returnType: "stream",
      persistStreamConnection: true,
      hasParams: false,
      streamLimit: limit || undefined,
    });
    const handler = await stream.start(async (packet) => {
      const runningQuery =
        this.state.activeQuery?.state === "running" ?
          this.state.activeQuery
        : undefined;
      if (!runningQuery && packet.type !== "error") {
        if (w.$get()?.closed) {
          handler.stop();
        } else {
          console.error(this.state.activeQuery, sql, packet);
          alert("Something went wrong: No running query found");
        }
        return;
      }
      const defaultRunningQuery = {
        trimmedSql: "",
        state: "running",
        started: new Date(),
        hashedSQL: "",
      };
      const { trimmedSql, hashedSQL } = runningQuery ?? defaultRunningQuery;
      if (packet.type === "error") {
        this.state.handler?.stop();
        const sqlError = await parseSQLError.bind(this)({
          sql: trimmedSql,
          err: packet.error,
          trimmedSql,
        });
        this.setState({
          handler: undefined,
          queryEnded: Date.now(),
          activeQuery: {
            pid: handler.pid,
            ...(runningQuery ?? defaultRunningQuery),
            state: "error",
            error: sqlError,
            ended: new Date(),
          },
        });
        w.$update({ options: { sqlResultCols: [] } }, { deepMerge: true });
      } else {
        rowCount ??= 0;
        rowCount += packet.rows.length;
        if (packet.info) info = packet.info;
        rows.push(...packet.rows);
        this.streamData.set({ rows });

        /**
         * First and last packets contain fields and info.command
         */
        if (packet.fields) fields = packet.fields;
        if (fields || packet.ended) {
          let cols: typeof this.state.cols | undefined = this.state.cols;

          /* For WITH command must wait for response command to work out if it's a SELECT  */
          isSelect = isSelect || packet.info?.command === "SELECT";
          if (packet.info?.command) {
            const commandResultIsSelect = packet.info.command === "SELECT";
            if (isSelect !== commandResultIsSelect) {
              isSelect = commandResultIsSelect;
              w.$update(
                { options: { lastSQL: isSelect ? trimmedSql : "" } },
                { deepMerge: true },
              );
            }
          }

          if (fields) {
            cols = parseSqlResultCols.bind(this)({
              fields,
              isSelect,
              rows: packet.rows,
              sql,
              trimmedSql,
            });
          }

          this.setState({
            rows,
            ...(cols ? { cols } : {}),
            loading: false,
            onRowClick: null,
            sql,
            isSelect,
            notifEventSub,
            sqlResult: true,
          });
          if (packet.ended) {
            if (packet.info?.command === "LISTEN") {
              const sqlRes = await db.sql!(hashedSQL, undefined, {
                returnType: "arrayMode",
                allowListen: true,
                hasParams: false,
              });

              if ("addListener" in sqlRes) {
                const fieldType = {
                  dataType: "json",
                  udt_name: "json",
                  tsDataType: "any",
                };

                this.setState({
                  cols: getFieldsWithActions(
                    [
                      { ...fieldType, name: "payload" },
                      { ...fieldType, name: "received" },
                    ],
                    isSelect,
                  ),
                  rows: [],
                  activeQuery: undefined,
                  notifEventSub: await sqlRes.addListener((ev) => {
                    console.log(ev);
                    return this.notifEventListener(ev);
                  }),
                });
                return;
              }
            }

            const queriesNotPickedUpBySchemaWatchEventTrigger = [
              "create database ",
              "drop database ",
              "alter database ",
              "drop database if exists ",
              "create user ",
              "drop user ",
              "alter user ",
              "drop user if exists ",
              "create user if exists ",
              "alter user if exists ",
            ];
            if (
              queriesNotPickedUpBySchemaWatchEventTrigger.some((query) =>
                trimmedSql.toLowerCase().replace(/\s\s+/g, " ").includes(query),
              )
            ) {
              this.props.suggestions?.onRenew();
            }

            let commandResult = "";
            if (!fields?.length && packet.info) {
              commandResult =
                `${packet.info.command} command finished successfully! ` +
                (Number.isFinite(packet.info.rowCount) ?
                  ` ${packet.info.rowCount || 0} rows affected`
                : "");
            }

            const activeQuery = {
              pid: handler.pid,
              ...(runningQuery ?? defaultRunningQuery),
              state: "ended",
              ended: new Date(),
              commandResult,
              rowCount,
              totalRowCount,
              info: packet.info,
            } satisfies Required<W_SQLState>["activeQuery"];
            const newColsAndRows = parseExplainResult({
              rows,
              cols,
              activeQuery,
            });
            activeQuery.totalRowCount = await getTotalRowCount(
              db.sql!,
              activeQuery,
              limit,
              isSelect,
            );

            this.setState({
              queryEnded: Date.now(),
              activeQuery,
              ...newColsAndRows,
            });

            rowCount = undefined;
            fields = undefined;
            info = undefined;
            rows = [];
          }
        }
      }
    });
    setRunningQuery({ handler });
  } catch (err: any) {
    const started = this.state.activeQuery?.started || new Date();
    this.state.handler?.stop();
    this.setState({
      isSelect: false,
      notifEventSub: undefined,
      activeQuery: {
        pid: undefined,
        started,
        hashedSQL: this.hashedSQL,
        trimmedSql,
        state: "error",
        ended: new Date(),
        error: await parseSQLError.bind(this)({ sql, err, trimmedSql }),
      },
      rows: [],
      cols: [],
      handler: undefined,
      sort: [],
      queryEnded: Date.now(),
      sqlResult: false,
    });
    w.$update({ options: { sqlResultCols: [] } }, { deepMerge: true });
  }
}

const getTotalRowCount = async (
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

export const parseError = (err: any) => {
  if (typeof err === "string") {
    return { message: err };
  }

  return err;
};

function hashFnv32a(str, asString, seed?) {
  /*jshint bitwise:false */
  let i,
    l,
    hval = seed === undefined ? 0x811c9dc5 : seed;

  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval +=
      (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  if (asString) {
    // Convert to 8 digit hex string
    return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
  }
  return hval >>> 0;
}
