import { fixIndent } from "../../../demo/sqlVideoDemo";
import { tout } from "../../../pages/ElectronSetup";
import type { DemoScript } from "../getDemoUtils";

export const testBugs: DemoScript = async ({ typeAuto, fromBeginning, testResult, getEditor, moveCursor, newLine, triggerSuggest, acceptSelectedSuggestion, actions, runDbSQL }) => {

  /** Test explain */
  await fromBeginning(false, "EXPLAIN SELECT * FROM");
  await typeAuto(" class");
  await testResult("EXPLAIN SELECT * FROM pg_catalog.pg_class");

  await fromBeginning(false, "EXPLAIN UPDATE");
  await typeAuto(" class");
  await typeAuto(" ");
  await typeAuto(" ");
  await testResult("EXPLAIN UPDATE pg_catalog.pg_class SET oid");
  
  /**
   * Works in manual tests but not here
   */
  const sortTextBug = fixIndent(`
    SELECT *
    FROM pg_catalog.pg_class
    ORDER BY`
  );
  await fromBeginning(false, sortTextBug);
  await typeAuto(" name");
  await testResult(sortTextBug + " relname");

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
    CREATE OR REPLACE VIEW myview`
  );
  await fromBeginning(false, createViewWithOptions);
  await typeAuto(" w");
  await typeAuto(" ");
  await typeAuto(" ");
  await typeAuto(" ");
  await typeAuto(" ");
  await testResult(createViewWithOptions + " WITH (check_option =cascaded , security_barrier =false)");

  const funcsColliding = fixIndent(`
    SELECT *
    FROM pg_stat_user_indexes ui
    WHERE `
  )
  await fromBeginning(false, funcsColliding);
  await typeAuto(` schem`);
  await testResult(funcsColliding + " ui.schemaname");

  const quotedSchemaBug = `
DROP SCHEMA IF EXISTS "MySchema" CASCADE;
CREATE SCHEMA "MySchema";
CREATE TABLE "MySchema"."MyTable" (
  "MyColumn" TEXT
);
CREATE FUNCTION "MySchema"."MyFunction" ()
 RETURNS VOID AS $$
BEGIN
END;
$$ LANGUAGE plpgsql;
  `;
  await runDbSQL(quotedSchemaBug);
  fromBeginning(false, "");
  await tout(2500);
  await typeAuto(`SELECT MyColu`);
  await moveCursor.up(2);
  await moveCursor.lineEnd();
  await typeAuto(`, MyFunc`);
  await testResult(fixIndent(`
    SELECT "MyColumn", "MySchema"."MyFunction"()
    FROM "MySchema"."MyTable"
    LIMIT 200`
  ));

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
  await testResult(`CREATE INDEX myidx ON "MySchema"."MyTable" (  "MyColumn" ) INCLUDE ("MyColumn")`)
  await runDbSQL(`DROP SCHEMA IF EXISTS "MySchema" CASCADE;`)

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
    SET`
  );
  fromBeginning(false, updateQuery);
  await typeAuto(` `);
  await testResult(fixIndent(`
    ${updateQuery} app_id
  `));

  /** Jsonb Path from cte */
  const cteQuery = `
    WITH cte1 AS (
      SELECT '{ "a": { "b": { "c": 222 } } }'::jsonb as j, 2 as z
    )`;
  fromBeginning(false, fixIndent(`
    ${cteQuery}
    SELECT
    FROM cte1
  `));
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
  await testResult(fixIndent(`
    ${cteQuery}
    SELECT j ->'a' ->'b' ->>'c'
    FROM cte1
    WHERE j ->'a' ->'b' ->>'c'
    AND z = '2'
  `));

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
  testResult(query + " t.commit_action = c.relpersistence\n  OR c.relkind = t.is_typed");

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
LIMIT 200`
    testResult(expected);

    fromBeginning();
    const expect2 = `SELECT * \nFROM pg_catalog.pg_stat_activity a\nWH`
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
    testResult(expect2 + `ERE left(a.application_name) = current_setting('allow_in_place_tablespaces')`);
  }
  await testFunctionArgs();

  /** Actions work */
  fromBeginning();
  await typeAuto(`ALTER TABLE`, { nth: -1 });
  getEditor().e.trigger("demo", "select2CB", {});
  await tout(500)
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
  if(!isOk){
    throw "Documentation not found";
  }
  const selectScript = `SELECT *
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public'`;

  /** AND/OR after WHERE */
  fromBeginning(false, selectScript);
  await typeAuto(`\na`);
  testResult(selectScript + "\nAND");

}