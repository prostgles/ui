import { fixIndent } from "../../../demo/sqlVideoDemo";
import { tout } from "../../../pages/ElectronSetup";
import type { DemoScript } from "../getDemoUtils";

export const mainTestScripts: DemoScript = async ({
  testResult,
  fromBeginning,
  typeAuto,
  moveCursor,
  typeText,
  newLine,
  runSQL,
  triggerSuggest,
  runDbSQL,
  getEditor,
  acceptSelectedSuggestion,
}) => {
  const testEditorValue = (
    key: keyof typeof SQL_TESTING_SCRIPTS | undefined,
    expectedValue?: string,
  ) => testResult(expectedValue ?? SQL_TESTING_SCRIPTS[key!]);

  /**
   * Multiple cte
   */
  const multipleCtes = fixIndent(`
    WITH cte1 AS (
      SELECT *
      FROM users
    ), cte2 AS (
      SELECT *
      FROM orders
    )
    SELECT * 
    FROM`);
  fromBeginning(false, multipleCtes);
  await typeAuto(" c2");
  testResult(multipleCtes + " cte2");

  fromBeginning(false, multipleCtes);
  await moveCursor.up(3);
  await moveCursor.lineEnd();
  await typeAuto("\nw");
  await typeAuto(" i");
  await tout(500);
  testResult(multipleCtes.replace("FROM orders", "FROM orders\n  WHERE id"));

  /** Cte joins */
  fromBeginning(false, multipleCtes);
  await typeAuto(" c2");
  await typeAuto(" c", { nth: -1 });
  await typeAuto("\nj");
  await typeAuto(" c1");
  await typeAuto(" c1", { nth: -1 });
  await typeAuto("\no");
  await typeAuto(" ui");
  await typeAuto(" ");
  await typeAuto(" c1.i");
  testResult(multipleCtes + ` cte2 c\nJOIN cte1 c1\nON c.user_id = c1.id`);

  /**
   * from subquery
   */
  const script = fixIndent(`
    SELECT *
    FROM (
      SELECT *
      FROM files
    ) f
    INNER JOIN my_table mt
      ON mt.files_id = f.id
    WHERE`);
  fromBeginning(false, script);
  await moveCursor.lineEnd();
  await typeAuto(` f.n`);
  await typeAuto(` `);
  await typeAuto(` mt.n`);
  testResult(`${script} f.name = mt.name`);

  /** Jsonb Path */
  await runDbSQL(`
    INSERT INTO plans (id, name, price, info)
    VALUES('premium', 'premium', 20, '{ "info": "plan info" }')
    ON CONFLICT DO NOTHING
  `);
  fromBeginning(false, ``);
  await typeAuto(`s`);
  await typeAuto(` info`);
  await moveCursor.lineStart();
  await moveCursor.lineEnd();
  await typeAuto(` `);
  await moveCursor.down();
  await moveCursor.lineEnd();
  await newLine();
  await typeAuto(`w`);
  await typeAuto(` in`);
  await typeAuto(` `);
  newLine();
  await typeAuto(`a`);
  await typeAuto(` `);
  await typeAuto(` `);
  await typeAuto(` ''`);
  await moveCursor.left(1);
  await triggerSuggest();
  await tout(500);
  acceptSelectedSuggestion();
  await testResult(
    fixIndent(`
    SELECT info ->>'info'
    FROM plans
    WHERE info ->>'info'
    AND id = 'basic'
    LIMIT 200
  `),
  );

  const jsonB = async () => {
    /**
     * JSONB selector autocomplete
     */
    fromBeginning();
    await typeAuto(`SEL`);
    await typeAuto(` req`);
    moveCursor.down();
    // await typeAuto(`\nF`);
    // await typeAuto(` lo`);
    await typeAuto(`\nW`);
    await typeAuto(` r`);
    await typeAuto(" ", { nth: 3 });
    await typeAuto(" is", { nth: 1 });
    await tout(1e3);
    // console.log({jsonb: e.getModel()?.getValue()});
    testEditorValue("jsonb");
  };

  const createPolicy = async () => {
    /**
     * JSONB selector autocomplete
     */
    fromBeginning();
    await typeAuto(`cr`);
    await typeAuto(` pol`);
    await typeAuto(` view_own_data`, { nth: -1, msPerChar: 10 });

    // newLine();
    await typeAuto(`\no`);
    await typeAuto(` use`);

    await typeAuto("\nf");
    await typeAuto(" s");

    await typeAuto("\nu");
    await typeAuto(" id");
    await typeAuto("= curuse");

    moveCursor.lineEnd();
    typeText(";");

    newLine(2);
    await typeAuto(`cr`);
    await typeAuto(` use`);
    await typeAuto(` user1;`, { nth: -1 });
    await runSQL();

    newLine(2);
    await typeAuto(`gr`);
    await typeAuto(` al`, { msPerChar: 100 });
    await typeAuto(` `);
    await typeAuto(`\ntablesi`);
    await typeAuto(` pu`);
    await typeAuto(` `);
    await typeAuto(` use`);
    await typeAuto(`;`, { nth: -1 });
    // console.log({createpolicy: e.getModel()?.getValue()})
    testEditorValue("createpolicy");
  };

  const schemaInspect = async () => {
    fromBeginning();
    typeText("?");
    await tout(100);
    triggerSuggest();
    await tout(100);
    await typeAuto("ta");
    await typeAuto(" use");
    triggerSuggest();
    // console.log({schemainspect: e.getModel()?.getValue()});
    testEditorValue("schemainspect");
    // typeAuto("?ta");
    // typeAuto(" us");

    await tout(2100);
  };

  const disableTrigger = async () => {
    fromBeginning();
    await typeAuto("alt");
    await typeAuto(" tab");
    await typeAuto(" app");
    await typeAuto("\ntrig", { nth: 1 });
    await typeAuto(" ", { nth: -1 });
    triggerSuggest();
    await tout(1e3);
  };

  const realtime = async () => {
    fromBeginning();
    await typeAuto(`CREATE TABLE some_table(col_0 INTEGER);`, {
      nth: -1,
      msPerChar: 10,
      triggerMode: "off",
    });
    await runSQL();
    newLine(2);
    await typeAuto(`--A column is created every second...`, {
      nth: -1,
      msPerChar: 50,
      triggerMode: "off",
    });
    await tout(200);
    await typeAuto(`\nALTER TABLE some_table \nALTER COLUMN `, {
      nth: -1,
      msPerChar: 10,
      triggerMode: "off",
    });
    triggerSuggest();

    let counter = 1;
    while (counter <= 5) {
      await runDbSQL(`ALTER TABLE some_table ADD COLUMN col_${counter} TEXT`);
      counter++;
      await tout(200);
    }
    await tout(1200);
    if (!window.document.documentElement.innerText.includes("col_4")) {
      throw "Realtime not working: col_4 not found";
    }
  };

  await createPolicy();
  await schemaInspect();
  await jsonB();
  await disableTrigger();
  await realtime();
};

