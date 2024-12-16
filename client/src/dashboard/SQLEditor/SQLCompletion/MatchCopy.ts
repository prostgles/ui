import type { SQLHandler } from "prostgles-types";
import { isObject } from "../../../../../commonTypes/publishUtils";
import { QUERY_WATCH_IGNORE } from "../../../../../commonTypes/utils";
import { suggestSnippets } from "./CommonMatchImports";
import { ENCODINGS } from "./PSQL";
import {
  getKind,
  type GetKind,
  type ParsedSQLSuggestion,
  type SQLMatcher,
} from "./registerSuggestions";
import type { KWD } from "./withKWDs";
import { withKWDs } from "./withKWDs";
import type { CodeBlock } from "./completionUtils/getCodeBlock";

const KWDOptions = [
  {
    kwd: "FORMAT",
    options: ["TEXT", "CSV", "BINARY"].map((label) => ({ label })),
    docs: "Selects the data format to be read or written: text, csv (Comma Separated Values), or binary. The default is text.",
  },

  {
    kwd: "FREEZE",
    options: ["true", "false"].map((label) => ({ label })),
    docs: "Requests copying the data with rows already frozen, just as they would be after running the VACUUM FREEZE command. This is intended as a performance option for initial data loading. Rows will be frozen only if the table being loaded has been created or truncated in the current subtransaction, there are no cursors open and there are no older snapshots held by this transaction. It is currently not possible to perform a COPY FREEZE on a partitioned table.",
  },

  {
    kwd: "DELIMITER",
    options: ["E'\\t'", "','"].map((label) => ({ label })),
    docs: "Specifies the character that separates columns within each row (line) of the file. The default is a tab character in text format, a comma in CSV format. This must be a single one-byte character. This option is not allowed when using binary format.",
  },
  {
    kwd: "NULL",
    options: [""],
    docs: "Specifies the string that represents a null value. The default is \\N (backslash-N) in text format, and an unquoted empty string in CSV format. You might prefer an empty string even in text format for cases where you don't want to distinguish nulls from empty strings. This option is not allowed when using binary format.",
  },
  {
    kwd: "HEADER",
    options: ["TRUE", "FALSE", "MATCH"].map((label) => ({ label })),
    docs: "Specifies that the file contains a header line with the names of each column in the file. On output, the first line contains the column names from the table. On input, the first line is discarded when this option is set to true (or equivalent Boolean value). If this option is set to MATCH, the number and names of the columns in the header line must match the actual column names of the table, in order; otherwise an error is raised. This option is not allowed when using binary format. The MATCH option is only valid for COPY FROM commands.",
  },
  {
    kwd: "QUOTE",
    options: [`'"'`, `''''`].map((label) => ({ label })),
    docs: "Specifies the quoting character to be used when a data value is quoted. The default is double-quote. This must be a single one-byte character. This option is allowed only when using CSV format.",
  },
  {
    kwd: "ESCAPE",
    dependsOn: "CSV",
    options: [`'"'`, `''''`].map((label) => ({ label })),
    docs: "Specifies the character that should appear before a data character that matches the QUOTE value. The default is the same as the QUOTE value (so that the quoting character is doubled if it appears in the data). This must be a single one-byte character. This option is allowed only when using CSV format.",
  },
  {
    kwd: "FORCE_QUOTE",
    options: ["*"],
    dependsOn: "CSV",
    docs: "Forces quoting to be used for all non-NULL values in each specified column. NULL output is never quoted. If * is specified, non-NULL values will be quoted in all columns. This option is allowed only in COPY TO, and only when using CSV format.",
  },
  {
    kwd: "FORCE_NOT_NULL",
    options: ["*"],
    dependsOn: "CSV",
    docs: "Do not match the specified columns' values against the null string. In the default case where the null string is empty, this means that empty values will be read as zero-length strings rather than nulls, even when they are not quoted. This option is allowed only in COPY FROM, and only when using CSV format.",
  },
  {
    kwd: "FORCE_NULL",
    options: ["*"],
    dependsOn: "CSV",
    docs: "Match the specified columns' values against the null string, even if it has been quoted, and if a match is found set the value to NULL. In the default case where the null string is empty, this converts a quoted empty string into NULL. This option is allowed only in COPY FROM, and only when using CSV format.",
  },
  {
    kwd: "ENCODING",
    options: ENCODINGS.map((label) => ({ label })),
    docs: "Specifies that the file is encoded in the encoding_name. If this option is omitted, the current client encoding is used. See the Notes below for more details.",
  },
  {
    kwd: "WHERE",
    docs: "where condition is any expression that evaluates to a result of type boolean. Any row that does not satisfy this condition will not be inserted to the table. A row satisfies the condition if it returns true when the actual row values are substituted for any variable references. \
    Currently, subqueries are not allowed in WHERE expressions, and the evaluation does not see any changes made by the COPY itself (this matters when the expression contains calls to VOLATILE functions).",
  },
] as const satisfies readonly KWD[];

