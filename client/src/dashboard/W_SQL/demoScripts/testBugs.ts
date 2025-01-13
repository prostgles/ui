import { click, waitForElement } from "../../../demo/demoUtils";
import { fixIndent } from "../../../demo/sqlVideoDemo";
import { tout } from "../../../pages/ElectronSetup";
import type { DemoScript } from "../getDemoUtils";
import { testSqlCharts } from "./testSqlCharts";

export const testBugs: DemoScript = async (args) => {
  const {
    typeAuto,
    fromBeginning,
    testResult,
    getEditor,
    moveCursor,
    newLine,
    triggerSuggest,
    acceptSelectedSuggestion,
    actions,
    runDbSQL,
    runSQL,
  } = args;

  const alterTable3TknsBug = fixIndent`
    ALTER TABLE pg_catalog.pg_transform`;
  fromBeginning(false, alterTable3TknsBug);
  await typeAuto(` dcs`);
  await typeAuto(` `);
  testResult(alterTable3TknsBug + " DROP CONSTRAINT pg_transform_oid_index");

  const selectSubSelectBug = fixIndent(`
    select
      t.relname as table_name,
      (SELECT FROM  i.relnamespace),
    from
      pg_class t,
      pg_class i,
      pg_index ix,
      pg_attribute a
    where
      t.oid = ix.indrelid
  `);
  fromBeginning(false, selectSubSelectBug);
  await moveCursor.pageUp();
  await moveCursor.down(2);
  await moveCursor.right(15);
  await typeAuto(`pna`);
  await testResult(
    selectSubSelectBug.replace(
      "SELECT FROM  ",
      "SELECT FROM pg_catalog.pg_namespace ",
    ),
  );

  /** Comma cross join + table alias repeating bug */
  const crossJoinQuery = fixIndent(`
    select *
    from
      pg_class t,
      pg_class i,
      pg_index ix,
      pg_attribute a
    where
      t.oid = ix.indrelid
      and t.relkind = 'r'
      and ix.
  `);
  fromBeginning(false, crossJoinQuery);
  await moveCursor.pageDown();
  await moveCursor.lineEnd();
  await typeAuto(`uni`);
  await testResult(crossJoinQuery + "indisunique");

  /** hackyFixOptionmatchOnWordStartOnly */
  fromBeginning(false, crossJoinQuery + "uni");
  await moveCursor.pageDown();
  await moveCursor.lineEnd();
  await typeAuto(``);
  await testResult(crossJoinQuery + "indisunique");

  const crossJoinQuery2 = crossJoinQuery.replace("and ix.", "and ");
  fromBeginning(false, crossJoinQuery2);
  await moveCursor.pageDown();
  await moveCursor.lineEnd();
  await typeAuto(`uniq`);
  await testResult(crossJoinQuery2 + "ix.indisunique");

  await testSqlCharts(args);

  /** Schema prefix doubling bug */
  const qPrefDoubling = fixIndent(`
    DELETE FROM pg_catalog.pg_class pc
    WHERE pc.rela`);
  fromBeginning(false, qPrefDoubling);
  moveCursor.lineEnd();
  await typeAuto(`c`);
  testResult(qPrefDoubling + "cl");

  /** Public schema prefix */
  await runDbSQL(
    `CREATE TABLE IF NOT EXISTS my_p_table (id1 serial PRIMARY KEY, name1 text);`,
  );
  const publicSchemaPrefix = "SELECT * FROM public.my_p_table WHERE";
  for await (const script of [
    publicSchemaPrefix,
    publicSchemaPrefix.replace("public", "PUBLIC"),
  ]) {
    await fromBeginning(false, script);
    await typeAuto(" ");
    await testResult(script + " id1");
  }

  /** Create index public schema prefix */
  const publicSchemaPrefixIndex = "CREATE INDEX ON public.my_p_table (  )";
  for await (const script of [
    publicSchemaPrefixIndex,
    publicSchemaPrefixIndex.replace("public", "PUBLIC"),
  ]) {
    await fromBeginning(false, script);
    await moveCursor.left(2);
    await typeAuto(" ");
    await testResult(script.replace(")", "id1 )"));
  }
  await runDbSQL(`DROP TABLE  my_p_table;`);

  /** Alter/Drop column */
  const alterTableQuery = "ALTER TABLE pg_catalog.pg_class ";
  await fromBeginning(false, alterTableQuery + "DROP COLUMN");
  await typeAuto(" nam");
  await testResult(alterTableQuery + "DROP COLUMN relname");
  await fromBeginning(false, alterTableQuery + "ALTER COLUMN");
  await typeAuto(" nam");
  await typeAuto(" drd");
  await testResult(alterTableQuery + "ALTER COLUMN relname DROP DEFAULT");

  /** Timechart works with codeblocks */
  await fromBeginning(false, "SELECT now(), 3; \n\nselect 1");
  await moveCursor.down(3, 50);
  await moveCursor.up(3, 50);
  await tout(1e3);
  await runSQL();
  await click("AddChartMenu.Timechart");
  await tout(2e3);
  const tchartNode = await waitForElement("W_TimeChart", undefined, {
    timeout: 2e3,
  });
  console.log(tchartNode);
  const dataItems = (tchartNode as any)._renderedData as any[];
  if (!dataItems.length) {
    throw "Timechart not working";
  }
  await click("dashboard.window.closeChart");

  const lateralJoin = fixIndent(`
    SELECT *
    FROM pg_catalog.pg_class c
    LEFT JOIN LATERAL (
      SELECT *
      FROM pg_catalog.pg_proc p
      WHERE 
    ) tt
      ON TRUE`);
  fromBeginning(false, lateralJoin);
  await moveCursor.up(2);
  await moveCursor.lineEnd();
  await typeAuto(`c.`);
  testResult(lateralJoin.replace(`WHERE `, `WHERE c.oid`));

  const withNestingBug = fixIndent(`
    WITH cte1 AS (
      SELECT 1 as he
      FROM pg_catalog.pg_proc
    )
    SELECT *, lag(  ), max( ), first_value()
    FROM cte1`);
  const expectedFixed = withNestingBug
    .replace(`max( )`, `max(  he)`)
    .replace(`lag(  )`, `lag(   he) OVER()`)
    .replace(`first_value()`, `first_value( he)`);
  fromBeginning(false, withNestingBug);
  await moveCursor.up();
  await moveCursor.lineStart();
  await moveCursor.right(16);
  await typeAuto(` `);
  await moveCursor.right();
  await typeAuto(` `);
  await moveCursor.lineEnd();
  await moveCursor.left(1);
  await typeAuto(` `);
  await moveCursor.left(18);
  await typeAuto(` `);
  testResult(expectedFixed);

  const namedValues = fixIndent(`
    SELECT *
    FROM (
    values (1, 1, 'a'), (1, 9, 'a')
    ) tbl (id, col123, "name")
    ORDER BY`);
  fromBeginning(false, namedValues);
  await typeAuto(" c");
  testResult(namedValues + " tbl.col123");

  /** Funcs args in CTE */
  const cteFuncArgQuery = fixIndent(`
    WITH cte1 AS (
      SELECT max()
      FROM pg_catalog.pg_class
    )`);
  await fromBeginning(false, cteFuncArgQuery);
  await moveCursor.up(2);
  await moveCursor.lineEnd();
  await moveCursor.left();
  await typeAuto(` name`);
  await testResult(cteFuncArgQuery.replace("max()", "max( relname)"));

  /** Test explain */
  await fromBeginning(false, "EXPLAIN SELECT * FROM");
  await typeAuto(" class");
  await testResult("EXPLAIN SELECT * FROM pg_catalog.pg_class");

  await fromBeginning(false, "EXPLAIN UPDATE");
  await typeAuto(" class");
  await typeAuto(" ");
  await typeAuto(" ");
  await testResult("EXPLAIN UPDATE pg_catalog.pg_class SET oid");

  const sortTextBug = fixIndent(`
    SELECT *
    FROM pg_catalog.pg_class
    ORDER BY`);
  await fromBeginning(false, sortTextBug);
  await typeAuto(" name");
  await testResult(sortTextBug + " relname");

  await fromBeginning(false, "");
  await typeAuto("SELECT unne");
  testResult("SELECT unnest");

  const idxQ = "CREATE INDEX myidx ON pg_catalog.pg_class (  oid )";
  await fromBeginning(false, "");
  await typeAuto("cr");
  await typeAuto(" in");
  await typeAuto(" myidx", { triggerMode: "off" });
  await typeAuto(" ");
  await typeAuto(" pgcla");
  await typeAuto(" ", { nth: 1 });
  await typeAuto(" ");
  await testResult(idxQ);
  await moveCursor.lineEnd();
  await typeAuto("\n ");
  await typeAuto(" nam");
  await typeAuto("\n whe");
  await typeAuto(" reln");
  await typeAuto(" ");
  await testResult(idxQ + "\n INCLUDE (relname)\n  WHERE relname =");

  const createViewWithOptions = fixIndent(`
    CREATE OR REPLACE VIEW myview`);
  await fromBeginning(false, createViewWithOptions);
  await typeAuto(" w");
  await typeAuto(" ");
  await typeAuto(" ");
  await typeAuto(" ");
  await typeAuto(" ");
  await testResult(
    createViewWithOptions +
      " WITH (check_option =cascaded , security_barrier =false)",
  );

  const funcsColliding = fixIndent(`
    SELECT *
    FROM pg_stat_user_indexes ui
    WHERE `);
  await fromBeginning(false, funcsColliding);
  await typeAuto(` schem`);
  await testResult(funcsColliding + " ui.schemaname");

  const quotedSchemaBug = `
DROP SCHEMA IF EXISTS "MySchema" CASCADE;
CREATE SCHEMA "MySchema";
CREATE FUNCTION "MySchema"."MyFunction" ()
 RETURNS VOID AS $$
BEGIN
END;
$$ LANGUAGE plpgsql;
CREATE TABLE "MySchema"."MyTable" (
  "MyColumn" TEXT
);
  `;
  await runDbSQL(quotedSchemaBug);
  fromBeginning(false, "");
  await tout(2500);
  await typeAuto(`SELECT MyColu`);
  await moveCursor.up(2);
  await moveCursor.lineEnd();
  await typeAuto(`, MyFunc`);
  await testResult(
    fixIndent(`
    SELECT "MyColumn", "MySchema"."MyFunction"()
    FROM "MySchema"."MyTable"
    LIMIT 200`),
  );

  fromBeginning(false, `DROP SCHEMA`);
  await typeAuto(` mys`);
  testResult(`DROP SCHEMA "MySchema"`);

  /** Ensure whitespace is kept, replacing quoted identifiers works as expected */
  fromBeginning(false, `SELECT FROM "MySchema"."MyTable"`);
  await moveCursor.lineStart();
  await moveCursor.right(6);
  await typeAuto(` `);
  testResult(`SELECT "MyColumn" FROM "MySchema"."MyTable"`);

  fromBeginning(false, `SELECT "m" FROM "MySchema"."MyTable"`);
  await moveCursor.lineStart();
  await moveCursor.right(9);
  await typeAuto(`y`);
  testResult(`SELECT "MyColumn" FROM "MySchema"."MyTable"`);

  fromBeginning(false, `SELECT "m" FROM "MySchema"."MyTable"`);
  await moveCursor.lineStart();
  await moveCursor.right(9);
  await typeAuto(`yf`);
  testResult(`SELECT "MySchema"."MyFunction"() FROM "MySchema"."MyTable"`);

  fromBeginning(false, `SELECT mycolum FROM "MySchema"."MyTable"`);
  await moveCursor.lineStart();
  await moveCursor.right(14);
  await typeAuto(`n`);
  testResult(`SELECT "MyColumn" FROM "MySchema"."MyTable"`);

  await fromBeginning(false, " CREATE INDEX myidx ON");
  await typeAuto(` myt`);
  await typeAuto(` `, { nth: 1 });
  await typeAuto(` `);
  await moveCursor.lineEnd();
  await typeAuto(` `);
  await typeAuto(` `);
  await testResult(
    `CREATE INDEX myidx ON "MySchema"."MyTable" (  "MyColumn" ) INCLUDE ("MyColumn")`,
  );
  await runDbSQL(`DROP SCHEMA IF EXISTS "MySchema" CASCADE;`);

  const codeBlockQueries = fixIndent(`
    SELECT oid
    FROM pg_catalog.pg_default_acl
    LIMIT 200;

    SELECT oid
    FROM pg_catalog.pg_default_acl
    LIMIT 200;
    SELECT * FROM pg_catalog.pg_trigger;
    SELECT * FROM information_schema.tables;
  `);
  const codeBlockQueryLines = codeBlockQueries.split("\n");
  fromBeginning(false, codeBlockQueries);
  await tout(500);
  let cb = await actions.getCodeBlockValue();
  testResult(codeBlockQueryLines.at(-1)!, cb);
  await moveCursor.up();
  cb = await actions.getCodeBlockValue();
  testResult(codeBlockQueryLines.at(-2)!, cb);
  await moveCursor.up();
  cb = await actions.getCodeBlockValue();
  testResult(codeBlockQueryLines.slice(3, 7).join("\n"), cb);
  await moveCursor.up(4);
  cb = await actions.getCodeBlockValue();
  testResult(codeBlockQueryLines.slice(3, 7).join("\n"), cb);
  await moveCursor.up();
  cb = await actions.getCodeBlockValue();
  testResult(codeBlockQueryLines.slice(0, 4).join("\n"), cb);

  /** Update */
  const updateQuery = fixIndent(`
    UPDATE prostgles.app_triggers
    SET`);
  fromBeginning(false, updateQuery);
  await typeAuto(` `);
  await testResult(
    fixIndent(`
    ${updateQuery} app_id
  `),
  );

  /** Jsonb Path from cte */
  const cteQuery = `
    WITH cte1 AS (
      SELECT '{ "a": { "b": { "c": 222 } } }'::jsonb as j, 2 as z
    )`;
  fromBeginning(
    false,
    fixIndent(`
    ${cteQuery}
    SELECT
    FROM cte1
  `),
  );
  await moveCursor.up();
  await moveCursor.lineEnd();
  await typeAuto(` `);
  await typeAuto(` `);
  await typeAuto(` `);
  await typeAuto(` `);
  await moveCursor.down();
  await newLine();
  await typeAuto(`w`);
  await typeAuto(` `);
  await typeAuto(` `);
  await typeAuto(` `);
  await typeAuto(` `);
  newLine();
  await typeAuto(`a`);
  await typeAuto(` z`);
  await typeAuto(` `);
  await typeAuto(` ''`);
  await moveCursor.left();
  triggerSuggest();
  await tout(500);
  acceptSelectedSuggestion();
  await testResult(
    fixIndent(`
    ${cteQuery}
    SELECT j ->'a' ->'b' ->>'c'
    FROM cte1
    WHERE j ->'a' ->'b' ->>'c'
    AND z = '2'
  `),
  );

  /** CTE */
  const query = `
  WITH cte1 AS (
    SELECT * 
    FROM pg_catalog.pg_class
  )
  SELECT * 
  FROM cte1 c
  JOIN information_schema.tables t
  ON true
  WHERE`;
  fromBeginning(false, query);
  await typeAuto(" comm");
  await typeAuto(" =");
  await typeAuto(" relper");
  await typeAuto("\nOR c.rk");
  await typeAuto(" = t.it");
  testResult(
    query + " t.commit_action = c.relpersistence\n  OR c.relkind = t.is_typed",
  );

  /** CTE names */
  const cteScriptCompressed = `WITH cte1 AS (
SELECT 1 
FROM (
SELECT *
FROM geography_columns
) t
)SELECT *`;
  const cteScriptSpaced = `
  WITH cte1 AS (
    SELECT 1 
    FROM (
      SELECT *
      FROM geography_columns
    ) t
  )
  SELECT *`;
  for await (const cteScript of [cteScriptCompressed, cteScriptSpaced]) {
    fromBeginning(false, cteScript);
    await typeAuto(" ");
    await typeAuto(" ");
    await typeAuto(" w");
    await typeAuto(" ");
    testResult(cteScript + ` FROM cte1 WHERE "?column?"`);
  }

  const testFunctionArgs = async () => {
    fromBeginning();
    await typeAuto(`SELECT quer`);
    await typeAuto(`, lef`);
    await typeAuto(`()`, { nth: -1 });
    moveCursor.left();
    await typeAuto(``);
    moveCursor.right();
    await typeAuto(`,current_sett`);
    await typeAuto(`()`, { nth: -1 });
    moveCursor.left();
    await typeAuto(`allow_in`);
    const expected = `SELECT query, left(application_name),current_setting('allow_in_place_tablespaces')
FROM pg_catalog.pg_stat_activity
LIMIT 200`;
    testResult(expected);

    fromBeginning();
    const expect2 = `SELECT * \nFROM pg_catalog.pg_stat_activity a\nWH`;
    await typeAuto(expect2, { msPerChar: 10 });
    await typeAuto(` lef`);
    await typeAuto(`()`, { nth: -1 });
    moveCursor.left();
    await typeAuto(`a.`);
    moveCursor.right();
    await typeAuto(` `);
    moveCursor.right();
    await typeAuto(` current_sett`);
    await typeAuto(`()`, { nth: -1 });
    moveCursor.left();
    await typeAuto(`allow_in`);
    testResult(
      expect2 +
        `ERE left(a.application_name) = current_setting('allow_in_place_tablespaces')`,
    );
  };
  await testFunctionArgs();

  /** Actions work */
  fromBeginning();
  await typeAuto(`ALTER TABLE`, { nth: -1 });
  getEditor().e.trigger("demo", "select2CB", {});
  await tout(500);
  await typeAuto(`sele`);
  testResult("SELECT");

  /** ALTER TABLE table name with schema */
  fromBeginning();
  await typeAuto(`ALTER TABLE prostgles`, { nth: -1 });
  await typeAuto(`.at`);
  testResult("ALTER TABLE prostgles.app_triggers");

  /** Documentation not showing */
  fromBeginning();
  await typeAuto(`SEL`, { nth: -1, msPerChar: 10 });
  await tout(1e3);
  const isOk = document.body.innerText.includes("sql-select.html");
  if (!isOk) {
    throw "Documentation not found";
  }
  const selectScript = `SELECT *
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public'`;

  /** AND/OR after WHERE */
  fromBeginning(false, selectScript);
  await typeAuto(`\na`);
  testResult(selectScript + "\nAND");
};
