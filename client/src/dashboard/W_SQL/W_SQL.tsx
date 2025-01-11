import { mdiKeyboard } from "@mdi/js";
import type {
  AnyObject,
  SocketSQLStreamHandlers,
  SQLResultInfo,
} from "prostgles-types";

import React, { useEffect } from "react";
import Loading from "../../components/Loading";
import type {
  PageSize,
  TableColumn,
  TableProps,
} from "../../components/Table/Table";
import type {
  OnAddChart,
  Query,
  WindowData,
  WindowSyncItem,
} from "../Dashboard/dashboardUtils";

import type { PopupProps } from "../../components/Popup/Popup";
import Popup from "../../components/Popup/Popup";

import type { DeltaOf } from "../RTComp";
import RTComp from "../RTComp";
import { getFuncs } from "../SQLEditor/SQLCompletion/getPGObjects";
import type { MonacoError, SQLEditorRef } from "../SQLEditor/SQLEditor";
import { SQLEditor } from "../SQLEditor/SQLEditor";

import type {
  SingleSyncHandles,
  SyncDataItem,
} from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { DBEventHandles, ValidatedColumnInfo } from "prostgles-types/lib";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";

import { useIsMounted } from "prostgles-client/dist/react-hooks";
import { createReactiveState } from "../../appUtils";
import { Icon } from "../../components/Icon/Icon";
import type { CommonWindowProps, DashboardState } from "../Dashboard/Dashboard";
import type { ProstglesQuickMenuProps } from "../W_QuickMenu";
import Window from "../Window";
import { runSQL } from "./runSQL";
import { SQLHotkeys } from "./SQLHotkeys";
import { W_SQLBottomBar } from "./W_SQLBottomBar/W_SQLBottomBar";
import { ProstglesSQLMenu } from "./W_SQLMenu";
import { W_SQLResults } from "./W_SQLResults";
import { AddChartMenu } from "../W_Table/TableMenu/AddChartMenu";
import type { CodeBlock } from "../SQLEditor/SQLCompletion/completionUtils/getCodeBlock";
import { type ChartableSQL, getChartableSQL } from "./getChartableSQL";

export type W_SQLProps = Omit<CommonWindowProps, "w"> & {
  w: WindowSyncItem<"sql">;
  filter?: any;
  onAddChart?: OnAddChart;
  titleIcon?: React.ReactNode;
  activeRowStyle?: React.CSSProperties;
  childWindow: React.ReactNode | undefined;
  suggestions?: DashboardState["suggestions"];
  setLinkMenu: ProstglesQuickMenuProps["setLinkMenu"];
};

export const SQL_NOT_ALLOWED =
  "Your prostgles account is not allowed to run SQL";

export type ProstglesColumn = TableColumn & { computed: boolean } & Pick<
    ValidatedColumnInfo,
    "name" | "tsDataType" | "label" | "udt_name" | "filter"
  >;

export type W_SQL_ActiveQuery = {
  pid: number | undefined;
  hashedSQL: string;
  trimmedSql: string;
  started: Date;
  stopped?: {
    date: Date;
    type: "terminate" | "cancel";
  };
} & (
  | {
      state: "running";
    }
  | {
      state: "ended";
      commandResult?: string;
      rowCount: number;
      /**
       * For LIMITed select queries will try to get the total row count
       * to enable pagination
       */
      totalRowCount: number | undefined;
      ended: Date;
      info: SQLResultInfo | undefined;
    }
  | {
      state: "error";
      ended: Date;
      error?: MonacoError;
    }
);

type SQLResultCols = Required<W_SQLProps>["w"]["options"]["sqlResultCols"];

export type W_SQLState = {
  table?: TableProps & Query;
  sort: ColumnSort[];
  loading: boolean;
  currentCodeBlockChartColumns?: ChartableSQL;
  isSelect: boolean;
  hideCodeEditor?: boolean;
  rows?: (string | number)[][];
  filter: any;
  pos?: { x: number; y: number };
  size?: { w: number; h: number };
  popup?: {
    positioning: PopupProps["positioning"];
    anchorEl: Element;
    content: React.ReactNode;
    style: React.CSSProperties;
  };
  cols?: SQLResultCols;
  handler?: SocketSQLStreamHandlers;
  activeQuery: undefined | W_SQL_ActiveQuery;
  joins: string[];
  error?: any;
  w?: SyncDataItem<WindowData>;
  hideTable?: boolean;
  sql: string;
  sqlResult?: boolean;
  rowPanel?: {
    type: "insert" | "update";
    data: any;
  };
  rowDelta?: any;
  onRowClick: any;
  filterPopup?: boolean;
  notifEventSub?: ReturnType<DBEventHandles["addListener"]>;
  noticeSub?: ReturnType<DBEventHandles["addListener"]>;
  notices?: {
    length: number;
    message: string;
    name: string;
    severity: string;
    code: string;
    where: string;
    file: string;
    line: string;
    routine: string;
    received: string;
  }[];
  columns?: ValidatedColumnInfo[];
  /**
   * Stringified joinFilter that is set after the data has been downloaded.
   * Used in setting activeRow styles to all rows adequately
   */
  joinFilterStr?: string;

  queryEnded?: number;
  page: number;
  pageSize: PageSize;
  loadingSuggestions: boolean;
};

