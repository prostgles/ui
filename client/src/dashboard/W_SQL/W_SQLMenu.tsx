import {
  mdiChartBoxPlusOutline,
  mdiCodeJson,
  mdiCog,
  mdiContentSave,
  mdiDelete,
  mdiDownload,
  mdiFileUploadOutline,
  mdiKeyboard,
  mdiListBoxOutline,
  mdiPlay,
  mdiTable,
  mdiUpload,
} from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";
import Btn from "../../components/Btn";
import FormField from "../../components/FormField/FormField";
import type { TabsProps } from "../../components/Tabs";
import Tabs from "../../components/Tabs";
import RTComp from "../RTComp";

import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type {
  DBSchemaTablesWJoins,
  OnAddChart,
  WindowSyncItem,
} from "../Dashboard/dashboardUtils";

import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import ErrorComponent from "../../components/ErrorComponent";
import { InfoRow } from "../../components/InfoRow";
import { SECOND } from "../Charts";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { DBS } from "../Dashboard/DBS";
import { TestSQL } from "./TestSQL";
import { SQLHotkeys } from "./SQLHotkeys";
import { download } from "./W_SQL";
import { t } from "../../i18n/i18nUtils";

type P = {
  tableName?: string;
  db: DBHandlerClient;
  dbs: DBS;
  onAddChart?: OnAddChart;
  w: WindowSyncItem<"sql">;
  joins: string[];
  dbsTables: CommonWindowProps["tables"];
  tables: DBSchemaTablesWJoins;
  onClose: VoidFunction;
};

const REFRESH_OPTIONS = ["Realtime", "Custom", "None"] as const;
export type Unpromise<T extends Promise<any>> =
  T extends Promise<infer U> ? U : never;

export type RefreshOptions = {
  autoRefreshSeconds?: number;
  refreshType?: (typeof REFRESH_OPTIONS)[number];
};

type S = {
  indexes?: {
    indexdef: string;
    indexname: string;
    schemaname: string;
    tablename: string;
  }[];
  query?: {
    hint?: string;
    label?: string;
    sql: string;
  };
  l1Key?: string;
  l2Key?: string;
  running?: boolean;
  error?: any;
  initError?: any;
  hint?: string;
  infoQuery?: {
    label: string;
    query: string;
  };
  autoRefreshSeconds?: number;
  newOptions?: P["w"]["sql_options"];
};

type D = {
  w?: P["w"];
};

export class ProstglesSQLMenu extends RTComp<P, S, D> {
  state: S = {
    // joins: [],
    l1Key: undefined,
    l2Key: undefined,
    query: undefined,
    running: undefined,
    error: undefined,
    initError: undefined,
    hint: undefined,
    indexes: undefined,
    infoQuery: undefined,
    autoRefreshSeconds: undefined,
  };

  onUnmount = async () => {
    if (this.wSub) await this.wSub.$unsync();
  };

  wSub?: ReturnType<P["w"]["$cloneSync"]>;
  autoRefresh: any;
  loading = false;
  onDelta = async (dP?: Partial<P>, dS?: Partial<S>, dD?) => {
    if (dS && "query" in dS) {
      this.setState({ error: undefined });
    }

    if (
      dP?.w?.sql_options &&
      JSON.stringify(this.props.w.sql_options) ===
        JSON.stringify(this.state.newOptions)
    ) {
      this.setState({ newOptions: undefined });
    }
  };

  saveQuery = async () => {
    const w = this.props.w;
    const sql = w.$get()?.sql || "";
    const fileName = (w.$get()?.name || `Query_${await sha256(sql)}`) + ".sql";

    download(sql, fileName, "text/sql");
  };

