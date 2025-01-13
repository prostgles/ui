import { QUERY_WATCH_IGNORE } from "../../../../../commonTypes/utils";
import { tout } from "../../../pages/ElectronSetup";
import type { DemoScript, TypeAutoOpts } from "../getDemoUtils";
import { SQL_TESTING_SCRIPTS, type SqlTestingScripts } from "./mainTestScripts";

export const createTables: DemoScript = async ({
  fromBeginning,
  typeAuto,
  runDbSQL,
  getEditor,
  moveCursor,
  goToNextSnipPos,
  newLine,
  goToNextLine,
  runSQL,
  typeText,
  testResult,
  triggerParamHints,
}) => {
  const testEditorValue = (
    key: keyof SqlTestingScripts | undefined,
    expectedValue?: string,
  ) => testResult(expectedValue ?? SQL_TESTING_SCRIPTS[key!]);
  const createTable = async ({
    tableName,
    cols,
  }: {
    tableName: string;
    cols: { text: string; opts?: TypeAutoOpts }[];
  }) => {
    const newCol = async (wait = 500) => {
      await typeText(",");
      newLine();
      await tout(wait);
    };
    await typeAuto("cr");
    await typeAuto(" ta");
    await typeAuto(tableName, { triggerMode: "off", nth: -1 });
    goToNextSnipPos();

    for (const [idx, col] of cols.entries()) {
      // if(col.text.includes("cre")) debugger
      await typeAuto(col.text, {
        triggerMode: "firstChar",
        msPerChar: 120,
        ...col.opts,
      });
      if (idx < cols.length - 1) {
        await newCol();
        const { e } = getEditor();
        if (
          e
            .getModel()
            ?.getLineContent(e.getPosition()?.lineNumber as any)
            .endsWith("   ")
        ) {
          moveCursor.left();
        }
      }
    }

    goToNextLine();
    console.log(Date.now(), "Created table: ", tableName);
    await runSQL();
    await tout(1000);
  };

  /**
   * Reset schema
   * Create example data
   */
  getEditor().e.setValue("");
  await runDbSQL(initScript);
  getEditor().e.setValue("");

  await tout(2000);
  /**
   * Create table users
   * columns are auto-completed
   */
  await createTable({
    tableName: "users",
    cols: [
      { text: "idugen" },
      { text: "fir" },
      { text: "last", opts: { nth: 1 } },
      { text: "ema" },
      { text: "cre" },
    ],
  });
  testEditorValue("createTable_users");

  /**
   * Create table plans
   */
  fromBeginning();
  await createTable({
    tableName: "plans",
    cols: [
      { text: "id TEXT pri" },
      { text: "nam" },
      { text: "pric" },
      { text: "info js", opts: { nth: 2 } },
    ],
  });
  testEditorValue("createTable_plans");

  /**
   * Create table subscriptions
   * add referenced column
   */
  fromBeginning();
  await createTable({
    tableName: "subscriptions",
    cols: [{ text: "crea" }, { text: "pla" }],
  });
  testEditorValue("createTable_subscriptions");

  /**
   * Alter table users
   * Add referenced column
   */
  fromBeginning();
  await typeAuto("alt", {});
  await typeAuto(" ta", {});
  await typeAuto(" su", {});
  await typeAuto(" \naco", {});
  await typeAuto(" use", { nth: 2 });
  await typeAuto(";", { nth: -1 });
  testResult(
    '\nALTER TABLE subscriptions \nADD COLUMN "user_id" UUID NOT NULL REFERENCES users;',
  );
  await runSQL();

  /**
   * Select join autocomplete
   */
  fromBeginning();
  await typeAuto("sel");
  await typeAuto(" ");
  await typeAuto("\n");
  await typeAuto(" users u", { dontAccept: true });
  await typeAuto("\nlef");
  await typeAuto(" s");
  testEditorValue("selectJoin");
  await runSQL();

  /**
   * WITH and nested select
   */
  fromBeginning();
  await typeAuto("WITH cte1 AS ()", { nth: -1 });
  moveCursor.left();
  await typeAuto("\nse");
  await typeAuto(" ");
  await typeAuto("\n"); // FROM
  await typeAuto(" ()", { nth: -1 });
  moveCursor.left();
  await typeAuto("\n"); // SELECT
  await typeAuto(" ");
  await typeAuto("\n"); // FROM
  await typeAuto(" geo");
  await typeAuto("\nwh");
  await typeAuto(" coord");
  await typeAuto(" = 1", { nth: -1 });
  moveCursor.down();
  await typeAuto(" t", { nth: -1 });
  moveCursor.down();
  await newLine();
  await typeAuto("SELECT * fr");
  await typeAuto(" cte1;", { nth: -1 });
  await newLine();
  await typeAuto("SELECT st_point(1, 2)", { nth: -1 });
  await typeAuto("::geog");
  testEditorValue("nestedSelects");

  /**
   * insert cols/vals autocomplete
   */
  fromBeginning();
  await typeAuto("ins");
  await typeAuto(" pl");
  await typeAuto(" ()", { nth: -1 });
  moveCursor.left();
  triggerParamHints();
  await typeAuto("'basic', 'basic', 10, '{}'", { msPerChar: 200, nth: -1 });
  moveCursor.right();
  moveCursor.right();
  await typeAuto(";", { nth: -1 });
  testEditorValue("insert");
  await runSQL();

  const copyData = async () => {
    /**
     * Copy data to table
     */
    fromBeginning();
    await typeAuto("cop");
    await typeAuto(" p");
    await typeAuto(" ");
    newLine();
    await typeAuto("f");
    await typeAuto(" h");
    moveCursor.left();
    await typeAuto("/");
    moveCursor.right();
    await typeAuto(" ");
    await typeAuto("for");
    await typeAuto(" c");
    await typeAuto(", hea");
    await typeAuto(", qu");
    await typeAuto(" ", { nth: 1 });
    moveCursor.right();
    moveCursor.right();
    await typeAuto(";", { nth: -1 });
    // console.log({copy: e.getModel()?.getValue()})
    testEditorValue("copy");
    await runSQL();
  };
  // Disabled because csv is missing in vm
  // await copyData();
};

const initScript =
  ["users", "plans", "subscriptions", "logs", "some_table"]
    .map((v) => `DROP TABLE IF EXISTS ${v} CASCADE;`)
    .join("") +
  `
/* ${QUERY_WATCH_IGNORE}  */
DROP USER IF EXISTS user1;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE logs(id BIGSERIAL, request JSONB, created_at TIMESTAMP NOT NULL DEFAULT NOW());
INSERT INTO logs(request) VALUES($$ {
    "Host": "www.example.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": "https://www.google.com/",
    "Cookie": "PHPSESSID=1234567890abcdef; _ga=GA1.2.1234567890.1234567890; _gid=GA1.2.1234567890.1234567890",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
    "If-Modified-Since": "Thu, 21 Oct 2021 12:00:00 GMT",
    "If-None-Match": "etag1234567890"
  } $$), ($$

    {
      "Host": "api.example.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36",
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Authorization": "Bearer eyJhbGciOiJJHMINGyomsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMIJgDHMWAGIJKLKI>FtZSI6IkpvaG4gRG9lIiwUHUYGMMjM5MDIyfQ.SflKxwRJOYGRLMJHBGKJf36POk6yJV_adQssw5c",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    }
    
  $$);
`;
