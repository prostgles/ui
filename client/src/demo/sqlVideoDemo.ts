import { fixIndent } from "../../../commonTypes/utils";
import {
  getDemoUtils,
  type DemoScript,
  type TypeAutoOpts,
} from "../dashboard/W_SQL/getDemoUtils";
import { VIDEO_DEMO_DB_NAME } from "../dashboard/W_SQL/TestSQL";
import { tout } from "../pages/ElectronSetup";
import { closeAllViews } from "./dashboardDemo";
import { click, getElement, movePointer, waitForElement } from "./demoUtils";

export { fixIndent };
const sqlVideoDemo: DemoScript = async (args) => {
  const {
    runDbSQL,
    fromBeginning,
    typeAuto,
    moveCursor,
    triggerParamHints,
    getEditor,
    actions,
    testResult,
    triggerSuggest,
    runSQL,
    newLine,
  } = args;
  const hasTable = await runDbSQL(
    `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = current_schema() AND tablename = 'chats'`,
    {},
    { returnType: "value" },
  );
  const existingUsers: string[] = await runDbSQL(
    `SELECT usename FROM pg_catalog.pg_user `,
    {},
    { returnType: "values" },
  );
  if (!hasTable) {
    // alert("Creating demo tables. Must run demo script again");
    const usersTable = `CREATE TABLE IF NOT EXISTS users  (
      "id" UUID PRIMARY KEY DEFAULT null,
      "status" TEXT NOT NULL DEFAULT 'active'::text,
      "username" TEXT NOT NULL DEFAULT null,
      "password" TEXT NOT NULL DEFAULT gen_random_uuid(),
      "type" TEXT NOT NULL DEFAULT 'default'::text,
      "passwordless_admin" BOOL  DEFAULT null,
      "created" TIMESTAMP  DEFAULT now(),
      "last_updated" INT8  DEFAULT (EXTRACT(epoch FROM now()) * (1000)::numeric),
      "options" JSONB  DEFAULT null,
      "2fa" JSONB  DEFAULT null,
      "has_2fa_enabled" BOOLEAN GENERATED ALWAYS AS ( ("2fa"->>'enabled')::BOOLEAN ) STORED
      );
    `;
    const demoSchema = [
      `DROP TABLE IF EXISTS users, chats, chat_users, chat_members, contacts, orders, messages CASCADE;`,
      existingUsers.includes("mynewuser") ? "" : `CREATE USER mynewuser;`,
      `GRANT ALL ON ALL TABLES IN SCHEMA public TO mynewuser;`,
      existingUsers.includes("vid_demo_user") ? "" : (
        `CREATE USER vid_demo_user;`
      ),
      usersTable,
      `INSERT INTO users(id, status, username, password, type, options) VALUES (gen_random_uuid(), 'active', 'user78679', '****', 'default', '{ "theme": "light", "viewedSqlTips": true, "language": "en-US", "timeZone": "America/New_York" }'::JSONB);`,
      `INSERT INTO users(id, status, username, password, type, options) VALUES (gen_random_uuid(), 'active', 'user219', '****', 'customer', '{ "theme": "from-system", "viewedSqlTips": false }'::JSONB);`,
      `INSERT INTO users(id, status, username, password, type, options) VALUES (gen_random_uuid(), 'active', 'user219', '****', 'defaultl', '{ "theme": "dark", "viewedSqlTips": true }'::JSONB);`,
      `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users, total_price DECIMAL(12,2) CHECK(total_price >= 0), created_at TIMESTAMP  DEFAULT now());`,
      `CREATE TABLE IF NOT EXISTS chats (id BIGSERIAL PRIMARY KEY);`,
      `CREATE TABLE IF NOT EXISTS chat_members (chat_id BIGINT NOT NULL REFERENCES chats, user_id UUID NOT NULL REFERENCES users, UNIQUE(chat_id, user_id));`,
      `CREATE TABLE IF NOT EXISTS contacts ( user_id UUID REFERENCES users, contact_user_id UUID REFERENCES users, added_on TIMESTAMP DEFAULT now(), PRIMARY KEY (user_id, contact_user_id));`,
      `CREATE TABLE IF NOT EXISTS messages (id BIGSERIAL PRIMARY KEY, chat_id BIGINT REFERENCES chats, sender_id UUID REFERENCES users, message_text TEXT NOT NULL CHECK (length(trim(message_text)) > 0), timestamp TIMESTAMP DEFAULT now(), seen_at TIMESTAMP);`,
      `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM vid_demo_user;`,
      `
    -- Alter Default Privileges for Future Tables
      ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE vid_demo_user
      REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM vid_demo_user;
      `,
    ];
    await runDbSQL(demoSchema.join("\n"));
  }

  await runDbSQL(`DROP POLICY IF EXISTS read_own_data ON users;`);

  /** Force monaco to show the text in docker */
  const focusEditor = () => {
    getEditor().editor.querySelector<HTMLDivElement>(".monaco-editor")?.click();
  };
  focusEditor();

  const waitAccept = 1e3;
  const waitBeforeAccept = 0.5e3;
  const showScript = async (
    title: string,
    script: string,
    logic: () => Promise<void>,
  ) => {
    fromBeginning(false, `/* ${title} */\n${script}`);
    await tout(1000);
    await logic();
    await tout(1e3);
  };

  const typeQuick = (text: string, opts?: TypeAutoOpts) => {
    return typeAuto(text, {
      msPerChar: 0,
      waitBeforeAccept: 0.5e3,
      waitAccept: 0,
      ...opts,
    });
  };

  await timeChartDemo(args);

  /** Join complete */
  await showScript(
    `Joins autocomplete`,
    `SELECT * \nFROM users u`,
    async () => {
      await typeQuick(`\nleft`);
      await typeQuick(` `, { msPerChar: 40, waitAccept: 0, nth: 2 });
    },
  );

  /** Context aware suggestions */
  const script = fixIndent(`
    /** Schema and context aware suggestions */
    SELECT u.id, latest_orders.*
    FROM users u
    LEFT JOIN LATERAL (
      SELECT *
      FROM orders o
      WHERE u.id = o.user_id
      ORDER BY
      LIMIT 10
    ) latest_orders
      ON TRUE
    `);
  await fromBeginning(false, script);
  await moveCursor.lineEnd();
  await moveCursor.up(3);
  await moveCursor.lineEnd();
  await tout(500);
  await typeAuto(" o.");
  await typeAuto(" d");
  testResult(script.replace("ORDER BY", "ORDER BY o.created_at DESC"));

  /** Documentation and ALL CATALOGS SUGGESTED */
  // await showScript(`Schema and context aware suggestions`, "", async () => {
  //   await typeQuick(`SEL` );
  //   await typeQuick(` query`, { nth: 1 });
  //   await typeQuick(`, md` );
  //   await typeAuto(`(`, { dontAccept: true });
  //   triggerParamHints();
  //   await tout(500);
  //   await typeQuick("q" );
  // });

  await showScript(
    `Data aware suggestions, jsonb support`,
    `SELECT`,
    async () => {
      await typeQuick(` opt`);
      await moveCursor.lineEnd();
      await typeQuick(`, age(cr`, { waitBeforeAccept: 1500 });
      await moveCursor.down(1);
      await moveCursor.lineEnd();
      await newLine();
      await typeQuick(`W`, { triggerMode: "firstChar", waitBeforeAccept: 500 });
      await typeQuick(` opt`);
      await typeAuto(` the`, { waitAccept: 1e3 });
      await typeQuick(` `);
      await typeAuto(` '`, {
        msPerChar: 55,
        waitAccept: 500,
        triggerMode: "firstChar",
        waitBeforeAccept: 500,
      });
      testResult(
        `/* Data aware suggestions, jsonb support */\nSELECT options, age(created)\nFROM users\nWHERE options ->>'theme' = 'dark'\nLIMIT 200`,
      );
    },
  );

  /** Current statement execution */
  await showScript(
    `Current statement execution`,
    fixIndent(`
      SELECT * 
      FROM orders
      
      SELECT * 
      FROM`),
    async () => {
      // await actions.selectCodeBlock();
      await moveCursor.up(4, 30);
      await tout(500);
      await actions.selectCodeBlock();
      await runSQL();
      focusEditor();
      await moveCursor.down(4, 30);
      await moveCursor.lineEnd();
      await typeAuto(" use");
      await actions.selectCodeBlock();
      await tout(500);
      await runSQL();
      await newLine(2);
      await typeAuto(`SEL`);
      await actions.selectCodeBlock();
      await tout(500);
      await runSQL();
    },
  );

  /** Selection expansion */
  // await showScript(`Selection/statement expansion`, async () => {
  //   const script = fixIndent(`
  //     /* Selection/statement expansion */
  //     SELECT *
  //     FROM users u
  //     LEFT JOIN (
  //       SELECT *
  //       FROM orders o
  //       LEFT JOIN (
  //         SELECT *
  //         FROM order_items
  //       ) oi
  //       ON oi.order_id = o.id
  //       GROUP BY user_id
  //     ) o
  //     ON o.user_id = u.id
  //   `);
  //   fromBeginning(false, script);
  //   await moveCursor.up(4, 100);
  //   await tout(500);
  //   for (let i = 0; i < 3; i++) {
  //     actions.selectCodeBlock();
  //     await tout(500);
  //   }
  // });

  await showScript("Documentation and schema extracts", "", async () => {
    await typeQuick(`cr`, { msPerChar: 40, waitAccept, waitBeforeAccept });
    await typeQuick(` us`, { msPerChar: 40, waitBeforeAccept });
    await typeQuick(` mynewuser`, { msPerChar: 4, dontAccept: true });
    await newLine();
    await typeQuick(`pass`, { msPerChar: 140, waitAccept, waitBeforeAccept });

    await newLine(2);
    await typeQuick(`gr`);
    await typeQuick(` sel`);
    await typeQuick(` usern`);
    await typeQuick(` `);
    await typeQuick(` myne`);
    await runSQL();
    await newLine(2);

    await typeAuto(`cre`);
    await typeAuto(` pol`);
    await typeAuto(` read_own_data`, { dontAccept: true });
    await typeAuto(`\n`);
    await typeAuto(` us`);
    await typeAuto(` f`);
    await typeAuto(` se`);
    await typeAuto(`\n`);
    await typeAuto(` myn`);
    await typeAuto(`\n`);
    await typeAuto(` id`);
    await typeAuto(`= userid`);
    await tout(1e3);
    await runSQL();
  });

  await showScript("Schema extracts with access details", "", async () => {
    await typeQuick(`?user `, { nth: 1, dontAccept: true });
    await moveCursor.left();
    await typeQuick(` mynew`, { waitBeforeAccept: 2e3 });
    testResult(
      ["/* Schema extracts with access details */", "?user mynewuser"].join(
        "\n",
      ),
    );
  });

  await showScript(`Schema extracts with related objects`, "", async () => {
    await typeQuick(`a`, { msPerChar: 40, waitAccept, waitBeforeAccept });
    await typeQuick(` ta`, { msPerChar: 40 });
    await typeQuick(` us`, { msPerChar: 40, waitAccept, waitBeforeAccept });
    await typeQuick(`\nalt`);
    await typeQuick(` padm`, { waitAccept: 1e3 });
    await newLine();
    await typeQuick(`def`, { waitAccept });
    await typeQuick(` FALSE`, { dontAccept: true, nth: -1 });
    testResult(
      fixIndent(`
      /* Schema extracts with related objects */
      ALTER TABLE users
      ALTER COLUMN passwordless_admin
      SET DEFAULT FALSE`),
    );
  });

  /** Insert value suggestions */
  await showScript(`Argument hints`, "", async () => {
    await typeQuick(`INSE`);
    await typeQuick(` users`, { nth: 1 });
    await typeQuick(`(`, { nth: -1 });
    await typeQuick(`DEFAULT)`, { nth: -1 });
    await moveCursor.left(1);
    await typeAuto(`,`, { waitAccept: 1e3, nth: -1 });
    await typeAuto(`1,`, { waitAccept: 1e3, nth: -1 });
  });

  await showScript(`Settings details`, "", async () => {
    await typeQuick(`SET`);
    await typeQuick(` wm`, { waitBeforeAccept: 2e3 });
    await typeQuick(` `);
    await typeQuick(` `, { waitBeforeAccept: 1e3 });
  });

  // await tout(1e3);
  // fromBeginning(false);
  // await typeQuick(`GRANT SE`, { nth: 1 });
  // await typeQuick(`\nall`);
  // await typeQuick(` pub`);
  // await typeQuick(`\n`);
  // await typeQuick(` myn`);
  // testResult(fixIndent(`
  //   GRANT SELECT ON
  //   ALL TABLES IN SCHEMA public
  //   TO mynewuser`)
  // );

  // await runSQL();
};