type D = {
  w?: WindowSyncItem<"sql">;
  dataAge?: number;
  wSync?: SingleSyncHandles;
};

export class W_SQL extends RTComp<W_SQLProps, W_SQLState, D> {
  refHeader?: HTMLDivElement;
  refResize?: HTMLElement;
  ref?: HTMLElement & { sqlRef?: SQLEditorRef | undefined };

  rowPanelData: any;
  state: W_SQLState = {
    sql: "",
    loading: false,
    page: 0,
    pageSize: 100,
    activeQuery: undefined,
    isSelect: false,
    sort: [],
    joins: [],
    filter: {},
    error: "",
    hideTable: true,
    onRowClick: null,
    loadingSuggestions: true,
  };
  d: D = {
    w: undefined,
    dataAge: 0,
    wSync: undefined,
  };

  calculatedColWidths = false;

  async onMount() {
    const { w } = this.props;

    if (!this.d.wSync) {
      const wSync = w.$cloneSync((w, delta) => {
        this.setData({ w }, { w: delta });
      });

      this.setData({ wSync });
    }

    /* Add save hotkey */
    window.addEventListener("keydown", this.saveFunc, false);
  }

  saveFunc = (e) => {
    if (
      e.key === "s" &&
      e.ctrlKey &&
      document.activeElement &&
      this.editorContainer &&
      this.editorContainer.contains(document.activeElement)
    ) {
      e.preventDefault();
      this.saveQuery();
    }
  };

  streamData = createReactiveState(
    { rows: [] } as { rows: any[] },
    (newState) => {
      if (newState.rows.length < this.state.pageSize) {
        this.setState({ rows: newState.rows });
      }
    },
  );

  async onUnmount() {
    window.removeEventListener("keydown", this.saveFunc, false);

    this.d.wSync?.$unsync();

    const { notifEventSub, noticeSub, handler } = this.state;
    notifEventSub?.removeListener();
    noticeSub?.removeListener();
    await handler?.stop(true);
    await this.dataSub?.unsubscribe?.();
  }

  editorContainer?: HTMLDivElement;
  saveQuery() {
    if (this.d.w && this.d.w.sql.trim()) {
      // window.open('data:text/csv;charset=utf-8,' + w.sql);
      download(this.d.w.sql, `${this.d.w.name || "Query"}.sql`, "text/sql");
    }
  }

  /**
   * To reduce the number of unnecessary data requests let's save the query signature and allow new queries only if different
   */
  currentDataRequestSignature = "";
  static getDataRequestSignature(
    args:
      | {
          select?: AnyObject;
          filter?: AnyObject;
          orderBy?: AnyObject;
          limit?: number;
          offset?: number;
        }
      | { sql: string },
  ) {
    if ("sql" in args) return args.sql;

    const { filter, select, limit, offset } = args;
    return JSON.stringify({ filter, select, limit, offset });
  }

  dataSub?: any;
  dataSubFilter?: any;
  dataAge?: number = 0;
  autoRefresh?: any;
  onDelta = async (
    dp: DeltaOf<W_SQLProps>,
    ds: DeltaOf<W_SQLState>,
    dd: DeltaOf<D>,
  ) => {
    const delta = { ...dp, ...ds, ...dd };
    const { w } = this.d;
    if (!w) return;
    if (delta.w?.limit !== undefined) {
      this.state.handler?.stop();
      this.setState({ handler: undefined });
    }

    const shouldReRender =
      delta.w?.sql_options ||
      "hideTable" in (delta.w?.options ?? {}) ||
      "limit" in (delta.w || {}) ||
      (delta.w?.sql && !(delta.w.options as any)?.sqlChanged);
    if (shouldReRender) {
      this.setState({});
    }
  };

  _queryHashAlias?: string;
  killQuery = async (terminate: boolean) => {
    if (this.state.activeQuery?.state !== "running") return;
    this.setState({
      activeQuery: {
        ...this.state.activeQuery,
        stopped: {
          date: new Date(),
          type: terminate ? "terminate" : "cancel",
        },
      },
    });
    this.state.handler?.stop(terminate);
    return true;
  };

