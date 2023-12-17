import {
  mdiCalendar,
  mdiCodeBrackets,
  mdiCodeJson,
  mdiFileQuestion,
  mdiFormatText,
  mdiFunctionVariant,
  mdiKey,
  mdiKeyLink,
  mdiLink,
  mdiMapMarker,
  mdiNumeric,
  mdiTimetable,
  mdiToggleSwitchOutline
} from "@mdi/js";
import { SingleSyncHandles, SyncDataItem } from "prostgles-client/dist/SyncedTable";
import { DBHandlerClient } from 'prostgles-client/dist/prostgles';
import { ValidatedColumnInfo } from "prostgles-types";
import React from 'react';
import { Icon } from "../../../components/Icon/Icon";
import Popup from "../../../components/Popup/Popup";
import { SearchListItem } from "../../../components/SearchList";
import { CommonWindowProps } from '../../Dashboard/Dashboard';
import { WindowData, WindowSyncItem } from "../../Dashboard/dashboardUtils";
import RTComp from '../../RTComp';
import { SQLSmartEditor } from "../../SQLEditor/SQLSmartEditor";
import { getColumnDataColor, tsDataTypeFromUdtName } from "../../SmartForm/SmartFormField/SmartFormField";
import { ColumnConfigWInfo } from "../W_Table";
import { getFullColumnConfig, updateWCols } from "../tableUtils/tableUtils";
import { AddColumnMenu } from "./AddColumnMenu";
import { AddComputedColMenu } from "./AddComputedColMenu";
import { ColumnList } from "./ColumnList";
import { ColumnConfig } from './ColumnMenu';
import { colIs } from "./ColumnSelect";
import { LinkedColumn } from "./LinkedColumn/LinkedColumn";


type P = {
  db: DBHandlerClient;
  w: WindowSyncItem<"table">;
  nestedColumnName?: string;
  tables: CommonWindowProps["tables"];
  suggestions: CommonWindowProps["suggestions"] | undefined;
  onClose: () => any;
  showAddCompute?: { colName?: string };
}
type S = {
  query?: {
    sql: string;
    hint?: string;
  };
  addColMenu?: Element;
  addRefColMenu?: boolean;
  w?: SyncDataItem<Required<WindowData<"table">>, true>
}

export default class ColumnsMenu extends RTComp<P, S> {

  state: S = {
    addColMenu: undefined,
    query: undefined,
  }

  wSub?: SingleSyncHandles<Required<WindowData<"table">>, true>;
  
  onDelta = async () => {    
    const w = this.props.w;

    if (!this.wSub) {
      this.wSub = await w.$cloneSync(w => {
        this.setState({ w });
      });
    }
  }

  get tableName(){
    const { nestedColumnName, w } = this.props;
    if(nestedColumnName){
      const nestedCol = w.columns?.find(c => c.name === nestedColumnName)
      return nestedCol?.nested?.path.at(-1)?.table;
    }

    return w.table_name;
  }