  render() {
    const { onAddChart, w, dbs, dbsTables, tables, onClose } = this.props;

    const { l1Key, initError, error, newOptions } = this.state;

    if (initError) {
      return (
        <div className="p-1">
          <ErrorComponent error={initError} />
        </div>
      );
    }

    const sqlOptsValue = JSON.stringify(newOptions || w.sql_options, null, 2);

    const table = dbsTables.find((t) => t.name === "windows");
    const sqlOptionsCol = table?.columns.find((c) => c.name === "sql_options");

    if (!table) {
      return <div>dbs.windows table schema not found</div>;
    }

    const l1Opts: TabsProps["items"] = {
      General: {
        label: t.W_SQLMenu.General,
        leftIconPath: mdiFileUploadOutline,
        content: (
          <div className="flex-col ai-start gap-1">
            <FormField
              label={t.W_SQLMenu["Query name"]}
              value={w.name}
              asColumn={true}
              type="text"
              onChange={(newVal) => {
                w.$update(
                  { name: newVal, options: { sqlWasSaved: true } },
                  { deepMerge: true },
                );
              }}
            />

            <FormField
              label={t.W_SQLMenu["Result display mode"]}
              fullOptions={[
                { key: "table", label: "Table", iconPath: mdiTable },
                { key: "csv", label: "CSV", iconPath: mdiListBoxOutline },
                { key: "JSON", label: "JSON", iconPath: mdiCodeJson },
              ]}
              value={w.sql_options.renderMode ?? "table"}
              onChange={(renderMode) =>
                w.$update({ sql_options: { renderMode } }, { deepMerge: true })
              }
            />

            <Btn
              title={t.W_SQLMenu["Save query as file"]}
              iconPath={mdiDownload}
              onClick={this.saveQuery}
              variant="faded"
            >
              {t.W_SQLMenu["Download query"]}
            </Btn>

            <Btn
              iconPath={mdiUpload}
              variant="faded"
              onClick={({ currentTarget }) => {
                currentTarget.querySelector("input")?.click();
              }}
            >
              {t.W_SQLMenu["Open SQL file"]}
              <input
                id="sql-open"
                name="sql-open"
                title={t.W_SQLMenu["Open query from file"]}
                type="file"
                accept="text/*, .sql, .txt"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.currentTarget.files && e.currentTarget.files[0]) {
                    const myFile = e.currentTarget.files[0];
                    getFileText(myFile).then((sql) => {
                      w.$update({ sql, show_menu: false });
                    });
                  }
                }}
              />
            </Btn>

            <Btn
              title={t.W_SQLMenu["Delete query"]}
              color="danger"
              variant="faded"
              iconPath={mdiDelete}
              onClick={() => {
                w.$update({ closed: true, deleted: true });
              }}
            >
              {t.W_SQLMenu["Delete query"]}
            </Btn>

            <Btn
              variant="faded"
              iconPath={mdiPlay}
              title="Click five times to run test"
              onClick={({ currentTarget }) => {
                const node = currentTarget as {
                  _lastClickedCount?: number;
                  _lastClicked?: number;
                };
                if (node._lastClickedCount && node._lastClickedCount > 3) {
                  onClose();
                  setTimeout(() => {
                    TestSQL(w);
                  }, SECOND);
                  node._lastClicked = 0;
                  node._lastClickedCount = 0;
                } else {
                  const clickedWithinTimeFrame =
                    !node._lastClicked || Date.now() - node._lastClicked < 500;
                  node._lastClickedCount =
                    clickedWithinTimeFrame ?
                      (node._lastClickedCount ?? 0) + 1
                    : 0;
                  node._lastClicked = Date.now();
                }
              }}
            >
              TEST
            </Btn>
          </div>
        ),
      },

      "Editor options": {
        label: t.W_SQLMenu["Editor options"],
        leftIconPath: mdiCog,
        content: (
          <div
            className="flex-col ai-start gap-1"
            key={JSON.stringify(w.sql_options)}
          >
            <div>{t.W_SQLMenu["SQL Editor settings"]}</div>
            <CodeEditor
              language={{
                lang: "json",
                jsonSchemas: [
                  {
                    id: "sql_options",
                    schema: getJSONBSchemaAsJSONSchema(
                      table.name,
                      "sql_options",
                      sqlOptionsCol?.jsonbSchema ?? {},
                    ),
                  },
                ],
              }}
              style={{
                minHeight: "200px",
                minWidth: "400px",
                flex: 1,
                resize: "vertical",
                overflow: "auto",
                width: "100%",
              }}
              value={sqlOptsValue}
              onChange={(v) => {
                try {
                  this.setState({ newOptions: JSON.parse(v) });
                } catch (err) {}
              }}
            />
            <InfoRow color="info">
              {t.W_SQLMenu.Press} <strong>ctrl</strong> + <strong>space</strong>
              {t.W_SQLMenu["to get a list of possible options"]}
            </InfoRow>
            {!!error && <ErrorComponent error={error} />}
            <Btn
              color="action"
              variant="filled"
              iconPath={mdiContentSave}
              disabledInfo={
                error ? t.W_SQLMenu["Cannot save due to error"]
                : (
                  !newOptions ||
                  JSON.stringify(newOptions) === JSON.stringify(w.sql_options)
                ) ?
                  t.W_SQLMenu["Nothing to update"]
                : undefined
              }
              onClickPromise={async () => {
                const _newOpts = { ...newOptions! };
                this.setState({ error: undefined });
                try {
                  await dbs.windows.update(
                    { id: w.id },
                    { sql_options: _newOpts },
                  );
                } catch (error) {
                  this.setState({ error, newOptions: _newOpts });
                }
              }}
            >
              {t.W_SQLMenu["Update options"]}
            </Btn>
          </div>
        ),
      },
      Hotkeys: {
        label: t.W_SQLMenu.Hotkeys,
        leftIconPath: mdiKeyboard,
        content: <SQLHotkeys />,
      },
    };

    return (
      <div
        className="table-menu c--fit flex-row"
        style={{ maxHeight: "100vh", maxWidth: "100vw" }}
      >
        <Tabs
          variant="vertical"
          contentClass={
            " o-auto min-h-0 max-h-100v " + (l1Key === "Alter" ? " " : " p-1")
          }
          items={l1Opts}
          compactMode={window.isMobileDevice ? "hide-inactive" : undefined}
          // defaultActiveKey={"General"}
        />
      </div>
    );
  }
}

export function getFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", function (e) {
      if (e.target) resolve(e.target.result as string);
      else reject("e.target is null");
    });

    reader.readAsBinaryString(file);
  });
}

export async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message);

  // hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
