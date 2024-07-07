import { tout } from "../pages/ElectronSetup";
import type { DemoScript } from "../dashboard/W_SQL/getDemoUtils";
import { QUERY_WATCH_IGNORE } from "../../../commonTypes/utils";

export const sqlVideoDemo: DemoScript = async ({ 
  runDbSQL, fromBeginning, typeAuto, 
  moveCursor, triggerParamHints,  getEditor, 
  actions, testResult, getEditors, runSQL, newLine
}) => {
  const hasTable = await runDbSQL(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'chats'`, { }, { returnType: "value" });
  const existingUsers: string[] = await runDbSQL(`SELECT usename FROM pg_catalog.pg_user `, { }, { returnType: "values" });
  if(!hasTable){
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
      existingUsers.includes("mynewuser")? "" : `CREATE USER mynewuser;`,
      `GRANT ALL ON ALL TABLES IN SCHEMA public TO mynewuser;`,
      existingUsers.includes("vid_demo_user")? "" : `CREATE USER vid_demo_user;`,
      usersTable,
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
      `
    ];
    await runDbSQL(demoSchema.join("\n"));  
  }

  /** Force monaco to show the text in docker */
  getEditor().editor.querySelector<HTMLDivElement>(".monaco-editor")?.click();

  const waitAccept = 1e3;
  const waitBeforeAccept = .5e3;
  const showScript = async (title: string, logic: () => Promise<void>) => {
    fromBeginning(false, `/* ${title} */\n`);
    await tout(1000);
    await logic();
    await tout(1e3);
  }

  /** Context aware suggestions */
  await showScript(`Context aware suggestions`, async () => {
    const script = fixIndent(`
      /* Context aware suggestions */
      SELECT u.id, latest_orders.*
      FROM users u
      LEFT JOIN LATERAL (
        SELECT *
        FROM orders o
        WHERE
        LIMIT 10
      ) latest_orders
        ON TRUE
    `);
    fromBeginning(false, script);
    await moveCursor.lineEnd();
    await moveCursor.up(3, 300);
    await moveCursor.lineEnd();
    await tout(500);
    await typeAuto(" u.i", { waitBeforeAccept: 1e3 });
    await typeAuto(` `);
    await typeAuto(" o.", { waitBeforeAccept: 1e3 });
    testResult(script.replace("WHERE", "WHERE u.id = o.user_id"))
  });

  /** Join complete */
  await showScript(`Joins autocomplete`, async () => {
    await fromBeginning(false, `/* Joins autocomplete */\nSELECT * \nFROM users u`);
    await typeAuto(`\nleft`, { msPerChar: 40, waitAccept: 1e3 });
    await typeAuto(` `, { msPerChar: 40, waitAccept: 1e3 });
  });
  
  /** Current statement execution */
  await showScript(`Current statement execution`, async () => {
    const script = fixIndent(`
      /* Current statement execution */
      SELECT * 
      FROM chat_members
      
      SELECT * 
      FROM users
    `);
    fromBeginning(false, script);
    await actions.selectCodeBlock();
    await tout(700);
    await moveCursor.up(4, 30);
    await tout(500);
    await actions.selectCodeBlock();
    await tout(500);
    await moveCursor.up(4, 30);
    await tout(500);
    await actions.selectCodeBlock();
    await tout(500);
  })
  
  /** Selection expansion */
  await showScript(`Selection/statement expansion`, async () => {
    const script = fixIndent(`
      /* Selection/statement expansion */
      SELECT *
      FROM users u
      LEFT JOIN (
        SELECT *
        FROM orders o
        LEFT JOIN (
          SELECT *
          FROM order_items
        ) oi
        ON oi.order_id = o.id
        GROUP BY user_id
      ) o
      ON o.user_id = u.id
    `);
    fromBeginning(false, script);
    await moveCursor.up(4, 100);
    await tout(500);
    for (let i = 0; i < 3; i++) {
      actions.selectCodeBlock();
      await tout(500);
    }
  });

  /** Documentation and ALL CATALOGS SUGGESTED */
  await showScript(`Schema and context aware suggestions`, async () => {
    await typeAuto(`SEL`, { msPerChar: 40, waitAccept });
    await typeAuto(` query`, { msPerChar: 40, waitAccept, nth: 1 });
    await typeAuto(`, md`, { msPerChar: 40, waitAccept });
    await typeAuto(`(`, { msPerChar: 40, waitAccept: 0, dontAccept: true });
    triggerParamHints();
    await tout(500);
    await typeAuto("q", { waitBeforeAccept: 1e3 });
  });

  await showScript("Documentation extracts", async () => {
    await typeAuto(`c`, { msPerChar: 40, waitAccept, waitBeforeAccept });
    await typeAuto(` us`, { msPerChar: 40, waitBeforeAccept });
    await typeAuto(` mynewuser`, { msPerChar: 4, dontAccept: true });
    await newLine()
    await typeAuto(`pass`, { msPerChar: 140, waitAccept, waitBeforeAccept });
  });
  await showScript(`Schema extracts`, async () => {
    await typeAuto(`a`, { msPerChar: 40, waitAccept, waitBeforeAccept });
    await typeAuto(` ta`, { msPerChar: 40 });
    await typeAuto(` us`, { msPerChar: 40, waitAccept, waitBeforeAccept });
    await typeAuto(`\nalt`, { msPerChar: 40, waitAccept: 1e3 });
    await typeAuto(` padm`, { waitAccept: 1e3 });
    await newLine();
    await typeAuto(`def`, { waitAccept });
    await typeAuto(` FALSE`, { dontAccept: true, nth: -1 });
    testResult(fixIndent(`
      /* Schema extracts */
      ALTER TABLE users
      ALTER COLUMN passwordless_admin
      SET DEFAULT FALSE`
    ));
  });

  await showScript("User access details", async () => {
    await typeAuto(`gr`);
    await typeAuto(` sel`);
    await typeAuto(` usern`);
    await typeAuto(` `);
    await typeAuto(` myne`);
    await runSQL();
    await tout(1e3);
  });

  await showScript("User access details", async () => {
    await typeAuto(`?user `, { msPerChar: 40, waitBeforeAccept: 1e3, nth: 1, dontAccept: true });
    await moveCursor.left();
    await typeAuto(` mynew`);
    testResult([
      "/* User access details */",
      "?user mynewuser"
    ].join("\n"));
  });

  /** Insert value suggestions */
  await showScript(`Argument hints`, async () => {
    await typeAuto(`INSE`, { msPerChar: 40, waitAccept: 1e3 });
    await typeAuto(` users`, { msPerChar: 40, nth: 1 });
    await typeAuto(`(`, { nth: -1 });
    await typeAuto(`DEFAULT,`, { nth: -1 });
  });

  await showScript(`Settings details`, async () => {
    await typeAuto(`SET`, { msPerChar: 40, waitAccept: 1e3 });
    await typeAuto(` wm`, { msPerChar: 40, waitAccept: 1e3 });
    await typeAuto(` `);
    await typeAuto(` `, { msPerChar: 40, waitAccept: 1e3, nth: -1 });
  });

  await tout(1e3);
  fromBeginning(false);
  await typeAuto(`GRANT SE`, { msPerChar: 40, waitAccept: 1e3, nth: 1 });
  await typeAuto(`\nall`, { msPerChar: 40, waitAccept: 1e3 });
  await typeAuto(` pub`, { msPerChar: 40, waitAccept: 1e3 });
  await typeAuto(`\n`, { msPerChar: 40, waitAccept: 1e3 });
  await typeAuto(` myn`, { msPerChar: 40, waitAccept: 1e3 });
  testResult(fixIndent(`
    GRANT SELECT ON
    ALL TABLES IN SCHEMA public
    TO mynewuser`)
  );
}

/**
 * Ensure that multi-line strings are indented correctly
 */
export const fixIndent = (str: string) => {
  const lines = str.split("\n");
  if(!lines.some(l => l.trim())) return str;
  let minIdentOffset = lines.reduce((a, line) => {
    if(!line.trim()) return a;
    const indent = line.length - line.trimStart().length;
    return Math.min(a ?? indent, indent);
  }, undefined as number | undefined);
  minIdentOffset = Math.max(minIdentOffset ?? 0, 0);

  return lines
    .map((l, i) => i === 0 ? l : l.slice(minIdentOffset))
    .join("\n")
    .trim();
}