  render() {
    const { w, addColMenu, query } = this.state;
    const { db, tables, nestedColumnName, onClose, showAddCompute } = this.props;
    if (!w) return null;
    
    let table = tables.find(t => t.name === this.tableName);
    let cols = getFullColumnConfig(tables, w);
    const onUpdateCols = (columns: ColumnConfig[]) => {
      return updateWCols(w, columns, nestedColumnName);
    }
    
    const nestedColumn = nestedColumnName? w.columns?.find(c => c.name === nestedColumnName) : undefined;
    if(nestedColumn){
      if(!nestedColumn.nested) {
        return <div>Invalid nested column config</div>
      }
      const nestedTableName = nestedColumn.nested.path.at(-1)!.table;
      table = tables.find(t => t.name === nestedTableName);
      cols = getFullColumnConfig(tables, { table_name: nestedTableName!, columns: nestedColumn.nested.columns });
    }

    if(!table || !this.tableName) {
      return <div>{this.tableName} table not found</div>
    }

    let popup: React.ReactNode = null;
    if(addColMenu || showAddCompute){
      popup = <AddComputedColMenu 
        db={db}
        tableHandler={db[this.tableName] as any}
        selectedColumn={showAddCompute?.colName}
        w={w}
        anchorEl={addColMenu} 
        tables={tables}
        nestedColumnName={nestedColumnName}
        onClose={() => {
          this.setState({ addColMenu: undefined })
          onClose();
        }}
      />
    } else if(this.state.addRefColMenu){
      popup = <Popup title="Add Linked Data">
        <LinkedColumn
          db={db}
          column={undefined}
          tables={tables}
          w={w}
          onClose={onClose}
        />
      </Popup>
    }

    if(query && this.props.suggestions){
      return <div className="flex-col f-1 min-h-0 p-1">
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
    }

    return (
      <div className="flex-col f-1 min-h-0">
        {popup}
        <ColumnList 
          columns={cols}
          tableColumns={table.columns}
          mainMenuProps={{ db, onClose, suggestions: this.props.suggestions, table: table!, tables, w }}
          onChange={onUpdateCols}
        />
        <div className="flex-col p-1">
          <AddColumnMenu 
            variant="detailed" 
            w={w} 
            db={db} 
            suggestions={this.props.suggestions} 
            tables={tables} 
            nestedColumnName={nestedColumnName}
          />
        </div>
      </div>
    );
  }
} 

export const getColumnIconPath = (
  c: Partial<Pick<ValidatedColumnInfo, "udt_name" | "tsDataType" | "references" | "is_pkey">>, 
  columnWInfo?: ColumnConfigWInfo,
) => {
  const tsDataType = c.tsDataType ?? tsDataTypeFromUdtName(c.udt_name ?? "")
  return  c.is_pkey? mdiKey :
    c.references? mdiKeyLink :
    c.udt_name === "date"? mdiCalendar :
    c.udt_name?.startsWith("timestamp")? mdiTimetable :
    columnWInfo?.computedConfig? mdiFunctionVariant :
    colIs(c, "_PG_geometric")? mdiMapMarker :
    (tsDataType === "any" || c.udt_name?.startsWith("json"))? mdiCodeJson :
    tsDataType === "string"? mdiFormatText :
    colIs(c, "_PG_date")? mdiCalendar : 
    tsDataType === "number"? mdiNumeric :
    tsDataType === "boolean"?  mdiToggleSwitchOutline :
    tsDataType.endsWith("[]")?  mdiCodeBrackets :
    columnWInfo?.nested?  mdiLink :
    mdiFileQuestion
}


export const getColumnListItem = (
  c: Pick<ValidatedColumnInfo, "name"> & Partial<Pick<ValidatedColumnInfo, "udt_name" | "tsDataType" | "references" | "is_pkey">> & { disabledInfo?: string }, 
  columnWInfo?: ColumnConfigWInfo,
): Pick<SearchListItem, "data" | "title"> & { key: string;  label: string; subLabel?: string;  contentLeft: React.ReactNode; disabledInfo?: string } => {
  const subLabel = 
    columnWInfo?.nested? columnWInfo.nested.columns.map(c => c.name).join(", ") : 
    columnWInfo? `${columnWInfo.info?.udt_name ?? columnWInfo.computedConfig?.funcDef.outType.udt_name}      ${columnWInfo.info?.is_nullable? "nullable" : ""}` : 
    c.udt_name;
  return {
    key: c.name, 
    label: c.name + (!c.references ? "" : `    (${(c.references.map(r => r.ftable).join(", "))})`),
    subLabel,
    data: c,
    disabledInfo: c.disabledInfo,
    title: columnWInfo?.nested? "referenced data" : (c.udt_name || "computed"),
    contentLeft: <Icon size={1} className="mr-1 text-gray-400" 
      style={{color: getColumnDataColor(c, "var(--gray-500)") }} 
      path={getColumnIconPath(c, columnWInfo)} 
    />, 
  };
}