export const SQL_TESTING_SCRIPTS = {
  createTable_users:
    'CREATE TABLE users (\n  id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  first_name  VARCHAR(150) NOT NULL,\n  last_name  VARCHAR(150) NOT NULL,\n  email  VARCHAR(255) NOT NULL UNIQUE \n   CONSTRAINT "prevent case and whitespace duplicates"\n   CHECK (email = trim(lower(email))),\n  created_at TIMESTAMP NOT NULL DEFAULT now() \n);',
  createTable_plans:
    "\nCREATE TABLE plans (\n  id TEXT PRIMARY KEY,\n  name  VARCHAR(150) NOT NULL,\n  price  DECIMAL(12,2) CHECK(price >= 0),\n  info JSONB\n);",
  createTable_subscriptions:
    '\nCREATE TABLE subscriptions (\n  created_at TIMESTAMP NOT NULL DEFAULT now(),\n  "plan_id" TEXT NOT NULL REFERENCES plans\n);',
  selectJoin:
    "\nSELECT *\nFROM users u\nLEFT JOIN subscriptions s\n  ON s.user_id = u.id",
  copy: `COPY plans ( id, name, price, info )\nFROM '/home/plans.csv' ( FORMAT CSV, HEADER, QUOTE '''' );`,
  insert:
    "\nINSERT INTO plans (id, name, price, info)\nVALUES ('basic', 'basic', 10, '{}');",
  createpolicy:
    '\nCREATE POLICY view_own_data\nON users\nFOR SELECT\nUSING (id = "current_user"() );\n\nCREATE USER user1;\n\nGRANT ALL ON\nALL TABLES IN SCHEMA public TO user1;',
  schemainspect: "\n?table users",
  jsonb:
    "\nSELECT request\nFROM logs\nWHERE request ->>'Authorization' IS NULL\nLIMIT 200",
  nestedSelects:
    "\nWITH cte1 AS (\n  SELECT *\n  FROM (\n    SELECT *\n    FROM geography_columns\n    WHERE coord_dimension = 1\n  ) t\n)\nSELECT * FROM cte1;\nSELECT st_point(1, 2)::GEOGRAPHY",
};
export type SqlTestingScripts = typeof SQL_TESTING_SCRIPTS;

// TODO "prostgles-server: add implied joins (if a-b-c (where a-b and b-c use the same columns from b) then add/allow a-c)";
