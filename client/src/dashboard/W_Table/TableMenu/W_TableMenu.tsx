import {
  mdiAccountMultiple,
  mdiCog,
  mdiContentSaveCogOutline,
  mdiDatabaseSearch,
  mdiFlash,
  mdiInformationOutline,
  mdiScript,
  mdiShieldAccount,
  mdiSyncCircle,
  mdiViewColumnOutline,
} from "@mdi/js";
import React from "react";
import type { TabItems } from "../../../components/Tabs";
import Tabs from "../../../components/Tabs";
import RTComp from "../../RTComp";

import type { ParsedJoinPath, TableInfo } from "prostgles-types";
import FormField from "../../../components/FormField/FormField";
import type { ColumnConfigWInfo, W_TableProps } from "../W_Table";

import type {
  OnAddChart,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";

import ErrorComponent from "../../../components/ErrorComponent";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import { SQLSmartEditor } from "../../SQLEditor/SQLSmartEditor";
import type { ColumnConfig } from "../ColumnMenu/ColumnMenu";
import { ColumnsMenu } from "../ColumnMenu/ColumnsMenu";
import { AutoRefreshMenu } from "./AutoRefreshMenu";
import { W_TableMenu_AccessRules } from "./W_TableMenu_AccessRules";
import { W_TableMenu_Constraints } from "./W_TableMenu_Constraints";
import { W_TableMenu_CurrentQuery } from "./W_TableMenu_CurrentQuery";
import { W_TableMenu_DisplayOptions } from "./W_TableMenu_DisplayOptions";
import { W_TableMenu_Indexes } from "./W_TableMenu_Indexes";
import { W_TableMenu_Policies } from "./W_TableMenu_Policies";
import { W_TableMenu_TableInfo } from "./W_TableMenu_TableInfo";
import { W_TableMenu_Triggers } from "./W_TableMenu_Triggers";
import { getAndFixWColumnsConfig } from "./getAndFixWColumnsConfig";
import { getTableMeta, type W_TableInfo } from "./getTableMeta";

export type W_TableMenuProps = Pick<
  W_TableProps,
  "workspace" | "prgl" | "externalFilters" | "joinFilter"
> & {
  onAddChart?: OnAddChart;
  w: WindowSyncItem<"table">;
  onLinkTable?: (tableName: string, path: ParsedJoinPath[]) => any;
  cols: ColumnConfigWInfo[];
  suggestions: CommonWindowProps["suggestions"];
  onClose: () => any;
};
export type Unpromise<T extends Promise<any>> =
  T extends Promise<infer U> ? U : never;

export type RefreshOptions = {
  readonly refresh?: {
    readonly type: "Realtime" | "None" | "Interval";
    intervalSeconds: number;
    throttleSeconds: number;
  };
};
export type W_TableMenuState = {
  schemaAge?: number;
  indexes?: {
    indexdef: string;
    indexname: string;
    schemaname: string;
    tablename: string;
  }[];
  query?: {
    title?: string;
    contentTop?: React.ReactNode;
    label?: string;
    sql: string;
    onSuccess?: VoidFunction;
  };
  l1Key?: string;
  l2Key?: string;
  running?: boolean;
  error?: any;
  initError?: any;
  hint?: string;
  columnsConfig?: ColumnConfig[];
  infoQuery?: {
    label: string;
    query: string;
  };
  autoRefreshSeconds?: number;
  constraints?: {}[];
  tableMeta?: Unpromise<ReturnType<typeof getTableMeta>>;
  tableInfo?: TableInfo;

  linkTablePath?: string[];
};

type D = {
  w?: WindowSyncItem<"table">;
};

export type W_TableMenuMetaProps = W_TableMenuProps & {
  tableMeta: W_TableInfo | undefined;
  onSetQuery: (newQuery: W_TableMenuState["query"]) => void;
};

export class W_TableMenu extends RTComp<W_TableMenuProps, W_TableMenuState, D> {
  state: W_TableMenuState = {
    // joins: [],
    l1Key: undefined,
    l2Key: undefined,
    query: undefined,
    running: undefined,
    error: undefined,
    initError: undefined,
    hint: undefined,
    indexes: undefined,
    columnsConfig: undefined,
    infoQuery: undefined,
    autoRefreshSeconds: undefined,
    tableMeta: undefined,
  };

  d: D = {
    w: undefined,
  };

  onUnmount = async () => {
    if (this.wSub) await this.wSub.$unsync();
  };

  getTableInfo() {
    const {
      prgl: { db, dbs, databaseId },
      w,
    } = this.props;
    if (w.table_name && db.sql) {
      getTableMeta(db, dbs, databaseId, w.table_name, w.table_oid)
        .then(async (tableMeta) => {
          this.setState({ tableMeta });
        })
        .catch((initError) => {
          console.error(initError);
          // this.setState({ initError })
        });
    }
  }

  wSub?: ReturnType<Required<D>["w"]["$cloneSync"]>;
  autoRefresh: any;
  loading = false;
  onDelta = async (dP, dS) => {
    const w = this.d.w || this.props.w;
    const { table_name: tableName } = w;

    if (tableName && (w as any).$cloneSync && !this.loading) {
      this.loading = true;
      this.wSub = await w.$cloneSync((w, delta) => {
        this.setData({ w }, { w: delta });
      });
      this.getTableInfo();
    }

    if (dS && "query" in dS) {
      this.setState({ error: undefined });
    }
  };

  render() {
    const {
      onClose,
      w,
      prgl: { db, dbs, tables },
      suggestions,
    } = this.props;

    const { infoQuery, l1Key, query, initError, tableMeta } = this.state;

    if (initError) {
      return (
        <div className="p-1 relative">
          <ErrorComponent error={initError} />
        </div>
      );
    }

    const table = tables.find((t) => t.name === w.table_name);

    const cardOptions =
      w.options.viewAs?.type === "card" ? w.options.viewAs : undefined;

    let queryForm: React.ReactNode = null;
    if (query) {
      queryForm = (
        <SQLSmartEditor
          key={query.sql}
          sql={db.sql!}
          query={query.sql}
          title={query.title || "Query"}
          contentTop={query.contentTop}
          suggestions={suggestions}
          onSuccess={() => {
            query.onSuccess?.();
            this.setState({ query: undefined, schemaAge: Date.now() });
            this.getTableInfo();
          }}
          onCancel={() => {
            this.setState({ query: undefined });
          }}
        />
      );
    }

    let l1Opts: TabItems | undefined;

    const commonProps = {
      ...this.props,
      tableMeta,
      onSetQuery: (query) => this.setState({ query }),
    };
    if (w.table_name) {
      l1Opts = {
        ...(tableMeta && {
          "Table info": {
            label: table?.info.isView ? "View info" : undefined,
            leftIconPath: mdiInformationOutline,
            disabledText: db.sql ? undefined : "Not enough privileges",
            content: <W_TableMenu_TableInfo {...commonProps} />,
          },
        }),

        Columns: {
          leftIconPath: mdiViewColumnOutline,
          content: (
            <ColumnsMenu
              nestedColumnOpts={undefined}
              w={w}
              db={db}
              tables={tables}
              onClose={onClose}
              suggestions={suggestions}
            />
          ),
        },

        "Data Refresh": {
          leftIconPath: mdiSyncCircle,
          style:
            (w.options.refresh?.type || "None") === "None" ?
              {}
            : { color: "var(--active)" },
          content: <AutoRefreshMenu w={w} db={db} />,
        },

        ...(tableMeta && {
          Triggers: {
            label: "Triggers " + tableMeta.triggers.length,
            disabledText: db.sql ? undefined : "Not enough privileges",
            leftIconPath: mdiFlash,
            content: <W_TableMenu_Triggers {...commonProps} />,
          },

          Constraints: {
            label: "Constraints " + tableMeta.constraints.length,
            leftIconPath: mdiContentSaveCogOutline,
            disabledText: db.sql ? undefined : "Not enough privileges",
            content: <W_TableMenu_Constraints {...commonProps} />,
          },

          Indexes: {
            label: "Indexes " + tableMeta.indexes.length,
            leftIconPath: mdiDatabaseSearch,
            disabledText: db.sql ? undefined : "Not enough privileges",
            content: <W_TableMenu_Indexes {...commonProps} />,
          },

          Policies: {
            label: "Policies " + tableMeta.policiesCount,
            leftIconPath: mdiShieldAccount,
            disabledText: db.sql ? undefined : "Not enough privileges",
            content: <W_TableMenu_Policies {...commonProps} />,
          },

          "Access rules": {
            label: "Access rules " + tableMeta.accessRules.length,
            leftIconPath: mdiAccountMultiple,
            disabledText:
              (dbs.access_control as any).find ?
                undefined
              : "Not enough privileges",
            content: <W_TableMenu_AccessRules {...commonProps} />,
          },

          "Current Query": {
            leftIconPath: mdiScript,
            content: <W_TableMenu_CurrentQuery {...commonProps} />,
          },
        }),
        "Display options": {
          leftIconPath: mdiCog,
          content: <W_TableMenu_DisplayOptions {...this.props} />,
        },
      };
    }
    const tableName = w.table_name;

    return (
      <div
        className="table-menu c-s-fit flex-col"
        style={{ maxHeight: "calc(100vh - 65px)", maxWidth: "100vw" }}
      >
        {queryForm}
        <Tabs
          key={this.state.schemaAge}
          variant="vertical"
          contentClass={
            "max-w-700 min-h-0 max-h-100v flex-col min-w-0 " +
            (l1Key !== "Columns" ? " p-1 " : "") +
            (l1Key === "Columns" ? " " : " ")
          }
          items={l1Opts ?? {}}
          compactMode={window.isMobileDevice ? "hide-inactive" : undefined}
          activeKey={l1Key}
          onChange={async (l1Key: any) => {
            this.setState({ l1Key, query: undefined, infoQuery: undefined });
            if (!this.d.w) return;

            if (l1Key === "View as card") {
              this.d.w.$update(
                {
                  options: {
                    viewAs: {
                      type: "card",
                      maxCardWidth: cardOptions?.maxCardWidth ?? "700px",
                    },
                  },
                },
                { deepMerge: true },
              );
            } else if (l1Key === "Columns") {
              const columnsConfig = await getAndFixWColumnsConfig(tables, w);
              this.setState({ columnsConfig });
            } else if (l1Key === "Filter") {
              this.d.w.$update({
                show_menu: false,
                filter: [],
              });
            }
          }}
        />
        {l1Key === "Columns" && tableName && db.sql && infoQuery && (
          <div className="flex-col o-auto p-1">
            <FormField
              className="mb-1"
              label={infoQuery.label}
              readOnly={true}
              asTextArea={true}
              value={infoQuery.query}
            />
          </div>
        )}
      </div>
    );
  }
}
