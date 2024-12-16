import PSQL_COMMANDS from "../../../../../commonTypes/psql_queries.json";
import {
  getMonaco,
  SUGGESTION_TYPE_DOCS,
  SUGGESTION_TYPES,
} from "../SQLEditor";
import { suggestSnippets } from "./CommonMatchImports";
import { getExpected } from "./getExpected";
import { asSQL, TOP_KEYWORDS } from "./KEYWORDS";
import { getParentFunction } from "./MatchSelect";
import {
  getKind,
  type MonacoSuggestion,
  type SQLMatchContext,
  type SuggestionItem,
} from "./registerSuggestions";
import { suggestColumnLike } from "./suggestColumnLike";
import { suggestCondition } from "./suggestCondition";
import { suggestTableLike } from "./suggestTableLike";
import { type KWD, suggestKWD, withKWDs } from "./withKWDs";

export const MatchFirst = async ({
  cb,
  ss,
  setS,
  sql,
}: Pick<SQLMatchContext, "cb" | "ss" | "setS" | "sql">): Promise<
  | undefined
  | {
      suggestions: SuggestionItem[];
    }
> => {
  const languages = (await getMonaco()).languages;
  const { isCommenting, prevText, currToken, l1token, ltoken, ftoken } = cb;

  if (isCommenting) {
    return { suggestions: [] };
  }
  const _suggestKWD = (vals: string[], sortText?: string) =>
    suggestKWD(getKind, vals, sortText);

  if (cb.ftoken?.textLC === "cluster") {
    return withKWDs(
      [
        { kwd: "CLUSTER", expects: "table" },
        { kwd: "USING", expects: "index" },
      ],
      { cb, ss, setS, sql },
    ).getSuggestion();
  }

  /** Suggest format function string template content */
  if (
    currToken?.type === "string.sql" &&
    cb.ltoken?.text === "(" &&
    cb.l1token?.textLC === "format"
  ) {
    const opts = {
      kind: languages.CompletionItemKind.Text,
      insertTextRules: languages.CompletionItemInsertTextRule.KeepWhitespace,
    };
    return suggestSnippets([
      {
        label: "%s",
        ...opts,
        docs: asSQL(`SELECT FORMAT('Hello %s', 'world');\n=>\n'Hello world'`),
      },
      {
        label: "%I",
        ...opts,
        docs: asSQL(
          `SELECT FORMAT('Hello %I', 'select');\n=>\n'Hello "select"`,
        ),
      },
      {
        label: "%L",
        ...opts,
        docs: asSQL(`SELECT FORMAT('Hello %L', 'world');\n=>\n'Hello 'world'`),
      },
      {
        label: "%1$s",
        ...opts,
        docs: asSQL(
          `SELECT FORMAT('%1$s apple, %2$s orange, %1$s banana', 'small', 'big');\n=>\n' small apple, big orange, small banana'`,
        ),
      },
    ]);
  }
  if (
    cb.currNestingFunc?.textLC === "to_char" &&
    currToken?.type === "string.sql"
  ) {
    const func = getParentFunction(cb);
    if (func?.prevArgs.length) {
      const opts = {
        kind: languages.CompletionItemKind.Text,
        insertTextRules: languages.CompletionItemInsertTextRule.KeepWhitespace,
      };
      return suggestSnippets(
        TO_CHAR_PATTERNS.map((p) => ({
          label: p.label,
          ...opts,
          docs: `**Timestamp Formatting**\n\n` + p.docs,
        })),
      );
    }
  }

  if (
    l1token?.text === "?" ||
    ltoken?.text === "?" ||
    currToken?.text === "?"
  ) {
    /** Wildcard search all suggestions */
    if (
      !ltoken ||
      cb.tokens.length < 2 ||
      (cb.currToken && cb.tokens.length <= 2)
    ) {
      return suggestSnippets(
        SUGGESTION_TYPES.filter((t) => !["file", "folder"].includes(t)).map(
          (label) => ({
            label,
            kind: getKind(label),
            insertText: label,
            docs: SUGGESTION_TYPE_DOCS[label] || "",
          }),
        ),
      );
    }
    const expect = ltoken.text;

    if (expect === "setting") {
      return { suggestions: setS };
    }
    return getExpected(expect, cb, ss);
  }

  if (ltoken?.type === "keyword.block.sql" && ltoken.textLC === "case") {
    return _suggestKWD(["WHEN"]);
  }

  const condMatch = await suggestCondition({ cb, ss, sql, setS }, false);
  if (condMatch) {
    return condMatch;
  }

  if (ftoken?.textLC === "table") {
    return suggestTableLike({ cb, ss, sql, parentCb: undefined });
  }

  if (ftoken?.textLC === "explain") {
    if (cb.currNestingFunc?.textLC === "explain") {
      const { getSuggestion } = withKWDs(ExplainOptions, {
        cb,
        ss,
        setS,
        sql,
        opts: { notOrdered: true },
      });
      return getSuggestion(",", ["(", ")"]);
    }
    if (cb.ltoken?.textLC === "explain") {
      const hasNoStatement = !TOP_KEYWORDS.some(
        (kwd) => !cb.text.toLowerCase().includes(kwd.label.toLowerCase()),
      );
      if (!hasNoStatement) {
        return suggestSnippets([
          { label: "(...options)", insertText: "( $0 )" },
        ]);
      }
      return withKWDs(EXPLAIN_KWDS, { cb, ss, setS, sql }).getSuggestion();
    }
  }

  if (ftoken?.textLC === "truncate") {
    const d = withKWDs(
      [
        {
          kwd: "TRUNCATE",
          expects: "table",
          options: [
            {
              label: "ONLY",
              kind: getKind("keyword"),
              docs: "If ONLY is specified before the table name, only that table is truncated. If ONLY is not specified, the table and all its descendant tables (if any) are truncated. Optionally, * can be specified after the table name to explicitly indicate that descendant tables are included.",
            },
          ],
        },
        {
          kwd: "RESTART IDENTITY",
          dependsOn: "TRUNCATE",
          docs: "Automatically restart sequences owned by columns of the truncated table(s).",
        },
        {
          kwd: "CONTINUE IDENTITY",
          dependsOn: "TRUNCATE",
          docs: "Do not change the values of sequences. This is the default.",
        },
        {
          kwd: "CASCADE",
          dependsOn: "TRUNCATE",
          docs: "Automatically truncate all tables that have foreign-key references to any of the named tables, or to any tables added to the group due to CASCADE.",
        },
        {
          kwd: "RESTRICT",
          dependsOn: "TRUNCATE",
          docs: "Refuse to truncate if any of the tables have foreign-key references from tables that are not listed in the command. This is the default.",
        },
      ],
      { cb, ss, setS: setS, sql },
    );
    return d.getSuggestion();
  }

  if (ftoken?.textLC === "call") {
    if (cb.prevTokens.length === 1) {
      return getExpected("function", cb, ss);
    }
    if (cb.currNestingId) {
      return suggestColumnLike({ cb, ss, sql, setS });
    }
  }

  if (prevText.trim().startsWith("\\")) {
    return {
      suggestions: PSQL_COMMANDS.map(
        (c) =>
          ({
            // label: { label: c.cmd, description: c.desc },
            label: { label: c.cmd + "   " + c.desc },
            insertText: `/* psql ${c.cmd} --${c.desc} */${c.query}`,
            kind: getKind("snippet"),
            range: {
              startColumn: 0,
              startLineNumber: cb.startLine,
              endColumn: 132,
              endLineNumber: cb.endLine,
            },
            filterText: `${c.cmd} ${c.desc}`,
          }) as MonacoSuggestion,
      ),
    };
  }

  if ([ltoken, currToken].some((t) => t?.text === "::")) {
    return {
      suggestions: ss
        .filter((s) => s.type === "dataType")
        .map((s) => ({ ...s, sortText: s.dataTypeInfo!.priority! })),
    };
  }

  /** Refresh materialized view */
  if (ftoken?.textLC === "refresh") {
    if (cb.tokens.some((t) => t.textLC === "view")) {
      return {
        suggestions: ss.filter((s) => s.relkind === "m"),
      };
    }

    return suggestSnippets([
      {
        label: "MATERIALIZED VIEW",
        insertText: "MATERIALIZED VIEW ",
        docs: "Replace the contents of a materialized view",
      },
      {
        label: "REFRESH MATERIALIZED VIEW CONCURRENTLY",
        insertText: "REFRESH MATERIALIZED VIEW CONCURRENTLY ",
        docs: "Replace the contents of a materialized view",
      },
    ]);
  }

  if (
    (ltoken?.textLC === "inner" ||
      ltoken?.textLC === "left" ||
      ltoken?.textLC === "right") &&
    ltoken.type === "identifier.sql"
  ) {
    return suggestSnippets(["join"].map((label) => ({ label })));
  }

  return undefined;
};

