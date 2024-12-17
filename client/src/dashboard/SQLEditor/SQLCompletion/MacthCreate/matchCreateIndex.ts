import { suggestSnippets } from "../CommonMatchImports";
import { getExpected } from "../getExpected";
import { getKind, type SQLMatchContext } from "../registerSuggestions";
import type { KWD } from "../withKWDs";
import { suggestKWD, withKWDs } from "../withKWDs";

export const matchCreateIndex = ({ cb, ss, setS, sql }: SQLMatchContext) => {
  const getColsAndFuncs = (inParens = false) => {
    const prevCols = cb.tokens
      .filter((t) => t.nestingId.length === 1)
      .map((t) => t.text);
    const tableColumns = getExpected(
      inParens ? "(column)" : "column",
      cb,
      ss,
    ).suggestions.filter((s) => !prevCols.includes(s.insertText));
    const immutableFuncs = ss.filter(
      (s) => s.funcInfo?.provolatile === "i" && s.funcInfo.prokind === "f",
    );
    return {
      suggestions: [
        ...tableColumns,
        ...immutableFuncs.map((s) => ({ ...s, sortText: "zz" })),
      ],
    };
  };
  if (cb.currNestingFunc && cb.currNestingFunc.textLC !== "with") {
    if (
      cb.ltoken?.text === "," ||
      cb.ltoken?.text === "(" ||
      cb.currToken?.text === "("
    ) {
      return getColsAndFuncs();
    }
    if (cb.ltoken?.type === "identifier.sql") {
      return suggestSnippets([
        { label: "ASC" },
        { label: "DESC" },
        { label: "NULLS LAST" },
        { label: "NULLS FIRST" },
        { label: "," },
      ]);
    }
  }

  if (cb.prevLC.endsWith("not exists")) {
    return suggestKWD(getKind, ["$index_name"]);
  }

  if (cb.l1token?.textLC === "using") {
    return getColsAndFuncs(true);
  }

  const concurrentlyOpt = {
    label: "CONCURRENTLY",
    docs: `When this option is used, PostgreSQL will build the index without taking any locks that prevent concurrent inserts, updates, or deletes on the table; whereas a standard index build locks out writes (but not reads) on the table until it's done. `,
  } as const;
  const crIdxOpts = [
    { label: "ON" },
    { label: "$index_name" },
    { label: "IF NOT EXISTS $index_name" },
    concurrentlyOpt,
  ] as const;

  const indexInfoUrl = `https://www.postgresql.org/docs/current/indexes-types.html`;
  const kwds: KWD[] = [
    {
      kwd: "INDEX",
      options: crIdxOpts,
      docs: `Constructs an index on the specified column(s) of the specified relation, which can be a table or a materialized view. Indexes are primarily used to enhance database performance (though inappropriate use can result in slower performance).`,
    },
    {
      kwd: "ON",
      expects: "table",
      docs: `The table for which the index will be created`,
      include: () =>
        cb.ltoken?.textLC === "index" ||
        cb.l1token?.textLC === "index" ||
        cb.l2token?.textLC === "index",
    },
    {
      kwd: "CONCURRENTLY",
      options: [{ label: "$index_name" }, { label: "IF NOT EXISTS" }],
      include: () => cb.ltoken?.textLC === "index",
      optional: true,
      docs: concurrentlyOpt.docs,
    },
    {
      kwd: "USING",
      optional: true,
      include: () => cb.l1token?.textLC === "on",
      docs: `The name of the index method to be used. Choices are btree, hash, gist, spgist, gin, brin, or user-installed access methods like bloom. The default method is btree.`,
      options: [
        {
          label: "btree",
          docs: `B-trees can handle equality and range queries on data that can be sorted into some ordering. In particular, the PostgreSQL query planner will consider using a B-tree index whenever an indexed column is involved in a comparison using one of these operators: 
      
      <   <=   =   >=   >
  ${indexInfoUrl}`,
        },
        {
          label: "hash",
          docs: `Hash indexes store a 32-bit hash code derived from the value of the indexed column. Hence, such indexes can only handle simple equality comparisons. The query planner will consider using a hash index whenever an indexed column is involved in a comparison using the equal operator: 
        
        =

${indexInfoUrl}`,
        },
        {
          label: "gist",
          docs: `GiST indexes are not a single kind of index, but rather an infrastructure within which many different indexing strategies can be implemented. Accordingly, the particular operators with which a GiST index can be used vary depending on the indexing strategy (the operator class). As an example, the standard distribution of PostgreSQL includes GiST operator classes for several two-dimensional geometric data types, which support indexed queries using these operators:
      
      <<   &<   &>   >>   <<|   &<|   |&>   |>>   @>   <@   ~=   &&  <->
      
${indexInfoUrl}`,
        },
        {
          label: "spgist",
          docs: `SP-GiST indexes, like GiST indexes, offer an infrastructure that supports various kinds of searches. SP-GiST permits implementation of a wide range of different non-balanced disk-based data structures, such as quadtrees, k-d trees, and radix trees (tries). As an example, the standard distribution of PostgreSQL includes SP-GiST operator classes for two-dimensional points, which support indexed queries using these operators:

      <<   >>   ~=   <@   <<|   |>>
    
${indexInfoUrl}`,
        },
        {
          label: "gin",
          docs: `GIN indexes are “inverted indexes” which are appropriate for data values that contain multiple component values, such as arrays. An inverted index contains a separate entry for each component value, and can efficiently handle queries that test for the presence of specific component values.

Like GiST and SP-GiST, GIN can support many different user-defined indexing strategies, and the particular operators with which a GIN index can be used vary depending on the indexing strategy. As an example, the standard distribution of PostgreSQL includes a GIN operator class for arrays, which supports indexed queries using these operators:
      
      <@   @>   =   &&
      
${indexInfoUrl}`,
        },
        {
          label: "brin",
          docs: `BRIN indexes (a shorthand for Block Range INdexes) store summaries about the values stored in consecutive physical block ranges of a table. Thus, they are most effective for columns whose values are well-correlated with the physical order of the table rows. Like GiST, SP-GiST and GIN, BRIN can support many different indexing strategies, and the particular operators with which a BRIN index can be used vary depending on the indexing strategy. For data types that have a linear sort order, the indexed data corresponds to the minimum and maximum values of the values in the column for each block range. This supports indexed queries using these operators:

      <   <=   =   >=   >
      
${indexInfoUrl}`,
        },
      ],
    },
    {
      kwd: "( $0 )",
      options: () => getColsAndFuncs(true).suggestions,
      excludeIf: () =>
        cb.prevTokens.some((t) => !t.nestingId && t.text === ")"),
    },
    {
      kwd: "INCLUDE",
      expects: "(column)",
      include: () => cb.prevTokens.some((t) => t.text === ")"),
      docs: `The optional INCLUDE clause specifies a list of columns which will be included in the index as non-key columns. A non-key column cannot be used in an index scan search qualification, and it is disregarded for purposes of any uniqueness or exclusion constraint enforced by the index. However, an index-only scan can return the contents of non-key columns without having to visit the index's table, since they are available directly from the index entry. Thus, addition of non-key columns allows index-only scans to be used for queries that otherwise could not use them.`,
      optional: true,
    },
    {
      kwd: "NULLS",
      optional: true,
      options: [
        // { label: "FIRST", docs: `Specifies that nulls sort before non-nulls. This is the default when DESC is specified.` },
        // { label: "LAST", docs: `Specifies that nulls sort after non-nulls. This is the default when DESC is not specified.` },
        {
          label: "DISTINCT",
          docs: `Specifies whether for a unique index, null values should be considered distinct (not equal). The default is that they are distinct, so that a unique index could contain multiple null values in a column.`,
        },
        {
          label: "NOT DISTINCT",
          docs: `Specifies whether for a unique index, null values should be considered distinct (not equal). The default is that they are distinct, so that a unique index could contain multiple null values in a column.`,
        },
      ],
    },
    {
      kwd: "WITH",
      optional: true,
      docs: `The optional WITH clause specifies storage parameters for the index. Each index method has its own set of allowed storage parameters. The B-tree, hash, GiST and SP-GiST index methods all accept this parameter:`,
      expects: "(options)",
      options: [
        {
          label: "fillfactor = 70",
          docs: `The fillfactor for an index is a percentage that determines how full the index method will try to pack index pages. For B-trees, leaf pages are filled to this percentage during initial index builds, and also when extending the index at the right (adding new largest key values). If pages subsequently become completely full, they will be split, leading to fragmentation of the on-disk index structure. B-trees use a default fillfactor of 90, but any integer value from 10 to 100 can be selected.`,
        },
        {
          label: "fastupdate = off",
          docs: `This setting controls usage of the fast update technique described in Section 70.4.1. It is a Boolean parameter: ON enables fast update, OFF disables it. The default is ON.`,
        },
        {
          label: "deduplicate_items = off",
          docs: `Controls usage of the B-tree deduplication technique described in Section 67.4.3. Set to ON or OFF to enable or disable the optimization. (Alternative spellings of ON and OFF are allowed as described in Section 20.1.) The default is ON.`,
        },
        {
          label: "gin_pending_list_limit = 1024",
          docs: `Custom gin_pending_list_limit parameter. This value is specified in kilobytes.`,
        },
        {
          label: "pages_per_range = 23",
          docs: `Defines the number of table blocks that make up one block range for each entry of a BRIN index (see Section 71.1 for more details). The default is 128.`,
        },
        {
          label: "autosummarize = on",
          docs: `Defines whether a summarization run is queued for the previous page range whenever an insertion is detected on the next one. See Section 71.1.1 for more details. The default is off.`,
        },
      ],
    },
    {
      kwd: "WHERE",
      expects: "condition",
      dependsOn: "ON",
      docs: `When the WHERE clause is present, a partial index is created. A partial index is an index that contains entries for only a portion of a table, usually a portion that is more useful for indexing than the rest of the table. For example, if you have a table that contains both billed and unbilled orders where the unbilled orders take up a small fraction of the total table and yet that is an often used section, you can improve performance by creating an index on just that portion. Another possible application is to use WHERE with UNIQUE to enforce uniqueness over a subset of a table. See Section 11.8 for more discussion.

The expression used in the WHERE clause can refer only to columns of the underlying table, but it can use all columns, not just the ones being indexed. Presently, subqueries and aggregate expressions are also forbidden in WHERE. The same restrictions apply to index fields that are expressions.`,
      optional: true,
    },
  ];
  return withKWDs(kwds, { cb, ss, setS, sql }).getSuggestion();
};
