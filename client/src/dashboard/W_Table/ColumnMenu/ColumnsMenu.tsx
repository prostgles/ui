import Popup from "@components/Popup/Popup";

import type {
  SingleSyncHandles,
  SyncDataItem,
} from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { type ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import { WithPrgl } from "../../../WithPrgl";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type {
  WindowData,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import RTComp from "../../RTComp";
import { SQLSmartEditor } from "../../SQLEditor/SQLSmartEditor";
import {
  colIs,
  tsDataTypeFromUdtName,
} from "../../SmartForm/SmartFormField/fieldUtils";
import type { ColumnConfigWInfo } from "../W_Table";
import { getFullColumnConfig, updateWCols } from "../tableUtils/tableUtils";
import { AddColumnMenu } from "./AddColumnMenu";
import { AddComputedColMenu } from "./AddComputedColumn/AddComputedColMenu";
import { ColumnList } from "./ColumnList";
import type { ColumnConfig } from "./ColumnMenu";
import { LinkedColumn } from "./LinkedColumn/LinkedColumn";
import type { NestedColumnOpts } from "./getNestedColumnTable";

type P = {
  db: DBHandlerClient;
  w: WindowSyncItem<"table">;
  nestedColumnOpts: NestedColumnOpts | undefined;
  tables: CommonWindowProps["tables"];
  suggestions: CommonWindowProps["suggestions"] | undefined;
  onClose: () => any;
  showAddCompute?: { colName?: string };
};
type S = {
  query?: {
    sql: string;
    hint?: string;
  };
  addColMenu?: Element;
  addRefColMenu?: boolean;
  w?: SyncDataItem<Required<WindowData<"table">>, true>;
};

export class ColumnsMenu extends RTComp<P, S> {
  state: S = {
    addColMenu: undefined,
    query: undefined,
  };

  wSub?: SingleSyncHandles<Required<WindowData<"table">>, true>;

  onDelta = async () => {
    const w = this.props.w;

    if (!this.wSub) {
      this.wSub = await w.$cloneSync((w) => {
        this.setState({ w });
      });
    }
  };

  get tableName() {
    const { nestedColumnOpts, w } = this.props;
    if (nestedColumnOpts) {
      // const nestedCol = w.columns?.find(c => c.name === nestedColumnName)
      // return nestedCol?.nested?.path.at(-1)?.table;
      return nestedColumnOpts.config.nested?.path.at(-1)?.table;
    }

    return w.table_name;
  }

  render() {
    const { w, addColMenu, query } = this.state;
    const { db, tables, nestedColumnOpts, onClose, showAddCompute } =
      this.props;
    if (!w) return null;

    let table = tables.find((t) => t.name === this.tableName);
    let cols = getFullColumnConfig(tables, w);
    const nestedColumnName = nestedColumnOpts?.config.name;
    const onUpdateCols = (columns: ColumnConfig[]) => {
      if (nestedColumnOpts?.type === "new") {
        throw "Not implemented";
      }
      return updateWCols(w, columns, nestedColumnName);
    };

    const nestedColumn =
      nestedColumnName ?
        w.columns?.find((c) => c.name === nestedColumnName)
      : undefined;
    if (nestedColumn) {
      if (!nestedColumn.nested) {
        return <div>Invalid nested column config</div>;
      }
      const nestedTableName = nestedColumn.nested.path.at(-1)!.table;
      table = tables.find((t) => t.name === nestedTableName);
      cols = getFullColumnConfig(tables, {
        table_name: nestedTableName!,
        columns: nestedColumn.nested.columns,
      });
    }

    if (!table || !this.tableName) {
      return <div>{this.tableName} table not found</div>;
    }

    let popup: React.ReactNode = null;
    if (addColMenu || showAddCompute) {
      popup = (
        <AddComputedColMenu
          db={db}
          tableHandler={db[this.tableName] as any}
          selectedColumn={showAddCompute?.colName}
          w={w}
          anchorEl={addColMenu}
          tables={tables}
          nestedColumnOpts={nestedColumnOpts}
          onClose={() => {
            this.setState({ addColMenu: undefined });
            onClose();
          }}
        />
      );
    } else if (this.state.addRefColMenu) {
      popup = (
        <Popup title="Add Linked Data">
          <LinkedColumn
            db={db}
            column={undefined}
            tables={tables}
            w={w}
            onClose={onClose}
          />
        </Popup>
      );
    }

    if (query && this.props.suggestions) {
      return (
        <div className="flex-col f-1 min-h-0 p-1">
          <SQLSmartEditor
            title="Create new column"
            sql={db.sql!}
            query={query.sql}
            hint={query.hint}
            suggestions={this.props.suggestions}
            onCancel={() => this.setState({ query: undefined })}
            onSuccess={onClose}
          />
        </div>
      );
    }

    return (
      <div className="flex-col f-1 min-h-0">
        {popup}
        <WithPrgl
          onRender={(prgl) => (
            <ColumnList
              columns={cols}
              tableColumns={table!.columns}
              mainMenuProps={{
                db,
                onClose,
                suggestions: this.props.suggestions,
                table: table!,
                tables,
                w,
                prgl,
              }}
              onChange={onUpdateCols}
            />
          )}
        />
        <div className="flex-col p-1">
          <AddColumnMenu
            variant="detailed"
            w={w}
            db={db}
            suggestions={this.props.suggestions}
            tables={tables}
            nestedColumnOpts={nestedColumnOpts}
          />
        </div>
      </div>
    );
  }
}