const EXPLAIN_KWDS = [
  {
    kwd: "EXPLAIN",
    options: [
      {
        label: { label: "( ...options )" },
        insertText: "( $options )",
      },
      {
        label: { label: "$statement" },
        insertText: "$0",
      },
    ],
  },
] satisfies KWD[];

const ExplainOptions = [
  {
    kwd: "ANALYZE",
    docs: "Carry out the command and show actual run times and other statistics. This parameter defaults to FALSE.",
  },
  {
    kwd: "VERBOSE",
    docs: "Display additional information regarding the plan. Specifically, include the output column list for each node in the plan tree, schema-qualify table and function names, always label variables in expressions with their range table alias, and always print the name of each trigger for which statistics are displayed. The query identifier will also be displayed if one has been computed, see compute_query_id for more details. This parameter defaults to FALSE.",
  },
  {
    kwd: "COSTS",
    docs: "Include information on the estimated startup and total cost of each plan node, as well as the estimated number of rows and the estimated width of each row. This parameter defaults to TRUE.",
  },
  {
    kwd: "SETTINGS",
    docs: "Include information on configuration parameters. Specifically, include options affecting query planning with value different from the built-in default value. This parameter defaults to FALSE.",
  },
  {
    kwd: "GENERIC_PLAN",
    docs: "Allow the statement to contain parameter placeholders like $1, and generate a generic plan that does not depend on the values of those parameters. See PREPARE for details about generic plans and the types of statement that support parameters. This parameter cannot be used together with ANALYZE. It defaults to FALSE.",
  },
  {
    kwd: "BUFFERS",
    docs: "Include information on buffer usage. Specifically, include the number of shared blocks hit, read, dirtied, and written, the number of local blocks hit, read, dirtied, and written, the number of temp blocks read and written, and the time spent reading and writing data file blocks and temporary file blocks (in milliseconds) if track_io_timing is enabled. A hit means that a read was avoided because the block was found already in cache when needed. Shared blocks contain data from regular tables and indexes; local blocks contain data from temporary tables and indexes; while temporary blocks contain short-term working data used in sorts, hashes, Materialize plan nodes, and similar cases. The number of blocks dirtied indicates the number of previously unmodified blocks that were changed by this query; while the number of blocks written indicates the number of previously-dirtied blocks evicted from cache by this backend during query processing. The number of blocks shown for an upper-level node includes those used by all its child nodes. In text format, only non-zero values are printed. This parameter defaults to FALSE.",
  },
  {
    kwd: "WAL",
    docs: "Include information on WAL record generation. Specifically, include the number of records, number of full page images (fpi) and the amount of WAL generated in bytes. In text format, only non-zero values are printed. This parameter may only be used when ANALYZE is also enabled. It defaults to FALSE.",
  },
  {
    kwd: "TIMING",
    docs: "Include actual startup time and time spent in each node in the output. The overhead of repeatedly reading the system clock can slow down the query significantly on some systems, so it may be useful to set this parameter to FALSE when only actual row counts, and not exact times, are needed. Run time of the entire statement is always measured, even when node-level timing is turned off with this option. This parameter may only be used when ANALYZE is also enabled. It defaults to TRUE.",
  },
  {
    kwd: "SUMMARY",
    docs: "Include summary information (e.g., totaled timing information) after the query plan. Summary information is included by default when ANALYZE is used but otherwise is not included by default, but can be enabled using this option. Planning time in EXPLAIN EXECUTE includes the time required to fetch the plan from the cache and the time required for re-planning, if necessary.",
  },
  {
    kwd: "FORMAT",
    options: ["JSON", "TEXT", "YAML", "XML"],
    docs: "Specify the output format, which can be TEXT, XML, JSON, or YAML. Non-text output contains the same information as the text output format, but is easier for programs to parse. This parameter defaults to TEXT.",
  },
] satisfies KWD[];