  noticeEventListener = (notice: any) => {
    const { notices = [] } = this.state;
    this.setState({
      notices: [
        { ...notice, received: new Date().toISOString().replace("T", " ") },
        ...notices,
      ],
    });
  };

  notifEventListener = (payload: string) => {
    const { rows = [] } = this.state;
    this.setState({
      rows: [[payload, new Date().toISOString().replace("T", " ")], ...rows],
    });
  };
  hashedSQL?: string;
  sort?: ColumnSort[];
  runSQL = runSQL.bind(this);

  sqlRef?: SQLEditorRef;

  render() {
    const {
      loading,
      joins,
      popup,
      error,
      activeQuery,
      hideCodeEditor,
      currentCodeBlockChartColumns,
    } = this.state;
    const { w } = this.d;
    const {
      onAddChart,
      suggestions,
      tables,
      setLinkMenu,
      prgl: { db, dbs, dbsTables, user },
      myLinks,
      childWindow,
    } = this.props;

    if (loading || !w) return <Loading className="m-auto" />;

    const updateOptions = (
      newOpts: Partial<WindowData<"sql">["options"]>,
      otherData: Partial<WindowData<"sql">> = {},
    ) => {
      const options: WindowData["options"] = {
        ...(this.d.w?.$get()?.options || {}),
        ...newOpts,
      };
      w.$update({ ...otherData, options }, { deepMerge: true });
    };

    let infoPlaceholder: React.ReactNode = null;
    if (user && !user.options?.viewedSQLTips && !window.isMobileDevice) {
      infoPlaceholder = (
        <div
          className="p-2 flex-col ai-center jc-center gap-1 absolute "
          style={{
            inset: 0,
            background: "#00000040",
            zIndex: 6, // Ensure it's above the right minimap scrollbar
          }}
        >
          <div className="SQLHotkeysWrapper min-s-0 bg-color-0 p-1 rounded max-s-fit flex-col gap-1">
            <div color="info" className="bg-color-0 o-auto">
              <h4 className="flex-row ai-center gap-1 font-16 mt-0">
                <Icon path={mdiKeyboard} size={1}></Icon> Hotkeys:
              </h4>
              <SQLHotkeys />
            </div>
            <Btn
              color="action"
              variant="filled"
              onClick={async () => {
                // const newOptions = { ...user.options, viewedSQLTips: true };
                await dbs.users.update(
                  { id: user.id },
                  { options: { $merge: [{ viewedSQLTips: true }] } },
                );
              }}
            >
              Ok, don't show again
            </Btn>
          </div>
        </div>
      );
    }
    const sqlError =
      activeQuery?.state === "error" && !activeQuery.stopped ?
        activeQuery.error
      : undefined;
    const clearActiveQueryError = () => {
      if (this.state.activeQuery?.state === "error") {
        this.setState({
          activeQuery: {
            ...this.state.activeQuery,
            error: undefined,
          },
        });
      }
    };

    const content = (
      <>
        <div
          className={"ProstglesSQL flex-col f-1 min-h-0 min-w-0 relative "}
          ref={(r) => {
            if (r) {
              this.ref = r;
              this.ref.sqlRef = this.sqlRef;
            }
          }}
        >
          {infoPlaceholder}
          <div
            ref={(r) => {
              if (r) {
                this.editorContainer = r;
              }
            }}
            className={`min-h-0 min-w-0 flex-col relative ${hideCodeEditor ? "f-0" : "f-1"}`}
          >
            {error && <ErrorComponent error={error} className="m-2" />}
            <SQLEditor
              value={this.d.w?.sql ?? ""}
              style={hideCodeEditor ? { display: "none" } : {}}
              sql={db.sql!}
              suggestions={
                !suggestions ? undefined : (
                  {
                    ...suggestions,
                    onLoaded: () => {
                      this.setState({ loadingSuggestions: false });
                    },
                  }
                )
              }
              onMount={(sqlRef) => {
                this.sqlRef = sqlRef;
                if (this.ref) {
                  this.ref.sqlRef = this.sqlRef;
                }
              }}
              onDidChangeActiveCodeBlock={async (cb: CodeBlock | undefined) => {
                if (currentCodeBlockChartColumns?.text === cb?.text) {
                  return;
                }
                const res =
                  cb &&
                  (await getChartableSQL(cb, db.sql!).catch(() => undefined));
                this.setState({ currentCodeBlockChartColumns: res });
              }}
              onUnmount={(_editor, cursorPosition) => {
                updateOptions({ cursorPosition });
              }}
              cursorPosition={this.d.w?.options.cursorPosition}
              onChange={(code, cursorPosition) => {
                if (!this.d.w) throw new Error("this.d.w missing");

                const newData: Partial<WindowData<"sql">> = { sql: code };
                let opts: WindowData<"sql">["options"] = this.d.w.options;
                if (!opts.sqlChanged) {
                  opts.sqlChanged = true;
                }
                opts = { ...opts, cursorPosition };
                newData.options = opts;
                this.d.w.$update(newData, { deepMerge: true });
                /** Clear error on typing */
                clearActiveQueryError();
              }}
              onRun={async () => {
                await this.runSQL();
              }}
              onStopQuery={this.killQuery}
              error={sqlError}
              getFuncDef={
                !db.sql ? undefined : (
                  (name, minArgs) => {
                    return getFuncs({ db: db as any, name, minArgs });
                  }
                )
              }
              sqlOptions={{
                ...w.sql_options,
              }}
              activeCodeBlockButtonsNode={
                !currentCodeBlockChartColumns || !onAddChart ?
                  null
                : <AddChartMenu
                    type="sql"
                    w={w}
                    myLinks={myLinks}
                    childWindows={this.props.childWindows}
                    onAddChart={onAddChart}
                    chartableSQL={currentCodeBlockChartColumns}
                    tables={tables}
                    size="micro"
                  />
              }
            />
            {this.d.w && (
              <W_SQLBottomBar
                {...this.state}
                connectionId={this.props.prgl.connectionId}
                dbsMethods={this.props.prgl.dbsMethods}
                toggleCodeEditor={() =>
                  this.setState({ hideCodeEditor: !this.state.hideCodeEditor })
                }
                w={this.d.w}
                onChangeState={(newState) => this.setState(newState)}
                db={db}
                dbs={dbs}
                streamData={this.streamData}
                killQuery={this.killQuery}
                noticeEventListener={this.noticeEventListener}
                runSQL={this.runSQL}
                notifEventSub={this.state.notifEventSub}
                clearActiveQueryError={clearActiveQueryError}
              />
            )}
          </div>

          <W_SQLResults
            {...this.state}
            w={w}
            childWindow={childWindow}
            tables={tables}
            onPageChange={(newPage) => {
              this.setState({ page: newPage });
            }}
            onPageSizeChange={(pageSize) => {
              this.setState({ pageSize });
              if (this.d.w?.limit && pageSize > this.d.w.limit) {
                w.$update({ limit: pageSize });
              }
            }}
            onResize={(newCols) => {
              this.setState({ cols: newCols });
            }}
            onSort={(sort) => {
              this.runSQL(sort);
            }}
          />
        </div>

        {!popup ? null : (
          <Popup
            rootStyle={popup.style}
            anchorEl={popup.anchorEl}
            positioning={popup.positioning}
            clickCatchStyle={{ opacity: 0 }}
            onClose={() => {
              this.setState({ popup: undefined });
            }}
            contentClassName=""
          >
            {popup.content}
          </Popup>
        )}
      </>
    );

    return (
      <Window
        w={w}
        quickMenuProps={{
          dbs,
          prgl: this.props.prgl,
          myLinks: this.props.myLinks,
          onAddChart,
          tables,
          setLinkMenu,
          childWindows: this.props.childWindows,
          chartableSQL: currentCodeBlockChartColumns,
        }}
        getMenu={(w, onClose) => (
          <ProstglesSQLMenu
            tables={tables}
            db={db}
            dbs={dbs}
            onAddChart={onAddChart}
            w={w}
            dbsTables={dbsTables}
            joins={joins}
            onClose={onClose}
          />
        )}
      >
        {content}
      </Window>
    );
  }
}

