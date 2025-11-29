/* eslint-disable no-useless-escape */
import { isDefined } from "../../utils/utils";
import type { LoadedSuggestions } from "../Dashboard/dashboardUtils";
import { STARTING_KEYWORDS } from "../SQLEditor/SQLCompletion/CommonMatchImports";
import { getMonaco, LANG } from "../SQLEditor/W_SQLEditor";
import type { languages } from "./monacoEditorTypes";

let loadedPSQLLanguage = false;
export const loadPSQLLanguage = async (
  loadedSuggestions: LoadedSuggestions | undefined,
) => {
  if (loadedPSQLLanguage) {
    return false;
  }
  loadedPSQLLanguage = true;
  const monaco = await getMonaco();
  const monacoLanguages = monaco.languages.getLanguages();
  for await (const lang of monacoLanguages) {
    if (LANG === lang.id && "loader" in lang) {
      const oldLoader = lang.loader as () => Promise<{
        language: languages.IMonarchLanguage;
      }>;

      const langModule = await oldLoader();
      lang.loader = () => {
        langModule.language.operators = Array.from(
          new Set([...operators, ...langModule.language.operators]),
        );

        /** Remove rule that matches $ to number */
        //@ts-ignore
        langModule.language.tokenizer.numbers =
          langModule.language.tokenizer.numbers?.filter(
            //@ts-ignore
            ([ruleRegex], i) => !"$".match(ruleRegex),
          );

        const dataTypes =
          loadedSuggestions?.suggestions
            .flatMap(
              (s) =>
                s.dataTypeInfo && [
                  s.dataTypeInfo.name,
                  s.dataTypeInfo.udt_name,
                ],
            )
            .filter(isDefined) ?? [];
        // langModule.language.keywords = Array.from(
        //   new Set([...STARTING_KEYWORDS, ...keywords, ...dataTypes]),
        // );

        const pgKeywords = loadedSuggestions?.suggestions
          .filter((s) => {
            const { keywordInfo, topKwd } = s;
            if (!keywordInfo) return false;
            const { catcode, barelabel } = keywordInfo;
            return topKwd || !barelabel || catcode === "R" || catcode === "C";
          })
          .map((s) => s.name);

        langModule.language.keywords = Array.from(
          new Set([
            ...STARTING_KEYWORDS,
            ...(pgKeywords ?? keywords),
            ...dataTypes,
          ]),
        );

        langModule.language.builtinFunctions =
          loadedSuggestions?.suggestions
            .filter(
              (s) =>
                s.type === "function" &&
                s.schema === "pg_catalog" &&
                !dataTypes.includes(s.name),
            )
            .map((s) => s.name)
            .filter(isDefined) ?? sqlLanguageDefinition.builtinFunctions;

        // langModule.language.tokenizer.string!.push([/\$\$/, 'string']);
        // langModule.language.tokenizer.strings!.push([/\$\$/, 'string']);
        langModule.language.tokenizer.strings!.push([
          new RegExp("\\$\\$[^$]*\\$\\$"),
          "string",
        ]);
        return Promise.resolve(langModule);
      };
    }
  }

  return true;
};