const TO_CHAR_PATTERNS: { label: string; docs: string }[] = [
  { label: "HH", docs: `hour of day (01-12)` },
  { label: "HH12", docs: `hour of day (01-12)` },
  { label: "HH24", docs: `hour of day (00-23)` },
  { label: "MI", docs: `minute (00-59)` },
  { label: "SS", docs: `second (00-59)` },
  { label: "MS", docs: `millisecond (000-999)` },
  { label: "US", docs: `microsecond (000000-999999)` },
  { label: "FF1", docs: `tenth of second (0-9)` },
  { label: "FF2", docs: `hundredth of second (00-99)` },
  { label: "FF3", docs: `millisecond (000-999)` },
  { label: "FF4", docs: `tenth of a millisecond (0000-9999)` },
  { label: "FF5", docs: `hundredth of a millisecond (00000-99999)` },
  { label: "FF6", docs: `microsecond (000000-999999)` },
  { label: "SSSS, SSSSS", docs: `seconds past midnight (0-86399)` },
  { label: "AM, am, PM or pm	", docs: `meridiem indicator (without periods)` },
  {
    label: "A.M., a.m., P.M. or p.m.	",
    docs: `meridiem indicator (with periods)`,
  },
  { label: "Y,YYY	", docs: `year (4 or more digits) with comma` },
  { label: "YYYY", docs: `year (4 or more digits)` },
  { label: "YYY", docs: `last 3 digits of year` },
  { label: "YY", docs: `last 2 digits of year` },
  { label: "Y", docs: `last digit of year` },
  { label: "IYYY", docs: `ISO 8601 week-numbering year (4 or more digits)` },
  { label: "IYY", docs: `last 3 digits of ISO 8601 week-numbering year` },
  { label: "IY", docs: `last 2 digits of ISO 8601 week-numbering year` },
  { label: "I", docs: `last digit of ISO 8601 week-numbering year` },
  { label: "BC, bc, AD or ad	", docs: `era indicator (without periods)` },
  { label: "B.C., b.c., A.D. or a.d.	", docs: `era indicator (with periods)` },
  {
    label: "MONTH",
    docs: `full upper case month name (blank-padded to 9 chars)`,
  },
  {
    label: "Month",
    docs: `full capitalized month name (blank-padded to 9 chars)`,
  },
  {
    label: "month",
    docs: `full lower case month name (blank-padded to 9 chars)`,
  },
  {
    label: "MON",
    docs: `abbreviated upper case month name (3 chars in English, localized lengths vary)`,
  },
  {
    label: "Mon",
    docs: `abbreviated capitalized month name (3 chars in English, localized lengths vary)`,
  },
  {
    label: "mon",
    docs: `abbreviated lower case month name (3 chars in English, localized lengths vary)`,
  },
  { label: "MM", docs: `month number (01-12)` },
  { label: "DAY", docs: `full upper case day name (blank-padded to 9 chars)` },
  { label: "Day", docs: `full capitalized day name (blank-padded to 9 chars)` },
  { label: "day", docs: `full lower case day name (blank-padded to 9 chars)` },
  {
    label: "DY",
    docs: `abbreviated upper case day name (3 chars in English, localized lengths vary)`,
  },
  {
    label: "Dy",
    docs: `abbreviated capitalized day name (3 chars in English, localized lengths vary)`,
  },
  {
    label: "dy",
    docs: `abbreviated lower case day name (3 chars in English, localized lengths vary)`,
  },
  { label: "DDD", docs: `day of year (001-366)` },
  {
    label: "IDDD",
    docs: `day of ISO 8601 week-numbering year (001-371; day 1 of the year is Monday of the first ISO week)`,
  },
  { label: "DD", docs: `day of month (01-31)` },
  { label: "D", docs: `day of the week, Sunday (1) to Saturday (7)` },
  { label: "ID", docs: `ISO 8601 day of the week, Monday (1) to Sunday (7)` },
  {
    label: "W",
    docs: `week of month (1-5) (the first week starts on the first day of the month)`,
  },
  {
    label: "WW",
    docs: `week number of year (1-53) (the first week starts on the first day of the year)`,
  },
  {
    label: "IW",
    docs: `week number of ISO 8601 week-numbering year (01-53; the first Thursday of the year is in week 1)`,
  },
  {
    label: "CC",
    docs: `century (2 digits) (the twenty-first century starts on 2001-01-01)`,
  },
  {
    label: "J",
    docs: `Julian Date (integer days since November 24, 4714 BC at local midnight; see Section B.7)`,
  },
  { label: "Q", docs: `quarter` },
  {
    label: "RM",
    docs: `month in upper case Roman numerals (I-XII; I=January)`,
  },
  {
    label: "rm",
    docs: `month in lower case Roman numerals (i-xii; i=January)`,
  },
  {
    label: "TZ",
    docs: `upper case time-zone abbreviation (only supported in to_char)`,
  },
  {
    label: "tz",
    docs: `lower case time-zone abbreviation (only supported in to_char)`,
  },
  { label: "TZH", docs: `time-zone hours` },
  { label: "TZM", docs: `time-zone minutes` },
  {
    label: "OF",
    docs: `time-zone offset from UTC (only supported in to_char)`,
  },
];
