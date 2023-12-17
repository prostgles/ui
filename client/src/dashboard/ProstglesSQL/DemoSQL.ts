import { Command, getCommandElemSelector } from "../../Testing";
import { tout } from "../../pages/ElectronSetup";
import { TopHeaderClassName, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { triggerCharacters } from "../SQLEditor/SQLCompletion/registerSuggestions";
import { SQLEditorRef } from "../SQLEditor/SQLEditor"; 

export const DemoSQL = async (w: WindowSyncItem<"sql">) => {
  const editor = document.querySelector<HTMLDivElement>(`[data-box-id="${w.id}"] .ProstglesSQL`);
  if(!editor) return;

  alert("Ensure cursor is inside the editor so suggestions show as expected");
  await tout(1000);

  const runDbSQL = (sql: string) => {
    return (window as any).db?.sql(sql);
  }
  const e = ((editor as any).sqlRef as SQLEditorRef).editor;
  const moveCursor = {
    left: () => e.trigger('' , 'cursorLeft', {}),
    down: () => e.trigger('' , 'cursorDown', {}),
    right: () => e.trigger('' , 'cursorRight', {}),
    up: () => e.trigger('' , 'cursorUp', {}),
  }
  const triggerSuggest = () => {
    if(window.getSelection()?.toString()){
      return;
    }
    e.trigger('demo', 'editor.action.triggerSuggest', {});
  }
  const triggerParamHints = () => e.trigger('demo', 'editor.action.triggerParameterHints', {});

  const newLine = (n = 1) => { 
    e.trigger('', 'editor.action.insertLineAfter', {});  
    const remaining = n - 1;
    if(remaining > 0){
      newLine(remaining);
    }
  };
  type TypeOpts = { msPerChar?: number; triggerMode?: "off" | "firstChar"; newLinePress?: boolean; };
  const typeText = (v: string, onEnd?: (triggeredSuggest: boolean) => void, opts?: TypeOpts) => {
    const { msPerChar = 80, triggerMode, newLinePress } = opts ?? {};
    const chars = v.split("");
    let triggered = 0;
    const press = async () => {
      const char = chars.shift();
      if(newLinePress && char === "\n"){ // disabled cause it affects inline constraint indentation
        newLine();
      } else { 
        // e.trigger("keyboard", "editorCommon.Handler.Type", { text: char });
        e.trigger('keyboard', 'type', { text: char });
        if(
          !triggerMode && triggerCharacters.includes(char as any) ||
          triggerMode === "firstChar" && !triggered && char?.match(/^[a-z0-9]+$/i)
        ){
          triggered++;
          triggerSuggest();
          await tout(500);
        }
      }

      if(chars.length){
        setTimeout(press, msPerChar)
      } else {
        onEnd?.(triggered > 0);
      }
    }
    press();
  }

//   window.tt = typeText;
//   window.t = triggerSuggest;
// return;

  type TypeAutoOpts = { nth?: number; wait?: number; waitAccept?: number; onEnd?: VoidFunction; } & TypeOpts
  const typeAuto = (v: string, opts?: TypeAutoOpts) => {
    const {nth = 0, wait = 0, waitAccept = 600, onEnd, ...typeOpts } = opts ?? {};
    return new Promise((resolve, reject) => {
      typeText(v, (triggeredSuggest) => {
        if(nth > -1 && !triggeredSuggest){
          triggerSuggest();
        }
        setTimeout(async() => {
          if(nth > -1){
            for(let n = 0; n < nth; n++){
              await tout(100);
              e.trigger('demo', 'selectNextSuggestion', {});
              await tout(500);
            }
            e.trigger('demo', 'acceptSelectedSuggestion', {});
          }
          setTimeout(async () => {
            if(wait) await tout(wait);
            await onEnd?.();
            resolve(1);
          }, 500)
        }, waitAccept);
      }, typeOpts);
    })
  }

  const goToNextSnipPos = () => {
    //@ts-ignore
    e.getContribution("snippetController2")?.next()
  }
  const goToNextLine = () => {
    moveCursor.down()
  }
  const sqlAction = async (type: "kill-query" | "stop-listen" | "run") => {
    await tout(50);
    const selector = type === "stop-listen"? "dashboard.window.stopListen" : type === "kill-query"? "dashboard.window.cancelQuery" : "dashboard.window.runQuery";
    const button = editor.querySelector<HTMLButtonElement>(getCommandElemSelector(selector)); 
    if(!button) throw type + " button not found";
    button.click();
    await tout(1300);

  }
  const runSQL = async () => sqlAction("run")
  const fromBeginning = () => {
    e.setValue("");
    newLine();
  }

  /**
   * All Actions
   */
  //  const acts = e.getSupportedActions()
  //  console.log(acts.filter(a => a.id.toLowerCase().includes("hint"))); 
   

  const resetSchema = async () => {
    /**
     * Reset schema
     * Create example data
     */
    e.setValue("");
    // e.setValue(initScript);
    // const range = e.getModel()?.getFullModelRange();
    // if(range){
    //   e.setSelection(range);
    // }
    // await runSQL();
    await runDbSQL(initScript); 
    e.setValue("");
  }
   
  const testResult = (key: keyof typeof scripts | undefined, expectedValue?: string) => {
    const model = e.getModel();
    const val = model?.getValue()?.replaceAll(model.getEOL(), "\n") ?? "";
    if(!key && !expectedValue){
      throw "Unexpected"
    }
    const expected = expectedValue ?? scripts[key!];
    if(!expected.includes(val.trim())){
      const error = `Script "${key}" does not match the expected value. Unexpected value: ${val.trim()}`;
      console.error({
        expected,
        actual: val,
      })
      confirm(error);
      throw error;
    }
  }
  

  const createTable = async ({ tableName, cols }: { tableName: string; cols: { text: string; opts?: TypeAutoOpts; }[] }) => {
    const newCol = async (wait = 500) => {
      await typeText(",");
      newLine();
      await tout(wait);
    }
    await typeAuto("cr") 
    await typeAuto(" ta");
    await typeAuto(tableName, { triggerMode: "off", nth: -1 });
    goToNextSnipPos();

    for(const [idx, col] of cols.entries()){
      // if(col.text.includes("cre")) debugger
      await typeAuto(col.text, { triggerMode: "firstChar", msPerChar: 120, ...col.opts });
      if(idx < cols.length -1){
        await newCol();
        if(e.getModel()?.getLineContent(e.getPosition()?.lineNumber as any).endsWith("   ")){
          moveCursor.left()
        }
      }
        
    }

    goToNextLine();
    await runSQL();
    await tout(1000);
  }
  const createTables = async () => {

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
      ]
    });
    testResult("createTable_users")
    // console.log({createTable_users: e.getModel()?.getValue()})


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
        { text: "info js", opts: { nth: 1 } }, 
      ]
    });
    testResult("createTable_plans") 


    /**
     * Create table subscriptions
     * add referenced column
     */
    fromBeginning();
    await createTable({ 
      tableName: "subscriptions",
      cols: [
        { text: "crea" },
        { text: "pla" }, 
      ]
    });
    testResult("createTable_subscriptions") 

    /**
     * Alter table users
     * Add referenced column 
     */
    fromBeginning();
    await typeAuto("alt", {  });
    await typeAuto(" ta", {  });
    await typeAuto(" su", {  });
    await typeAuto(" \na", {  });
    await typeAuto(" use", { nth: 2 });
    await typeAuto(";", { nth: -1 });
    testResult("alterTable_subscriptionss");
    await runSQL();

    /**
     * Select join autocomplete
     */
    fromBeginning();
    await typeAuto("sel");
    await typeAuto(" ");
    await typeAuto("\n");
    await typeAuto(" users");
    await typeAuto("\nlef");
    await typeAuto(" s");
    testResult("selectJoin");
    await runSQL();

    /**
     * WITH and nested select
     */
    fromBeginning();
    await typeAuto("WITH cte1 AS ()", { nth: -1 });
    moveCursor.left()
    await typeAuto("\nse");
    await typeAuto(" ");
    await typeAuto("\n");// FROM
    await typeAuto(" ()", { nth: -1 });
    moveCursor.left() 
    await typeAuto("\n");// SELECT
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
    await typeAuto("SELECT * FROM cte1;", { nth: -1 });
    await newLine();
    await typeAuto("SELECT st_point(1, 2)", { nth: -1 })
    await typeAuto("::geog")
    testResult("nestedSelects");
  }

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
    moveCursor.left()
    await typeAuto("/");
    moveCursor.right()
    await typeAuto(" ");
    await typeAuto("for");
    await typeAuto(" c");
    await typeAuto(", hea");
    await typeAuto(", qu");
    await typeAuto(" ", { nth: 1});
    moveCursor.right()
    moveCursor.right()
    await typeAuto(";", { nth: -1 });
    // console.log({copy: e.getModel()?.getValue()})
    testResult("copy")
    await runSQL();
  }
 
  const insertData = async () => {
    /**
     * insert cols/vals autocomplete 
    */
    fromBeginning();
    await typeAuto("ins");
    await typeAuto(" pl");
    await typeAuto(" ()", { nth: -1 });
    moveCursor.left() 
    triggerParamHints(); 
    await typeAuto("'basic', 'basic', 10, '{}'", { msPerChar: 200, nth: -1});
    moveCursor.right(); 
    moveCursor.right(); 
    await typeAuto(";", { nth: -1 });
    testResult("insert")
    console.log({inseret: e.getModel()?.getValue()})
    await runSQL();  

  }
  

  const jsonB = async () => {
    /**
     * JSONB selector autocomplete
     */ 
    fromBeginning();
    await typeAuto(`SEL` ); 
    await typeAuto(` req`);
    e.trigger("demo", "cursorDown", {});
    // await typeAuto(`\nF`);
    // await typeAuto(` lo`);
    await typeAuto(`\nW`); 
    await typeAuto(` r`); 
    await typeAuto(" ", { nth: 3 }); 
    await typeAuto(" is", { nth: 1 }); 
    await tout(1e3);
    // console.log({jsonb: e.getModel()?.getValue()});
    testResult("jsonb");
  }

  const createPolicy = async () => {
    /**
     * JSONB selector autocomplete
     */ 
    fromBeginning();
    await typeAuto(`cr` );
    await typeAuto(` pol` );
    await typeAuto(` view_own_data`, { nth: -1, msPerChar: 10 });

    // newLine();
    await typeAuto(`\no` );
    await typeAuto(` use` );

    await typeAuto("\nf"); 
    await typeAuto(" s"); 

    await typeAuto("\nu" ); 
    await typeAuto(" id" ); 
    await typeAuto("= curu" ); 

    e.trigger("demo",  "cursorLineEnd", {});
    typeText(";");

    newLine(2);
    await typeAuto(`cr`);
    await typeAuto(` use` );
    await typeAuto(` user1;`, { nth: -1 });
    await runSQL();

    newLine(2);
    await typeAuto(`gr` );
    await typeAuto(` al`, { msPerChar: 100 });
    await typeAuto(` tables`, { nth: 1 });
    await typeAuto(` pu` );
    await typeAuto(`\nt` );
    await typeAuto(` use` );
    await typeAuto(`;`, { nth: - 1} );
    // console.log({createpolicy: e.getModel()?.getValue()})
    testResult("createpolicy");
  }

  const schemaInspect = async () => {
    fromBeginning();
    typeText("?");
    await tout(100)
    triggerSuggest();
    await tout(100)
    await typeAuto("ta");
    await typeAuto(" use");
    triggerSuggest();
    // console.log({schemainspect: e.getModel()?.getValue()});
    testResult("schemainspect");
    // typeAuto("?ta");
    // typeAuto(" us");


    await tout(2100);
  }

  const disableTrigger = async () => {
    fromBeginning();
    await typeAuto("alt");
    await typeAuto(" tab");
    await typeAuto(" app");
    await typeAuto("\ntrig", { nth: 1 });
    await typeAuto(" ", { nth: -1 });
    triggerSuggest();
    await tout(1e3);
  }

  const realtime = async () => {
    fromBeginning();
    await typeAuto(`CREATE TABLE some_table(col_0 INTEGER);`, { nth: -1, msPerChar: 10, triggerMode: "off" });
    await runSQL();
    newLine(2);
    await typeAuto(`--A column is created every second...`, { nth: -1, msPerChar: 50, triggerMode: "off" });
    await tout(200);
    await typeAuto(`\nALTER TABLE some_table \nALTER COLUMN `, { nth: -1, msPerChar: 10, triggerMode: "off" });
    triggerSuggest();

    let counter = 1;
    const interval = setInterval(() => {
      if(counter > 5){
        clearInterval(interval);
        return
      }
      runDbSQL(`ALTER TABLE some_table ADD COLUMN col_${counter} TEXT`);
      counter++;
    }, 1e3);
    await tout(5 * 1e3 * 1.1);
  }

  const misc = async () => {
    fromBeginning(); 
    await typeAuto("set");
    await typeAuto(" statement");
    await typeAuto(" ");
    await typeAuto(" ");
    await tout(1200); 
    testResult(undefined, "SET statement_timeout TO 0");

    fromBeginning();
    await typeAuto("va");
    await typeAuto(" ");
    await typeAuto(" ");
    await moveCursor.right();
    await typeAuto(" pg_ag");
    await tout(1200); 
    testResult(undefined, "VACUUM ( FULL) pg_catalog.pg_aggregate");
    
  }

  const notificationText = "hello from the other side";
  const checkText = async () => {
    await tout(1e3);
    if(!document.body.innerText.includes(notificationText)){
      alert("Notification not received");
    }
  }
  const testNotify = async () => {
    fromBeginning();
    await typeAuto(`LISTEN mychannel`, { nth: -1, msPerChar: 10, triggerMode: "off" });
    await runSQL();
    
    await runDbSQL(`NOTIFY mychannel, '${notificationText}'`);
    await checkText();
    await sqlAction("stop-listen");
  }
  document.querySelector("." + TopHeaderClassName)?.remove();

  const testOnePacketBug = async () => {
    fromBeginning();
    await typeAuto(`SELECT pg_sleep(1), '${notificationText}' as a`, { nth: -1, msPerChar: 10, triggerMode: "off" });
    await runSQL();
    await checkText();
  }

  await testOnePacketBug();
  await testNotify();
  await misc(); 

  await resetSchema();
    
  await createTables();
 
  // Disabled because csv is missing in vm
  // await copyData();
 
  await insertData();
 
  await createPolicy();
  await schemaInspect();
  await jsonB();
  await disableTrigger();
  await realtime();


  alert("Demo finished successfully")
}