export const MatchCopy: SQLMatcher = {
  match: (cb) => cb.prevLC.startsWith("copy"),
  result: async ({ cb, ss, setS, sql }) => {
    const { prevLC, prevTokens, prevText } = cb;

    if (
      prevTokens.some(
        (t) => t.type === "string.sql" || t.textLC.includes("$"),
      ) ||
      prevText.endsWith("'")
    ) {
      if (cb.ltoken?.type === "string.sql" || prevText.trim().endsWith("$")) {
        return suggestSnippets([
          {
            label: { label: "( options... )" },
            docs: "Import options",
            insertText: "( $0 )",
          },
        ]);
      }
      const { getSuggestion } = withKWDs(KWDOptions, { cb, ss, setS, sql });
      return getSuggestion(",", ["(", ")"]);
    }

    if (prevLC.endsWith("(") || prevLC.endsWith(",")) {
      const columns = prevText.split("(")[1]?.split(")")[0] || "";

      return {
        suggestions: ss
          .filter(
            (s) =>
              s.type === "column" &&
              !columns.includes(s.name) &&
              prevText.includes(s.escapedParentName as any),
          )
          .map((s) => ({
            ...s,
            sortText: `${s.colInfo?.ordinal_position}`.padStart(3, "0"),
            insertText: s.insertText + ",",
          })),
      };
    }
    if (cb.tokens.length === 2) {
      const tableName = cb.tokens[1]?.text;
      const colSuggestion = {
        label: { label: "( columns... )" },
        insertText: "( $0 )",
      };
      if (!prevText.includes("(")) {
        if (tableName) {
          const cols = ss.filter(
            (s) =>
              s.type === "column" && s.escapedParentName?.includes(tableName),
          );
          if (cols.length) {
            colSuggestion.insertText = `( ${cols.map((c) => c.insertText).join(", ")} )`;
          }
        }
      }
      return suggestSnippets([
        { label: "FROM" },
        ...(prevText.includes("(") ? [] : [colSuggestion]),
      ]);
    }

    return withKWDs(
      [
        { kwd: "COPY", expects: "table" },
        {
          kwd: "FROM",
          options: [
            ...(cb.currToken?.type === "string.sql" ?
              []
            : [{ label: "PROGRAM", kind: getKind("keyword") }]),
            ...(cb.prevTokens.length > 2 ?
              await getPathSuggestions(cb, sql, getKind)
            : []),
          ],
        },
        {
          kwd: "PROGRAM",
          exactlyAfter: ["FROM"],
          expects: "string",
        },
      ] satisfies KWD[],
      { cb, ss, setS, sql },
    ).getSuggestion();
  },
};

const getPathSuggestions = async (
  { currToken }: CodeBlock,
  sql: SQLHandler | undefined,
  getKind: GetKind,
): Promise<ParsedSQLSuggestion[]> => {
  if (!sql) return [];

  const dirOrfiles = await suggestDirsAndFiles(sql, currToken?.text);

  if ("label" in dirOrfiles) {
    return suggestSnippets([
      {
        label: dirOrfiles.label,
        docs: dirOrfiles.hint,
        insertText: "",
        kind: getKind("folder"),
      },
    ]).suggestions;
  }

  return suggestSnippets(
    dirOrfiles.map((d) => ({
      label: d.path, // + (!d.info? "" : `    ${d.info?.size_pretty || ""}`),
      insertText: d.insertText,
      docs: d.documentation,
      commitCharacters: d.commitCharacters,
      kind: getKind(d.info?.isdir === false ? "file" : "folder"),
    })),
  ).suggestions;
};