// /**
//  * Ensure that multi-line strings are indented correctly
//  */
// export const fixIndent = (_str: string | TemplateStringsArray): string => {
//   const str = typeof _str === "string" ? _str : (_str[0] ?? "");
//   const lines = str.split("\n");
//   if (!lines.some((l) => l.trim())) return str;
//   let minIdentOffset = lines.reduce(
//     (a, line) => {
//       if (!line.trim()) return a;
//       const indent = line.length - line.trimStart().length;
//       return Math.min(a ?? indent, indent);
//     },
//     undefined as number | undefined,
//   );
//   minIdentOffset = Math.max(minIdentOffset ?? 0, 0);

//   return lines
//     .map((l, i) => (i === 0 ? l : l.slice(minIdentOffset)))
//     .join("\n")
//     .trim();
// };

export const sqlDemo = async () => {
  await closeAllViews();
  await click("dashboard.menu");
  await click("dashboard.menu.sqlEditor");
  await tout(1500);
  await movePointer(-20, -20);
  const getSqlWindow = () =>
    Array.from(
      document.querySelectorAll<HTMLDivElement>(
        `[data-box-id][data-box-type=item]`,
      ),
    ).find((n) => n.querySelector(".ProstglesSQL"));
  if (!getSqlWindow()) {
    click("dashboard.menu.sqlEditor");
    await tout(1500);
  }
  const sqlWindow = getSqlWindow();
  const id = sqlWindow?.dataset!.boxId;
  if (!sqlWindow || !id) throw "not ok";
  await (window as any).dbs.windows.update(
    { id },
    { sql_options: { $merge: [{ executeOptions: "smallest-block" }] } },
  );
  await tout(1500);
  const testUtils = getDemoUtils({ id });

  const currDbName = await testUtils.runDbSQL(
    `SELECT current_database() as db_name`,
    {},
    { returnType: "value" },
  );
  if (currDbName === VIDEO_DEMO_DB_NAME) {
    return sqlVideoDemo(testUtils);
  }
};