// Function to download data to a file
export function download(data, filename: string, type: string) {
  const file = new Blob([data], { type });
  const navigator = window.navigator as any;
  if (navigator.msSaveOrOpenBlob) {
    // IE10+
    navigator.msSaveOrOpenBlob(file, filename);
  } else {
    // Others
    const a = document.createElement("a"),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}

type CounterProps = {
  from: Date;
  className?: string;
  title?: string;
};
export const Counter = ({ from, className, title }: CounterProps) => {
  const [{ seconds, minutes }, setElapsed] = React.useState({
    seconds: 0,
    minutes: 0,
  });
  const intervalId = React.useRef<any>(undefined);
  const getIsMounted = useIsMounted();
  useEffect(() => {
    clearInterval(intervalId.current);
    intervalId.current = setInterval(() => {
      if (!getIsMounted()) {
        clearInterval(intervalId.current);
        return;
      }
      const totalSeconds = Math.round((Date.now() - +from) / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds - minutes * 60;
      setElapsed({ seconds: seconds, minutes });
    }, 1000);
  }, [from, setElapsed, getIsMounted]);

  return (
    <div title={title} className={"text-2 " + className}>
      {[minutes, seconds].map((v) => `${v}`.padStart(2, "0")).join(":")}
    </div>
  );
};
