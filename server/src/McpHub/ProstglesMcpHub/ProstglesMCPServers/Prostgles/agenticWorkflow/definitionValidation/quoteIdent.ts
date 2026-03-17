/**
 * Escapes a SQL identifier (table name, column name, etc.) for safe use
 * in queries — mirrors PostgreSQL's quote_ident behaviour.
 *
 * Rules:
 *  - Always doubles any embedded double-quote characters.
 *  - Wraps in double quotes if the identifier contains uppercase letters,
 *    non-word characters, starts with a digit, or is a reserved keyword.
 *  - Plain lowercase identifiers matching /^[a-z_][a-z0-9_$]*$/ that are
 *    not reserved are returned unquoted (PostgreSQL does the same).
 */

const RESERVED_KEYWORDS = new Set([
  "all",
  "analyse",
  "analyze",
  "and",
  "any",
  "array",
  "as",
  "asc",
  "asymmetric",
  "authorization",
  "between",
  "binary",
  "both",
  "case",
  "cast",
  "check",
  "collate",
  "collation",
  "column",
  "concurrently",
  "constraint",
  "create",
  "cross",
  "current_catalog",
  "current_date",
  "current_role",
  "current_schema",
  "current_time",
  "current_timestamp",
  "current_user",
  "default",
  "deferrable",
  "deferred",
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
  "freeze",
  "from",
  "full",
  "grant",
  "group",
  "having",
  "ilike",
  "in",
  "initially",
  "inner",
  "intersect",
  "into",
  "is",
  "isnull",
  "join",
  "lateral",
  "leading",
  "left",
  "like",
  "limit",
  "localtime",
  "localtimestamp",
  "natural",
  "not",
  "notnull",
  "null",
  "offset",
  "on",
  "only",
  "or",
  "order",
  "outer",
  "overlaps",
  "placing",
  "primary",
  "references",
  "returning",
  "right",
  "select",
  "session_user",
  "similar",
  "some",
  "symmetric",
  "table",
  "tablesample",
  "then",
  "to",
  "trailing",
  "true",
  "union",
  "unique",
  "user",
  "using",
  "variadic",
  "verbose",
  "when",
  "where",
  "window",
  "with",
]);

/** Regex for identifiers that are safe without quoting in PostgreSQL. */
const SAFE_IDENT_RE = /^[a-z_][a-z0-9_$]*$/;

const needsQuoting = (ident: string): boolean => {
  if (!SAFE_IDENT_RE.test(ident)) return true;
  if (RESERVED_KEYWORDS.has(ident)) return true;
  return false;
};

export const quoteIdent = (ident: string): string => {
  if (typeof ident !== "string") {
    throw new TypeError(`quoteIdent: expected string, got ${typeof ident}`);
  }
  if (ident.length === 0) {
    throw new RangeError("quoteIdent: identifier must not be empty");
  }

  // Always escape embedded double quotes by doubling them.
  const escaped = ident.replaceAll('"', '""');

  return needsQuoting(ident) ? `"${escaped}"` : escaped;
};
