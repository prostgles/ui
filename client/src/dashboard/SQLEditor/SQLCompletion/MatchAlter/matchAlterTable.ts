import { ALTER_TABLE_ACTIONS, PG_TABLE_CONSTRAINTS, REFERENCE_CONSTRAINT_OPTIONS_KWDS } from "../TableKWDs";
import { getExpected } from "../getExpected";
import { ParsedSQLSuggestion, SQLMatchContext } from "../registerSuggestions";
import { KWD, withKWDs } from "../withKWDs";

export const matchAlterTable = ({ cb, ss, getKind }: SQLMatchContext): { suggestions: ParsedSQLSuggestion[] } => {
  
  if(cb.prevTokens.length === 2){
    return getExpected("table", cb, ss)
  }
  // if (tokens.length === 3) {
  //   return suggestSnippets(ALTER_TABLE_ACTIONS.map(d => ({ ...d, kind: getKind("keyword") })));
  // }

  // const kwd = ALTER_TABLE_KWD.concat(ALTER_TABLE_ACTIONS.filter(({ label }) => !ALTER_TABLE_KWD.some(atkwd => atkwd.kwd === label)).map(({ label, docs }) => ({ kwd: label, docs })) as any);
  const k = withKWDs(ALTER_TABLE_KWD, cb, getKind, ss);

  return k.getSuggestion(); 
}

const AddOpts = [
  { label: "COLUMN", docs: "Creates a new column in this table" },
  ...PG_TABLE_CONSTRAINTS.map(d => ({ ...d, label: d.kwd, docs: d.docs }))
]

const ALTER_TABLE_KWD = [
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
    excludeIf: (cb) => cb.tokens.length > 3,
  },
  {
    kwd: "DROP COLUMN",
    expects: "column",
    excludeIf: (cb) => cb.tokens.length > 3,
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
    excludeIf: (cb) => cb.tokens.length > 3,
  },
  {
    kwd: "ENABLE TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.tokens.length > 3,
  },
  {
    kwd: "ENABLE ALWAYS TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.tokens.length > 3,
  },
  {
    kwd: "RENAME TO",
    docs: "Rename the table",
    excludeIf: (cb) => cb.tokens.length > 3,
  },
  {
    kwd: "ENABLE REPLICA TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.tokens.length > 3,
  },
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