const sqlLanguageDefinition = {
  defaultToken: "",
  tokenPostfix: ".sql",
  ignoreCase: true,

  brackets: [
    { open: "[", close: "]", token: "delimiter.square" },
    { open: "(", close: ")", token: "delimiter.parenthesis" },
  ],

  operators: [
    // Logical
    "ALL",
    "AND",
    "ANY",
    "BETWEEN",
    "EXISTS",
    "IN",
    "LIKE",
    "NOT",
    "OR",
    "SOME",
    // Set
    "EXCEPT",
    "INTERSECT",
    "UNION",
    // Join
    "APPLY",
    "CROSS",
    "FULL",
    "INNER",
    "JOIN",
    "LEFT",
    "OUTER",
    "RIGHT",
    // Predicates
    "CONTAINS",
    "FREETEXT",
    "IS",
    "NULL",
    // Pivoting
    "PIVOT",
    "UNPIVOT",
    // Merging
    "MATCHED",
  ],
  builtinFunctions: [
    // Aggregate
    "AVG",
    "CHECKSUM_AGG",
    "COUNT",
    "COUNT_BIG",
    "GROUPING",
    "GROUPING_ID",
    "MAX",
    "MIN",
    "SUM",
    "STDEV",
    "STDEVP",
    "VAR",
    "VARP",
    // Analytic
    "CUME_DIST",
    "FIRST_VALUE",
    "LAG",
    "LAST_VALUE",
    "LEAD",
    "PERCENTILE_CONT",
    "PERCENTILE_DISC",
    "PERCENT_RANK",
    // Collation
    "COLLATE",
    "COLLATIONPROPERTY",
    "TERTIARY_WEIGHTS",
    // Azure
    "FEDERATION_FILTERING_VALUE",
    // Conversion
    "CAST",
    "CONVERT",
    "PARSE",
    "TRY_CAST",
    "TRY_CONVERT",
    "TRY_PARSE",
    // Cryptographic
    "ASYMKEY_ID",
    "ASYMKEYPROPERTY",
    "CERTPROPERTY",
    "CERT_ID",
    "CRYPT_GEN_RANDOM",
    "DECRYPTBYASYMKEY",
    "DECRYPTBYCERT",
    "DECRYPTBYKEY",
    "DECRYPTBYKEYAUTOASYMKEY",
    "DECRYPTBYKEYAUTOCERT",
    "DECRYPTBYPASSPHRASE",
    "ENCRYPTBYASYMKEY",
    "ENCRYPTBYCERT",
    "ENCRYPTBYKEY",
    "ENCRYPTBYPASSPHRASE",
    "HASHBYTES",
    "IS_OBJECTSIGNED",
    "KEY_GUID",
    "KEY_ID",
    "KEY_NAME",
    "SIGNBYASYMKEY",
    "SIGNBYCERT",
    "SYMKEYPROPERTY",
    "VERIFYSIGNEDBYCERT",
    "VERIFYSIGNEDBYASYMKEY",
    // Cursor
    "CURSOR_STATUS",
    // Datatype
    "DATALENGTH",
    "IDENT_CURRENT",
    "IDENT_INCR",
    "IDENT_SEED",
    "IDENTITY",
    "SQL_VARIANT_PROPERTY",
    // Datetime
    "CURRENT_TIMESTAMP",
    "DATEADD",
    "DATEDIFF",
    "DATEFROMPARTS",
    "DATENAME",
    "DATEPART",
    "DATETIME2FROMPARTS",
    "DATETIMEFROMPARTS",
    "DATETIMEOFFSETFROMPARTS",
    "DAY",
    "EOMONTH",
    "GETDATE",
    "GETUTCDATE",
    "ISDATE",
    "MONTH",
    "SMALLDATETIMEFROMPARTS",
    "SWITCHOFFSET",
    "SYSDATETIME",
    "SYSDATETIMEOFFSET",
    "SYSUTCDATETIME",
    "TIMEFROMPARTS",
    "TODATETIMEOFFSET",
    "YEAR",
    // Logical
    "CHOOSE",
    "COALESCE",
    "IIF",
    "NULLIF",
    // Mathematical
    "ABS",
    "ACOS",
    "ASIN",
    "ATAN",
    "ATN2",
    "CEILING",
    "COS",
    "COT",
    "DEGREES",
    "EXP",
    "FLOOR",
    "LOG",
    "LOG10",
    "PI",
    "POWER",
    "RADIANS",
    "RAND",
    "ROUND",
    "SIGN",
    "SIN",
    "SQRT",
    "SQUARE",
    "TAN",
    // Metadata
    "APP_NAME",
    "APPLOCK_MODE",
    "APPLOCK_TEST",
    "ASSEMBLYPROPERTY",
    "COL_LENGTH",
    "COL_NAME",
    "COLUMNPROPERTY",
    "DATABASE_PRINCIPAL_ID",
    "DATABASEPROPERTYEX",
    "DB_ID",
    "DB_NAME",
    "FILE_ID",
    "FILE_IDEX",
    "FILE_NAME",
    "FILEGROUP_ID",
    "FILEGROUP_NAME",
    "FILEGROUPPROPERTY",
    "FILEPROPERTY",
    "FULLTEXTCATALOGPROPERTY",
    "FULLTEXTSERVICEPROPERTY",
    "INDEX_COL",
    "INDEXKEY_PROPERTY",
    "INDEXPROPERTY",
    "OBJECT_DEFINITION",
    "OBJECT_ID",
    "OBJECT_NAME",
    "OBJECT_SCHEMA_NAME",
    "OBJECTPROPERTY",
    "OBJECTPROPERTYEX",
    "ORIGINAL_DB_NAME",
    "PARSENAME",
    "SCHEMA_ID",
    "SCHEMA_NAME",
    "SCOPE_IDENTITY",
    "SERVERPROPERTY",
    "STATS_DATE",
    "TYPE_ID",
    "TYPE_NAME",
    "TYPEPROPERTY",
    // Ranking
    "DENSE_RANK",
    "NTILE",
    "RANK",
    "ROW_NUMBER",
    // Replication
    "PUBLISHINGSERVERNAME",
    // Rowset
    "OPENDATASOURCE",
    "OPENQUERY",
    "OPENROWSET",
    "OPENXML",
    // Security
    "CERTENCODED",
    "CERTPRIVATEKEY",
    "CURRENT_USER",
    "HAS_DBACCESS",
    "HAS_PERMS_BY_NAME",
    "IS_MEMBER",
    "IS_ROLEMEMBER",
    "IS_SRVROLEMEMBER",
    "LOGINPROPERTY",
    "ORIGINAL_LOGIN",
    "PERMISSIONS",
    "PWDENCRYPT",
    "PWDCOMPARE",
    "SESSION_USER",
    "SESSIONPROPERTY",
    // 'SUSER_ID',
    "SUSER_NAME",
    "SUSER_SID",
    "SUSER_SNAME",
    "SYSTEM_USER",
    "USER",
    // 'USER_ID',
    // 'USER_NAME',
    // String
    "ASCII",
    "CHAR",
    "CHARINDEX",
    "CONCAT",
    "DIFFERENCE",
    "FORMAT",
    "LEFT",
    "LEN",
    "LOWER",
    "LTRIM",
    "NCHAR",
    "PATINDEX",
    "QUOTENAME",
    "REPLACE",
    "REPLICATE",
    "REVERSE",
    "RIGHT",
    "RTRIM",
    "SOUNDEX",
    "SPACE",
    "STR",
    "STUFF",
    "SUBSTRING",
    "UNICODE",
    "UPPER",
    // System
    "BINARY_CHECKSUM",
    "CHECKSUM",
    "CONNECTIONPROPERTY",
    "CONTEXT_INFO",
    "CURRENT_REQUEST_ID",
    "ERROR_LINE",
    "ERROR_NUMBER",
    "ERROR_MESSAGE",
    "ERROR_PROCEDURE",
    "ERROR_SEVERITY",
    "ERROR_STATE",
    "FORMATMESSAGE",
    "GETANSINULL",
    "GET_FILESTREAM_TRANSACTION_CONTEXT",
    "HOST_ID",
    "HOST_NAME",
    "ISNULL",
    "ISNUMERIC",
    "MIN_ACTIVE_ROWVERSION",
    "NEWID",
    "NEWSEQUENTIALID",
    "ROWCOUNT_BIG",
    "XACT_STATE",
    // TextImage
    "TEXTPTR",
    "TEXTVALID",
    // Trigger
    "COLUMNS_UPDATED",
    "EVENTDATA",
    "TRIGGER_NESTLEVEL",
    "UPDATE",
    // ChangeTracking
    "CHANGETABLE",
    "CHANGE_TRACKING_CONTEXT",
    "CHANGE_TRACKING_CURRENT_VERSION",
    "CHANGE_TRACKING_IS_COLUMN_IN_MASK",
    "CHANGE_TRACKING_MIN_VALID_VERSION",
    // FullTextSearch
    "CONTAINSTABLE",
    "FREETEXTTABLE",
    // SemanticTextSearch
    "SEMANTICKEYPHRASETABLE",
    "SEMANTICSIMILARITYDETAILSTABLE",
    "SEMANTICSIMILARITYTABLE",
    // FileStream
    "FILETABLEROOTPATH",
    "GETFILENAMESPACEPATH",
    "GETPATHLOCATOR",
    "PATHNAME",
    // ServiceBroker
    "GET_TRANSMISSION_STATUS",
  ],
  builtinVariables: [
    // Configuration
    "@@DATEFIRST",
    "@@DBTS",
    "@@LANGID",
    "@@LANGUAGE",
    "@@LOCK_TIMEOUT",
    "@@MAX_CONNECTIONS",
    "@@MAX_PRECISION",
    "@@NESTLEVEL",
    "@@OPTIONS",
    "@@REMSERVER",
    "@@SERVERNAME",
    "@@SERVICENAME",
    "@@SPID",
    "@@TEXTSIZE",
    "@@VERSION",
    // Cursor
    "@@CURSOR_ROWS",
    "@@FETCH_STATUS",
    // Datetime
    "@@DATEFIRST",
    // Metadata
    "@@PROCID",
    // System
    "@@ERROR",
    "@@IDENTITY",
    "@@ROWCOUNT",
    "@@TRANCOUNT",
    // Stats
    "@@CONNECTIONS",
    "@@CPU_BUSY",
    "@@IDLE",
    "@@IO_BUSY",
    "@@PACKET_ERRORS",
    "@@PACK_RECEIVED",
    "@@PACK_SENT",
    "@@TIMETICKS",
    "@@TOTAL_ERRORS",
    "@@TOTAL_READ",
    "@@TOTAL_WRITE",
  ],
  pseudoColumns: ["$ACTION", "$IDENTITY", "$ROWGUID", "$PARTITION"],
  tokenizer: {
    root: [
      { include: "@comments" },
      { include: "@whitespace" },
      { include: "@pseudoColumns" },
      { include: "@numbers" },
      { include: "@strings" },
      { include: "@complexIdentifiers" },
      { include: "@scopes" },
      [/[;,.]/, "delimiter"],
      [/[()]/, "@brackets"],
      [
        /[\w@#$]+/,
        {
          cases: {
            "@operators": "operator",
            "@builtinVariables": "predefined",
            "@builtinFunctions": "predefined",
            "@keywords": "keyword",
            "@default": "identifier",
          },
        },
      ],
      [/[<>=!%&+\-*/|~^]/, "operator"],
    ] satisfies languages.IMonarchLanguageRule[],
    whitespace: [[/\s+/, "white"]],
    comments: [
      [/--+.*/, "comment"],
      [/\/\*/, { token: "comment.quote", next: "@comment" }],
    ],
    comment: [
      [/[^*/]+/, "comment"],
      // Not supporting nested comments, as nested comments seem to not be standard?
      // i.e. http://stackoverflow.com/questions/728172/are-there-multiline-comment-delimiters-in-sql-that-are-vendor-agnostic
      // [/\/\*/, { token: 'comment.quote', next: '@push' }],    // nested comment not allowed :-(
      [/\*\//, { token: "comment.quote", next: "@pop" }],
      [/./, "comment"],
    ],
    pseudoColumns: [
      [
        /[$][A-Za-z_][\w@#$]*/,
        {
          cases: {
            "@pseudoColumns": "predefined",
            "@default": "identifier",
          },
        },
      ],
    ],
    numbers: [
      [/0[xX][0-9a-fA-F]*/, "number"],
      [/[$][+-]*\d*(\.\d*)?/, "number"],
      [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, "number"],
    ],
    strings: [
      [/N'/, { token: "string", next: "@string" }],
      [/'/, { token: "string", next: "@string" }],
    ],
    string: [
      [/[^']+/, "string"],
      [/''/, "string"],
      [/'/, { token: "string", next: "@pop" }],
    ],
    complexIdentifiers: [
      [/\[/, { token: "identifier.quote", next: "@bracketedIdentifier" }],
      [/"/, { token: "identifier.quote", next: "@quotedIdentifier" }],
    ],
    bracketedIdentifier: [
      [/[^\]]+/, "identifier"],
      [/]]/, "identifier"],
      [/]/, { token: "identifier.quote", next: "@pop" }],
    ],
    quotedIdentifier: [
      [/[^"]+/, "identifier"],
      [/""/, "identifier"],
      [/"/, { token: "identifier.quote", next: "@pop" }],
    ],
    scopes: [
      [/BEGIN\s+(DISTRIBUTED\s+)?TRAN(SACTION)?\b/i, "keyword"],
      [/BEGIN\s+TRY\b/i, { token: "keyword.try" }],
      [/END\s+TRY\b/i, { token: "keyword.try" }],
      [/BEGIN\s+CATCH\b/i, { token: "keyword.catch" }],
      [/END\s+CATCH\b/i, { token: "keyword.catch" }],
      [/(BEGIN|CASE)\b/i, { token: "keyword.block" }],
      [/END\b/i, { token: "keyword.block" }],
      [/WHEN\b/i, { token: "keyword.choice" }],
      [/THEN\b/i, { token: "keyword.choice" }],
    ],
  },
};
const keywords = [
  "insert",
  "disable",
  "delete",
  "enable",
  "all",
  "analyse",
  "analyze",
  "and",
  "any",
  "array",
  "as",
  "asc",
  "asymmetric",
  "both",
  "case",
  "cast",
  "check",
  "collate",
  "column",
  "constraint",
  "create",
  "current_catalog",
  "current_date",
  "current_role",
  "current_time",
  "current_timestamp",
  "current_user",
  "default",
  "deferrable",
  "desc",
  "distinct",
  "do",
  "else",
  "end",
  "except",
  "false",
  "fetch",
  "for",
  "foreign",
  "from",
  "grant",
  "group",
  "having",
  "in",
  "initially",
  "intersect",
  "into",
  "lateral",
  "leading",
  "limit",
  "localtime",
  "localtimestamp",
  "not",
  "null",
  "offset",
  "on",
  "only",
  "or",
  "order",
  "placing",
  "primary",
  "references",
  "returning",
  "select",
  "session_user",
  "some",
  "symmetric",
  "table",
  "then",
  "to",
  "trailing",
  "true",
  "union",
  "unique",
  "user",
  "using",
  "variadic",
  "when",
  "where",
  "window",
  "with",
];

const operators = [
  "!~",
  "!~*",
  "!~~",
  "!~~*",
  "&&",
  "&<",
  "&<|",
  "&>",
  "*<",
  "*<=",
  "*<>",
  "*=",
  "*>",
  "*>=",
  "-|-",
  "<",
  "<<",
  "<<=",
  "<<|",
  "<=",
  "<>",
  "<@",
  "<^",
  "=",
  ">",
  ">=",
  ">>",
  ">>=",
  ">^",
  "?",
  "?#",
  "?&",
  "?-",
  "?-|",
  "?|",
  "?||",
  "@>",
  "@?",
  "@@",
  "@@@",
  "^@",
  "|&>",
  "|>>",
  "~",
  "~*",
  "~<=~",
  "~<~",
  "~=",
  "~>=~",
  "~>~",
  "~~",
  "~~*",
  "&&&",
  "&/&",
  "<<@",
  "@",
  "@>>",
  "~==",
  "~~=",
  "LIKE",
  "NOT LIKE",
  "ILIKE",
  "NOT ILIKE",
];
