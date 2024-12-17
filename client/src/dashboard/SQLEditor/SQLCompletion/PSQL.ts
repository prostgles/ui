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
    cmd: "\\df[anptw]",
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
    cmd: "\\dP[itn+]",
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
  { cmd: "\\sf", opts: "[+]", desc: "show a function's definition" },
  { cmd: "\\sv", opts: "[+]", desc: "show a view's definition" },
  { cmd: "\\z", desc: "same as \\dp" },
];

/*
  https://www.postgresql.org/docs/current/multibyte.html
*/

export const ENCODINGS = [
  "DEFAULT",
  "BIG5", //	Big Five	Traditional Chinese	No	No	1–2	WIN950, Windows950
  "EUC_CN", //	Extended UNIX Code-CN	Simplified Chinese	Yes	Yes	1–3
  "EUC_JP", //	Extended UNIX Code-JP	Japanese	Yes	Yes	1–3
  "EUC_JIS_2004", //	Extended UNIX Code-JP, JIS X 0213	Japanese	Yes	No	1–3
  "EUC_KR", //	Extended UNIX Code-KR	Korean	Yes	Yes	1–3
  "EUC_TW", //	Extended UNIX Code-TW	Traditional Chinese, Taiwanese	Yes	Yes	1–3
  "GB18030", //	National Standard	Chinese	No	No	1–4
  "GBK", //	Extended National Standard	Simplified Chinese	No	No	1–2	WIN936, Windows936
  "ISO_8859_5", //	ISO 8859-5, ECMA 113	Latin/Cyrillic	Yes	Yes	1
  "ISO_8859_6", //	ISO 8859-6, ECMA 114	Latin/Arabic	Yes	Yes	1
  "ISO_8859_7", //	ISO 8859-7, ECMA 118	Latin/Greek	Yes	Yes	1
  "ISO_8859_8", //	ISO 8859-8, ECMA 121	Latin/Hebrew	Yes	Yes	1
  "JOHAB", //	JOHAB	Korean (Hangul)	No	No	1–3
  "KOI8R", //	KOI8-R	Cyrillic (Russian)	Yes	Yes	1	KOI8
  "KOI8U", //	KOI8-U	Cyrillic (Ukrainian)	Yes	Yes	1
  "LATIN1", //	ISO 8859-1, ECMA 94	Western European	Yes	Yes	1	ISO88591
  "LATIN2", //	ISO 8859-2, ECMA 94	Central European	Yes	Yes	1	ISO88592
  "LATIN3", //	ISO 8859-3, ECMA 94	South European	Yes	Yes	1	ISO88593
  "LATIN4", //	ISO 8859-4, ECMA 94	North European	Yes	Yes	1	ISO88594
  "LATIN5", //	ISO 8859-9, ECMA 128	Turkish	Yes	Yes	1	ISO88599
  "LATIN6", //	ISO 8859-10, ECMA 144	Nordic	Yes	Yes	1	ISO885910
  "LATIN7", //	ISO 8859-13	Baltic	Yes	Yes	1	ISO885913
  "LATIN8", //	ISO 8859-14	Celtic	Yes	Yes	1	ISO885914
  "LATIN9", //	ISO 8859-15	LATIN1 with Euro and accents	Yes	Yes	1	ISO885915
  "LATIN10", //	ISO 8859-16, ASRO SR 14111	Romanian	Yes	No	1	ISO885916
  "MULE_INTERNAL", //	Mule internal code	Multilingual Emacs	Yes	No	1–4
  "SJIS", //	Shift JIS	Japanese	No	No	1–2	Mskanji, ShiftJIS, WIN932, Windows932
  "SHIFT_JIS_2004", //	Shift JIS, JIS X 0213	Japanese	No	No	1–2
  "SQL_ASCII", //	unspecified (see text)	any	Yes	No	1
  "UHC", //	Unified Hangul Code	Korean	No	No	1–2	WIN949, Windows949
  "UTF8", //	Unicode, 8-bit	all	Yes	Yes	1–4	Unicode
  "WIN866", //	Windows CP866	Cyrillic	Yes	Yes	1	ALT
  "WIN874", //	Windows CP874	Thai	Yes	No	1
  "WIN1250", //	Windows CP1250	Central European	Yes	Yes	1
  "WIN1251", //	Windows CP1251	Cyrillic	Yes	Yes	1	WIN
  "WIN1252", //	Windows CP1252	Western European	Yes	Yes	1
  "WIN1253", //	Windows CP1253	Greek	Yes	Yes	1
  "WIN1254", //	Windows CP1254	Turkish	Yes	Yes	1
  "WIN1255", //	Windows CP1255	Hebrew	Yes	Yes	1
  "WIN1256", //	Windows CP1256	Arabic	Yes	Yes	1
  "WIN1257", //	Windows CP1257	Baltic	Yes	Yes	1
  "WIN1258", //	Windows CP1258	Vietnamese	Yes	Yes	1	ABC, TCVN, TCVN5712, VSCII
];

/*

https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW
document.querySelectorAll("div.table").forEach(n => {
    const title = n.querySelector(".structname")
    const tableName = title?.innerText;
    if(!tableName) return;
    const cols = Array.from(n.querySelectorAll("tbody tr")).map(c => ({
        name: c.querySelector(".structname")?.innerText,c,
        desc: c.querySelector("td:nth-child(2)")?.innerText,
    }));
    console.log(title, tableName, cols);
});


*/