type DirOrFile = {
  access: Date;
  change: Date;
  creation: Date;
  isdir: boolean;
  modification: Date;
  size: string;
  size_pretty: string;
  firstRow?: string;
};
type DirFilesResult = {
  path: string;
  documentation: string;
  insertText: string;
  info?: DirOrFile;
  commitCharacters?: string[];
};
export const suggestDirsAndFiles = async (
  sql: SQLHandler,
  lastWord = "",
): Promise<DirFilesResult[] | { label: string; hint?: string }> => {
  const hasPath = lastWord.includes("'") || lastWord.startsWith("/");
  let baseDir = hasPath ? lastWord : "/";
  if (baseDir.startsWith("'")) baseDir = baseDir.slice(1);
  if (baseDir.endsWith("'")) baseDir = baseDir.slice(0, -1);

  /* Remove partial folder name */
  if (baseDir.length > 1 && baseDir.endsWith("/")) {
    const parts = baseDir.slice(1).split("/");
    if (parts.length > 2) {
      if (parts.at(-1)?.length) {
        baseDir = parts.slice(0, -1).join("/");
      }
    }
  }
  let dirs: DirFilesResult[] = [];
  let error;
  try {
    try {
      dirs = (await sql(
        "set statement_timeout to 200; SELECT pg_ls_dir(${baseDir}) as path",
        { baseDir },
        { returnType: "rows" },
      )) as any;
    } catch (err: any) {
      dirs = [
        {
          path: "",
          insertText: "",
          documentation: "",
        },
      ];

      return {
        label: "Error",
        hint: err.err_msg?.toString(),
      };
    }

    dirs = await Promise.all(
      dirs
        /** Some queries take too long (SELECT * FROM pg_stat_file('/pagefile.sys'))  */
        .filter(
          (d) =>
            !["swapfile.sys", "pagefile.sys", "DumpStack.log.tmp"].includes(
              d.path,
            ) && !d.path.endsWith(".sys"),
        )
        .map(async (d) => {
          const res = {
            ...d,
            insertText: hasPath ? d.path : `'${baseDir}${d.path}'`,
          };
          try {
            const fileOrDirPath = `${baseDir}${d.path}`;
            const f = (await sql(
              "set statement_timeout to 200; SELECT *, pg_size_pretty(size::bigint) as size_pretty from pg_stat_file(${baseDir})",
              { baseDir: fileOrDirPath },
              { returnType: "row" },
            )) as DirOrFile;
            const isdir = f.isdir;
            const nameParts = d.path.split(".");
            const ext = nameParts.at(-1);
            let firstRow = "";
            if (!isdir && nameParts.length > 1 && ext!.length < 4) {
              // isdir = false;

              if (ext?.toLowerCase() === "csv") {
                const q = `
                /* ${QUERY_WATCH_IGNORE}  */
                DROP TABLE IF EXISTS prostgles.temp_dir_suggestions; 
                CREATE table prostgles.temp_dir_suggestions(val text); 
                COPY prostgles.temp_dir_suggestions (val) FROM PROGRAM \${command}; 
                SELECT * FROM prostgles.temp_dir_suggestions; 
              `;
                const head = (await sql(
                  q,
                  { command: `head -n 1 ${baseDir}${d.path}` },
                  { returnType: "row" },
                )) as { val?: string };
                if (head.val) {
                  firstRow = head.val;
                }
              }
            }
            res.info = {
              ...f,
              isdir,
              firstRow,
              size: f.size_pretty,
              access: new Date(f.access),
              change: new Date(f.change),
              creation: new Date(f.creation),
              modification: new Date(f.modification),
            };
          } catch (err) {
            console.warn(err);
          }

          return res;
        }),
    );
    await sql("set statement_timeout to DEFAULT");
  } catch (errRaw) {
    await sql("set statement_timeout to DEFAULT");
    error =
      errRaw instanceof Error ? errRaw.message
      : isObject(errRaw) ? errRaw.err_msg
      : JSON.stringify(errRaw);
    return { label: error };
  }

  if (!dirs.length)
    return {
      label: "Directory is empty",
    };

  dirs = dirs.map((d) => {
    let documentation = "";
    if (d.info) {
      documentation += `  \nType: \`${d.info.isdir ? "Folder" : "File"}\`    `;
      documentation += `  \nSize: \`${d.info.size_pretty}\`    `;
      documentation += `  \nModified: \`${d.info.modification}\`    `;
    }
    if (d.info?.firstRow) {
      // if(d.path.includes("stateplane")) debugger;
      documentation +=
        "  \n\n**Headers:**  \n\n" +
        d.info.firstRow
          .split(",")
          .map((v) => `${v}   \`TEXT\``)
          .join(",    \n");
    }
    return {
      ...d,
      commitCharacters: d.info?.isdir ? ["/"] : undefined,
      documentation,
    };
  });

  return dirs;
};
