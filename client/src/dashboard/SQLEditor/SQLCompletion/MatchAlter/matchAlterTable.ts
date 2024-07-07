import { suggestSnippets } from "../CommonMatchImports";
import { PG_TABLE_CONSTRAINTS, REFERENCE_CONSTRAINT_OPTIONS_KWDS } from "../TableKWDs";
import { getExpected } from "../getExpected";
import { type ParsedSQLSuggestion, type SQLMatchContext } from "../registerSuggestions";
import type { KWD } from "../withKWDs";
import { withKWDs } from "../withKWDs";

export const matchAlterTable = async ({ cb, ss, sql, setS }: SQLMatchContext): Promise<{ suggestions: ParsedSQLSuggestion[] }> => {
  
  if(cb.ltoken?.textLC === "trigger"){
    const suggestions = ss.filter(s => s.triggerInfo && cb.prevTokens.some(t => t.text.includes(s.triggerInfo!.event_object_table)));
    if(suggestions.length === 0){
      return suggestSnippets([
        { label: "No triggers found for this table", insertText: " " },
      ])
    }
    return { 
      suggestions
    };
  }

  if(cb.prevTokens.length === 2){
    return getExpected("table", cb, ss)
  }
  const k = withKWDs(ALTER_TABLE_KWD, { cb, ss, setS, sql });

  return k.getSuggestion(); 
}

const AddOpts = [
  { label: "COLUMN", docs: "Creates a new column in this table" },
  ...PG_TABLE_CONSTRAINTS.map(d => ({ ...d, label: d.kwd, docs: d.docs }))
]

const ALTER_TABLE_KWD = [
  {
    kwd: "ALTER TABLE",
    docs: "Alters a table",
    expects: "table",
  },
  { 
    kwd: "ADD", 
    justAfter: ["TABLE"],
    options: AddOpts,
    excludeIf: (cb) => !cb.prevTokens.some(t => t.textLC === "add")
  },
  ...AddOpts.map(opt => ({
    ...opt as any,
    kwd: `ADD ${opt.label}`,
    excludeIf: (cb) => cb.prevTokens.some(t => t.textLC === "add")
  } satisfies KWD)),
  { 
    kwd: "DROP",
    docs: "Drops a table related object",
    justAfter: ["TABLE"],
    excludeIf: (cb) => cb.tokens.length > 3,
    options: [
      { label: "CONSTRAINT" },
      { label: "COLUMN" }
    ]
  },
  {
    kwd: "ALTER COLUMN",
    expects: "column",
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "DROP COLUMN",
    expects: "column",
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "COLUMN",
    expects: "column",
    exactlyAfter: ["ADD", "DROP", "ALTER"]
  },
  {
    kwd: "DISABLE TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "ENABLE TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "ENABLE ALWAYS TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "RENAME TO",
    docs: "Rename the table",
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "ENABLE REPLICA TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  ...([
    "ENABLE ROW LEVEL SECURITY;", 
    "DISABLE ROW LEVEL SECURITY;",
    "FORCE ROW LEVEL SECURITY;", 
    "NO FORCE ROW LEVEL SECURITY;", 
  ].map(kwd => ({
    kwd,
    docs: `These forms control the application of row security policies belonging to the table. If enabled and no policies exist for the table, then a default-deny policy is applied. Note that policies can exist for a table even if row-level security is disabled. In this case, the policies will not be applied and the policies will be ignored. See also CREATE POLICY.`,
    excludeIf: (cb) => cb.prevTokens.length > 3,
  }))),
  ...PG_TABLE_CONSTRAINTS.map(k => ({
    ...k,
    exactlyAfter: ["ADD"],
  })),
  {
    kwd: "REFERENCES",
    expects: "table",
    dependsOn: "FOREIGN KEY"
  },
  ...REFERENCE_CONSTRAINT_OPTIONS_KWDS
] as const satisfies readonly KWD[];