export const clickCommand = async (cmd: Command, delay = 500) => {
  await tout(delay);
  const elem = document.querySelector<HTMLButtonElement>(getCommandElemSelector(cmd));
  if(!elem){
    console.warn("Not found: ", cmd);
  }
  elem?.click();
  return elem;
}

const initScript = ["users", "plans", "subscriptions", "logs", "some_table"].map(v => `DROP TABLE IF EXISTS ${v} CASCADE;`).join("") + ` 
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


const scripts = {
  "createTable_users": "CREATE TABLE users (\n  id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  first_name  VARCHAR(150) NOT NULL,\n  last_name  VARCHAR(150) NOT NULL,\n  email  VARCHAR(255) NOT NULL UNIQUE \n   CONSTRAINT \"prevent case and whitespace duplicates\"\n   CHECK (email = trim(lower(email))),\n  created_at TIMESTAMP NOT NULL DEFAULT now() \n);",
  "createTable_plans": "\nCREATE TABLE plans (\n  id TEXT PRIMARY KEY,\n  name  VARCHAR(150) NOT NULL,\n  price  DECIMAL(12,2) CHECK(price >= 0),\n  info JSONB\n);",
  "createTable_subscriptions": "\nCREATE TABLE subscriptions (\n  created_at TIMESTAMP NOT NULL DEFAULT now(),\n  \"plan_id\" TEXT NOT NULL REFERENCES plans\n);",
  "alterTable_subscriptionss": "\nALTER TABLE subscriptions \nADD COLUMN \"user_id\" UUID NOT NULL REFERENCES users;",
  "selectJoin": "\nSELECT *\nFROM users\nLEFT JOIN subscriptions s ON s.user_id = users.id",
  "copy": `COPY plans ( id, name, price, info )\nFROM '/home/plans.csv' ( FORMAT CSV, HEADER, QUOTE '''' );`,
  "insert": "\nINSERT INTO plans (id, name, price, info)\nVALUES ('basic', 'basic', 10, '{}');",
  "createpolicy": "\nCREATE POLICY view_own_data\nON users\nFOR SELECT\nUSING (id = \"current_user\"() );\n\nCREATE USER user1;\n\nGRANT ALL ON ALL TABLES IN SCHEMA public\nTO user1;",
  "schemainspect": '\n?table users',
  "jsonb": "\nSELECT request\nFROM logs\nWHERE request ->'Authorization' IS NULL\nLIMIT 200",
  "nestedSelects": "\nWITH cte1 AS (\n  SELECT *\n  FROM (\n    SELECT *\n    FROM geography_columns\n    WHERE coord_dimension = 1\n  ) t\n)\nSELECT * FROM cte1;\nSELECT st_point(1, 2)::GEOGRAPHY"

}

console.error(`Finish file upload scripts + record them`);
console.error(`Finish data exlorer/editor scripts:
  - Table view, row panel, joined records
  - Map realtime view + draw shape
  - Time chart realtime view
  - Table method view
`);
 