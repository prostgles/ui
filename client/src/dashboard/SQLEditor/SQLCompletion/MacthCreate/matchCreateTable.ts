import type { MinimalSnippet } from "../CommonMatchImports";
import { suggestSnippets } from "../CommonMatchImports";
import { getExpected } from "../getExpected";
import { getParentFunction } from "../MatchSelect";
import {
  getKind,
  type ParsedSQLSuggestion,
  type SQLMatchContext,
  type SQLMatcherResultType,
} from "../registerSuggestions";
import { suggestColumnLike } from "../suggestColumnLike";
import { suggestCondition } from "../suggestCondition";
import {
  getNewColumnDefinitions,
  PG_COLUMN_CONSTRAINTS,
  REFERENCE_CONSTRAINT_OPTIONS_KWDS,
} from "../TableKWDs";
import { type KWD, suggestKWD, withKWDs } from "../withKWDs";

export const getUserSchemaNames = (ss: ParsedSQLSuggestion[]) =>
  ss
    .filter(
      (s) =>
        s.type === "schema" &&
        s.name !== "information_schema" &&
        !s.name.startsWith("pg_"),
    )
    .map((s) => s.escapedIdentifier ?? s.escapedName ?? s.name);

export const matchCreateTable = async ({
  cb,
  ss,
  sql,
  setS,
}: SQLMatchContext): Promise<SQLMatcherResultType> => {
  const { prevLC, l2token, l1token, ltoken, thisLineLC, prevTokens } = cb;

  const insideFunc = getParentFunction(cb);
  if (insideFunc?.prevTextLC?.endsWith("generated always as")) {
    return suggestColumnLike({ cb, ss, setS, sql });
  }

  if (cb.prevTokens.some((t) => !t.nestingId && t.textLC === ")")) {
    if (!cb.currNestingId) {
      const partitionTypes = ["RANGE", "LIST", "HASH"];
      return withKWDs(
        [
          {
            kwd: "PARTITION BY",
            optional: true,
            options: partitionTypes,
          },
          ...["RANGE", "LIST", "HASH"].map(
            (kwd) =>
              ({
                kwd,
                exactlyAfter: ["PARTITION BY"],
                options: ["($column_name)"],
                excludeIf: (cb) =>
                  cb.prevTokens.some((t) =>
                    partitionTypes.some(
                      (pt) => t.nestingFuncToken?.textLC === pt.toLowerCase(),
                    ),
                  ),
              }) satisfies KWD,
          ),
          {
            kwd: "WITH",
            optional: true,
            expects: "(options)",
            options: withOptions.map((o) => o.kwd),
          },
        ],
        { cb, ss, sql, setS },
      ).getSuggestion();
    } else if (cb.currNestingFunc?.textLC === "with") {
      return withKWDs(
        withOptions.map((k) => ({
          ...k,
          expects: "=option",
          options: k.options ?? [" $number"],
        })),
        { cb, ss, sql, setS },
      ).getSuggestion();
    }
  }

  if (prevLC.endsWith("references")) {
    return getExpected("table", cb, ss);
  }

  if (ltoken?.textLC === "table") {
    const userSchemas = getUserSchemaNames(ss);
    return suggestKWD(getKind, [
      "$tableName",
      "IF NOT EXISTS",
      ...userSchemas.map((s) => `${s}.$table_name`),
    ]);
  }

  if (thisLineLC.includes("references")) {
    if (
      l2token?.textLC === "references" &&
      ltoken?.text &&
      ltoken.text === "("
    ) {
      const table_name = l1token?.text;
      return {
        suggestions: ss.filter(
          (s) =>
            s.type === "column" &&
            table_name &&
            s.escapedParentName === table_name,
        ),
      };
    }

    const refKWDs = [
      {
        kwd: "REFERENCES",
        expects: "table",
      },
      ...REFERENCE_CONSTRAINT_OPTIONS_KWDS,
    ] as const;

    /** Table provided */
    if (ltoken?.text !== "references") {
      return withKWDs(refKWDs, { cb, ss, setS, sql }).getSuggestion();
    }

    if (
      prevTokens.at(-2)?.textLC === "on" &&
      ["DELETE", "UPDATE"].includes(ltoken.text.toUpperCase())
    ) {
      //  && REF_ACTIONS.map(a => a.label.split(" ")[1]?.toLowerCase()).includes(_pwl!)

      return withKWDs(refKWDs, { cb, ss, setS, sql }).getSuggestion();
    }
  }

  const showFullColumnSamples =
    ltoken?.textLC === "," || ltoken?.textLC === "(";
  const showDataTypes =
    cb.thisLinePrevTokens.length === 1 ||
    (cb.thisLinePrevTokens.length === 2 &&
      cb.currToken?.offset === cb.thisLinePrevTokens.at(-1)?.offset);
  // console.log(cb.text, cb.offset, { showFullColumnSamples, showDataTypes, text: cb.text, offset: cb.offset, ltokentext: cb.ltoken?.text });
  if (showFullColumnSamples) {
    const snippetLines: MinimalSnippet[] = getNewColumnDefinitions(ss)
      .filter(
        ({ label: v }) => !prevTokens.some((t) => t.text === v.split(" ")[0]),
      ) // Exclude repeats
      .concat([{ label: "$column_name" }])
      .concat([
        {
          label:
            "${1:col_name} ${2:data_type} ${3:PRIMARY_KEY?} ${4:NOT NULL?} ${5:REFERENCES table_name?} ${6:CHECK(col1 > col2)?}",
        },
      ])
      .map((v) => ({ ...v, insertText: v.label, kind: getKind("column") }));
    return suggestSnippets(snippetLines);
  }

  if (showDataTypes) {
    return getExpected("dataType", cb, ss);
  }

  let snippetLines: { kwd: string; docs?: string }[] = [];
  if (cb.thisLinePrevTokens.length) {
    snippetLines = PG_COLUMN_CONSTRAINTS.filter(
      (v) => !cb.thisLineLC.includes(v.kwd.toLowerCase()),
    );
    const res = (
      await withKWDs(PG_COLUMN_CONSTRAINTS, {
        cb,
        ss,
        setS,
        sql,
      }).getSuggestion()
    ).suggestions;
    return {
      suggestions: [
        ...res,
        ...suggestSnippets(
          snippetLines
            .filter((s) => !res.some((r) => r.name === s.kwd))
            .map((k) => ({
              label: k.kwd,
              docs: k.docs,
              kind: getKind("keyword"),
            })),
        ).suggestions,
      ],
    };
  }

  if (cb.prevLC.endsWith(" default")) {
    const res = getExpected("function", cb, ss);
    return {
      suggestions: res.suggestions.map((s) => ({
        ...s,
        sortText:
          (
            cb.thisLinePrevTokens.some((t) =>
              s.funcInfo?.restype?.includes(t.textLC),
            )
          ) ?
            !s.funcInfo?.args.length ?
              "a"
            : "aa"
          : (s.sortText ?? "b"),
      })),
    };
  }

  return suggestSnippets(
    snippetLines.map((k) => ({
      label: k.kwd,
      docs: k.docs,
      kind: getKind("keyword"),
    })),
  );
};