const timeChartDemo: DemoScript = async ({
  fromBeginning,
  newLine,
  moveCursor,
  getEditor,
  runSQL,
}) => {
  await fromBeginning(
    false,
    fixIndent(`
    SELECT *, random() as rval
    FROM generate_series(
      '2021-01-01'::timestamp, 
      '2021-01-31'::timestamp, 
      '1 day'::interval
    ) as date 
  `),
  );
  const addTChartBtn = await waitForElement<HTMLButtonElement>(
    "AddChartMenu.Timechart",
  );
  addTChartBtn.click();

  const layer = await waitForElement<HTMLButtonElement>(
    "TimeChartLayerOptions.aggFunc",
  );

  /** Shows numeric col avg by default */
  shouldBeEqual(layer.innerText, "Avg(\nrval\n),\ndate");

  /** Cannot add the same layer */
  shouldBeEqual(addTChartBtn.disabled, true);

  const setLayerFunc = async (func: "$avg" | "$countAll", layerNumber = 0) => {
    await click("TimeChartLayerOptions.aggFunc", "", { nth: layerNumber });
    await click("TimeChartLayerOptions.aggFunc.select");
    await click(
      "TimeChartLayerOptions.aggFunc.select",
      `[data-key=${JSON.stringify(func)}]`,
    );
    await click("Popup.close");
    await tout(222);
  };

  /** Count all works */
  await setLayerFunc("$countAll");
  shouldBeEqual(layer.innerText, "count(*), date");

  /** Switch back */
  await setLayerFunc("$avg");
  shouldBeEqual(layer.innerText, "Avg(\nrval\n),\ndate");

  const addSqlLayer = async (sql: string) => {
    await moveCursor.pageDown();
    await moveCursor.lineEnd();
    await newLine(3);
    const newQ = fixIndent(sql);
    getEditor().e.setValue(getEditor().e.getValue() + newQ);

    moveCursor.pageDown();
    moveCursor.up(3, 50);
    moveCursor.down(2, 50);

    await tout(2000);
    await click("AddChartMenu.Timechart");
  };

  /** Add another layer */
  await addSqlLayer(`
    SELECT *, 10 * random() as rvalx10
    FROM generate_series(
      '2021-01-01'::timestamp, 
      '2021-01-31'::timestamp, 
      '1 day'::interval
    ) as date 
  `);

  const secondLayer = await waitForElement<HTMLButtonElement>(
    "TimeChartLayerOptions.aggFunc",
    "",
    { nth: 1 },
  );
  shouldBeEqual("Avg(\nrvalx10\n),\ndate", secondLayer.innerText);

  /** Add group by layer */
  await addSqlLayer(`
    SELECT *
      , 10 * random() as rvalx11
      , CASE WHEN random() > .3 then 'g1' when random() > .6 then 'g2' else 'g3' END as groupbyval
    FROM generate_series(
      '2021-01-01'::timestamp, 
      '2021-01-31'::timestamp, 
      '1 day'::interval
    ) as date 
  `);
  const thirdLayer = await waitForElement<HTMLButtonElement>(
    "TimeChartLayerOptions.aggFunc",
    "",
    { nth: 2 },
  );
  shouldBeEqual("Avg(\nrvalx11\n),\ndate", thirdLayer.innerText);
  thirdLayer.click();

  /**
   * Group by column
   */
  await click("TimeChartLayerOptions.groupBy");
  await click("TimeChartLayerOptions.groupBy", `[data-key="groupbyval"]`);
  await click("Popup.close");

  await click("dashboard.window.closeChart");
};

export const shouldBeEqual = (a: any, b: any) => {
  if (a !== b) {
    throw new Error(`Expected ${a} to equal ${b}`);
  }
};