const withOptions = [
  {
    kwd: "fillfactor",
    docs: "The fillfactor for a table is a percentage between 10 and 100. 100 (complete packing) is the default. When a smaller fillfactor is specified, INSERT operations pack table pages only to the indicated percentage; the remaining space on each page is reserved for updating rows on that page. This gives UPDATE a chance to place the updated copy of a row on the same page as the original, which is more efficient than placing it on a different page, and makes heap-only tuple updates more likely. For a table whose entries are never updated, complete packing is the best choice, but in heavily updated tables smaller fillfactors are appropriate. This parameter cannot be set for TOAST tables.",
    expects: "number",
  },
  {
    kwd: "toast_tuple_target",
    docs: "The toast_tuple_target specifies the minimum tuple length required before we try to compress and/or move long column values into TOAST tables, and is also the target length we try to reduce the length below once toasting begins. This affects columns marked as External (for move), Main (for compression), or Extended (for both) and applies only to new tuples. There is no effect on existing rows. By default this parameter is set to allow at least 4 tuples per block, which with the default block size will be 2040 bytes. Valid values are between 128 bytes and the (block size - header), by default 8160 bytes. Changing this value may not be useful for very short or very long rows. Note that the default setting is often close to optimal, and it is possible that setting this parameter could have negative effects in some cases. This parameter cannot be set for TOAST tables.",
    expects: "number",
  },
  {
    kwd: "parallel_workers",
    docs: "This sets the number of workers that should be used to assist a parallel scan of this table. If not set, the system will determine a value based on the relation size. The actual number of workers chosen by the planner or by utility statements that use parallel scans may be less, for example due to the setting of max_worker_processes.",
    expects: "number",
  },
  {
    kwd: "autovacuum_enabled",
    docs: "Enables or disables the autovacuum daemon for a particular table. If true, the autovacuum daemon will perform automatic VACUUM and/or ANALYZE operations on this table following the rules discussed in Section 25.1.6. If false, this table will not be autovacuumed, except to prevent transaction ID wraparound. See Section 25.1.5 for more about wraparound prevention. Note that the autovacuum daemon does not run at all (except to prevent transaction ID wraparound) if the autovacuum parameter is false; setting individual tables' storage parameters does not override that. Therefore there is seldom much point in explicitly setting this storage parameter to true, only to false.",
    options: ["true", "false"],
  },
  {
    kwd: "vacuum_index_cleanup",
    docs: "Forces or disables index cleanup when VACUUM is run on this table. The default value is AUTO. With OFF, index cleanup is disabled, with ON it is enabled, and with AUTO a decision is made dynamically, each time VACUUM runs. The dynamic behavior allows VACUUM to avoid needlessly scanning indexes to remove very few dead tuples. Forcibly disabling all index cleanup can speed up VACUUM very significantly, but may also lead to severely bloated indexes if table modifications are frequent. The INDEX_CLEANUP parameter of VACUUM, if specified, overrides the value of this option.",
    options: ["AUTO", "ON", "OFF"],
  },
  {
    kwd: "vacuum_truncate",
    docs: "Enables or disables vacuum to try to truncate off any empty pages at the end of this table. The default value is true. If true, VACUUM and autovacuum do the truncation and the disk space for the truncated pages is returned to the operating system. Note that the truncation requires ACCESS EXCLUSIVE lock on the table. The TRUNCATE parameter of VACUUM, if specified, overrides the value of this option.",
    options: ["true", "false"],
  },
  {
    kwd: "autovacuum_vacuum_threshold",
    docs: "Per-table value for autovacuum_vacuum_threshold parameter.",
    expects: "number",
  },
  {
    kwd: "autovacuum_vacuum_scale_factor",
    docs: "Per-table value for autovacuum_vacuum_scale_factor parameter.",
    expects: "number",
  },
  {
    kwd: "autovacuum_vacuum_insert_threshold",
    docs: "Per-table value for autovacuum_vacuum_insert_threshold parameter. The special value of -1 may be used to disable insert vacuums on the table.",
    expects: "number",
  },
  {
    kwd: "autovacuum_vacuum_insert_scale_factor",
    docs: "Per-table value for autovacuum_vacuum_insert_scale_factor parameter.",
    expects: "number",
  },
  {
    kwd: "autovacuum_analyze_threshold",
    docs: "Per-table value for autovacuum_analyze_threshold parameter.",
    expects: "number",
  },
  {
    kwd: "autovacuum_analyze_scale_factor",
    docs: "Per-table value for autovacuum_analyze_scale_factor parameter.",
    expects: "number",
  },
  {
    kwd: "autovacuum_vacuum_cost_delay",
    docs: "Per-table value for autovacuum_vacuum_cost_delay parameter.",
    expects: "number",
  },
  {
    kwd: "autovacuum_vacuum_cost_limit",
    docs: "Per-table value for autovacuum_vacuum_cost_limit parameter.",
    expects: "number",
  },
  {
    kwd: "autovacuum_freeze_min_age",
    docs: "Per-table value for vacuum_freeze_min_age parameter. Note that autovacuum will ignore per-table autovacuum_freeze_min_age parameters that are larger than half the system-wide autovacuum_freeze_max_age setting.",
    expects: "number",
  },
  {
    kwd: "autovacuum_freeze_max_age",
    docs: "Per-table value for autovacuum_freeze_max_age parameter. Note that autovacuum will ignore per-table autovacuum_freeze_max_age parameters that are larger than the system-wide setting (it can only be set smaller).",
    expects: "number",
  },
  {
    kwd: "autovacuum_freeze_table_age",
    docs: "Per-table value for vacuum_freeze_table_age parameter.",
    expects: "number",
  },
  {
    kwd: "autovacuum_multixact_freeze_min_age",
    docs: "Per-table value for vacuum_multixact_freeze_min_age parameter. Note that autovacuum will ignore per-table autovacuum_multixact_freeze_min_age parameters that are larger than half the system-wide autovacuum_multixact_freeze_max_age setting.",
    expects: "number",
  },
  {
    kwd: "autovacuum_multixact_freeze_max_age",
    docs: "Per-table value for autovacuum_multixact_freeze_max_age parameter. Note that autovacuum will ignore per-table autovacuum_multixact_freeze_max_age parameters that are larger than the system-wide setting (it can only be set smaller).",
    expects: "number",
  },
  {
    kwd: "autovacuum_multixact_freeze_table_age",
    docs: "Per-table value for vacuum_multixact_freeze_table_age parameter.",
    expects: "number",
  },
  {
    kwd: "log_autovacuum_min_duration",
    docs: "Per-table value for log_autovacuum_min_duration parameter.",
    expects: "number",
  },
  {
    kwd: "user_catalog_table",
    docs: "Declare the table as an additional catalog table for purposes of logical replication. See Section 49.6.2 for details. This parameter cannot be set for TOAST tables.",
    options: ["true", "false"],
  },
] satisfies KWD[];
