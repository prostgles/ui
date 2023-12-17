import {
  mdiCog, mdiContentSaveCogOutline,
  mdiDatabaseSearch,
  mdiFlash,
  mdiInformationOutline,
  mdiScript,
  mdiShieldAccount,
  mdiSyncCircle,
  mdiViewColumnOutline
} from "@mdi/js";
import { TableHandlerClient } from 'prostgles-client/dist/prostgles';
import React from 'react';
import Tabs, { TabItems } from '../../../components/Tabs';
import RTComp from '../../RTComp';
 
import { SQLHandler, TableInfo, ParsedJoinPath } from "prostgles-types";
import FormField from "../../../components/FormField/FormField";
import { ColumnConfigWInfo, W_TableProps, } from "../W_Table";
 
import { OnAddChart, WindowSyncItem } from '../../Dashboard/dashboardUtils';
 
import Btn from '../../../components/Btn';
import ErrorComponent from '../../../components/ErrorComponent';
import { FlexCol } from '../../../components/Flex';
import CodeExample from '../../CodeExample';
import { CommonWindowProps } from "../../Dashboard/Dashboard";
import { SQLSmartEditor } from "../../SQLEditor/SQLSmartEditor";
import ColumnsMenu from '../ColumnMenu/ColumnsMenu';
import { getTableFilter } from "../getTableData";
import { getSort } from "../tableUtils/tableUtils";
import { W_TableMenu_Constraints } from "./W_TableMenu_Constraints";
import { W_TableMenu_DisplayOptions } from "./W_TableMenu_DisplayOptions";
import { W_TableMenu_Indexes } from "./W_TableMenu_Indexes";
import { W_TableMenu_Policies } from "./W_TableMenu_Policies";
import { W_TableMenu_TableInfo } from "./W_TableMenu_TableInfo";
import { W_TableMenu_Triggers } from "./W_TableMenu_Triggers";
import { ColumnsConfig, getColumnsConfig } from "./getColumnsConfig";
import { getTableMeta } from "./getTableMeta";
import { AutoRefreshMenu } from "./AutoRefreshMenu";
import { getTableSelect } from "../tableUtils/getTableSelect";
import ButtonGroup from "../../../components/ButtonGroup";

 
export type W_TableMenuProps = Pick<W_TableProps, "workspace" | "prgl" | "externalFilters" | "joinFilter"> & {
  onAddChart?: OnAddChart;
  w: WindowSyncItem< "table">;
  onLinkTable?: (tableName: string, path: ParsedJoinPath[]) => any;
  cols: ColumnConfigWInfo[]; //Pick<ValidatedColumnInfo, "name" | "label" | "tsDataType" | "udt_name">[];
  suggestions: CommonWindowProps["suggestions"];
  onClose: () => any;
};
export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

export type RefreshOptions =  {
  readonly refresh?: { 
    readonly type: "Realtime" | "None" | "Interval", 
    intervalSeconds: number;
    throttleSeconds: number; 
  }
}
const QUERY_TYPE = ["SQL", "Prostgles API"] as const;
export type W_TableMenuState = {
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
  columnsConfig?: ColumnsConfig;
  infoQuery?: {
    label: string;
    query: string;
  }
  autoRefreshSeconds?: number;
  constraints?: {}[];
  tableMeta?: Unpromise<ReturnType<typeof getTableMeta>>;
  tableInfo?: TableInfo;

  linkTablePath?: string[];

  currentQuery?: string;
  currentQueryType: typeof QUERY_TYPE[number]
}

type D = {
  w?: WindowSyncItem<"table">;
}


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
    currentQueryType: "SQL"
  }

  d: D = {
    w: undefined
  }

  onUnmount = async () => {
    if(this.wSub) await this.wSub.$unsync();
  }

  getTableInfo(){
    const { prgl:{db}, w } = this.props;
    if(w.table_name && db.sql){
      getTableMeta(db, w.table_name, w.table_oid).then(async tableMeta => {
        this.setState({ tableMeta })
      }).catch(initError => {
        console.error(initError)
        // this.setState({ initError })
      })
    }
  }

  wSub?: ReturnType<Required<D>["w"]["$cloneSync"]>;
  autoRefresh: any;
  loading = false;
  onDelta = async (dP, dS) => { 
    const w = this.d.w || this.props.w;
    const { table_name: tableName } = w;

    if(tableName && (w as any).$cloneSync && !this.loading){
      this.loading = true;
      this.wSub = await w.$cloneSync((w, delta)=> {
        this.setData({ w }, { w: delta });
      });
      this.getTableInfo();
      // if(!w.columns || !Array.isArray(w.columns)){

      // updateWCols(w, cols.map(n => ({ name: n.name, tsDataType: n.tsDataType , show: true })));
      //   w.$update({ columns:  })
      // }
    }


    if(dS && ("query" in dS)){
      this.setState({ error: undefined })
    }
  }

  render(){
    const {  
      onClose,
      w,
      prgl:{
        db, 
        tables,
      },
      suggestions,
    } = this.props;

    const { 
      infoQuery, l1Key, query, initError, 
      tableMeta,
    } = this.state;

    if(initError){
      return <div className="p-1 relative">
        <ErrorComponent error={initError} />
        
      </div>
    }


    const table = tables.find(t => t.name === w.table_name);

    const cardOptions = w.options.viewAs?.type === "card"? w.options.viewAs : undefined;

    let queryForm: React.ReactNode = null;
    if(query){
      queryForm = <SQLSmartEditor 
        key={query.sql}
        sql={db.sql!} 
        query={query.sql} 
        title={query.title || "Query"}
        contentTop={query.contentTop}
        suggestions={suggestions}
        onSuccess={() => {
          query.onSuccess?.();
          this.setState({ query: undefined })
          this.getTableInfo();
        }}
        onCancel={() => {
          this.setState({ query: undefined })
        }}
      />
    }

    let l1Opts: TabItems | undefined;
    
    const commonProps = { 
      ...this.props,
      tableMeta,
      onSetQuery: query => this.setState({ query })
    }
    if(w.table_name){
      l1Opts = {
        ...(tableMeta && {
          "Table info": {
            label: table?.info.isView? "View info" : undefined,
            leftIconPath: mdiInformationOutline,
            disabledText: db.sql? undefined : "Not enough privileges",
            content: <W_TableMenu_TableInfo { ...commonProps } />
          },
        }),

        "Columns": {
          leftIconPath: mdiViewColumnOutline,
          content: <ColumnsMenu w={w} db={db} tables={tables} onClose={onClose} suggestions={suggestions} />
        },

        "Data Refresh": {
          leftIconPath: mdiSyncCircle,
          style: (w.options.refresh?.type || "None") === "None" ? {} : { color: "var(--blue-600)" },
          content: <AutoRefreshMenu w={w} db={db} />
        },

        ...(tableMeta && {

          "Triggers": {
            label: "Triggers " + tableMeta.triggers.length,
            disabledText: db.sql? undefined : "Not enough privileges",
            leftIconPath: mdiFlash,
            content: <W_TableMenu_Triggers { ...commonProps } />
          },
    
          "Constraints": {
            label: "Constraints " + tableMeta.constraints.length,
            leftIconPath: mdiContentSaveCogOutline,
            disabledText: db.sql? undefined : "Not enough privileges",
            content: <W_TableMenu_Constraints { ...commonProps } />
          },
    
          "Indexes": {
            label: "Indexes " + tableMeta.indexes.length,
            leftIconPath: mdiDatabaseSearch,
            disabledText: db.sql? undefined : "Not enough privileges",
            content: <W_TableMenu_Indexes { ...commonProps } />
          },
          
          "Policies": {
            label: "Policies " + tableMeta.policiesCount,
            leftIconPath: mdiShieldAccount,
            disabledText: db.sql? undefined : "Not enough privileges",
            content: <W_TableMenu_Policies {...commonProps } />
            
          },

          "Current Query": {
            leftIconPath: mdiScript,
            content: <FlexCol>
              <ButtonGroup 
                value={this.state.currentQueryType} 
                options={QUERY_TYPE} 
                onChange={currentQueryType => this.setState({ currentQueryType, currentQuery: "" })} 
              />
              <Btn 
                onClickPromise={async () => {
                  const filter = getTableFilter(w, this.props);
                  const { select } = await getTableSelect(w, tables, db, filter);
                  const orderBy = getSort(tables, w);
                  let currentQuery = "";
                  const selectParams = { select, orderBy }
                  if(this.state.currentQueryType === "SQL"){
                    //@ts-ignore
                    currentQuery = (await db[tableName]?.find?.(filter, selectParams, { returnQuery: true })) as unknown as string;
                  } else {
                    currentQuery = `await db['${w.table_name}'].find(\n  ${JSON.stringify(filter, null, 2)}, \n  ${JSON.stringify(selectParams, null, 2)}\n)`
                  }
                  this.setState({ currentQuery });
                }}
                variant="faded"
                color="action"
                disabledInfo={this.state.currentQuery? "Already shown" : undefined}
              >Show current query</Btn>
              
              {this.state.currentQuery && 
                <CodeExample
                  style={{
                    minWidth: "500px",
                    minHeight: "500px"
                  }}
                  language={this.state.currentQueryType === "SQL"? "sql" : "javascript"}
                  value={this.state.currentQuery}
                />
              }
            </FlexCol>
          }
  
        }),
        "Display options": {
          leftIconPath: mdiCog,
          content: <W_TableMenu_DisplayOptions { ...this.props} />
        },


      }

    }
    const tableName = w.table_name;

    return (
      <div 
        className="table-menu c-s-fit flex-col" style={{ maxHeight: "calc(100vh - 65px)", maxWidth: "100vw"}}
      >
        {queryForm}
        <Tabs
          variant="vertical"
          contentClass={" min-h-0 max-h-100v flex-col min-w-0 " + (l1Key !== "Columns"? " p-1 " : "") + (l1Key === "Columns"? " " : " ")}
          items={l1Opts ?? {}}
          compactMode={window.isMobileDevice}
          activeKey={l1Key}
          onChange={async (l1Key: any) => {
            this.setState({ l1Key, query: undefined, infoQuery: undefined });
            if(!this.d.w) return;

            if(l1Key === "View as card"){
              this.d.w.$update({ options: { viewAs: { type: "card" , maxCardWidth: cardOptions?.maxCardWidth ?? "700px" } }}, { deepMerge: true });
              
            } else if(l1Key === "Columns"){
              const columnsConfig = await getColumnsConfig(db[tableName] as TableHandlerClient, w, true)
              this.setState({ columnsConfig });

            } else if(l1Key === "Filter"){
              this.d.w.$update({
                show_menu: false,
                filter: []
              });
              
            }
          }}
        />
        {l1Key === "Columns" && tableName && db.sql && infoQuery && <div className="flex-col o-auto p-1">
          <FormField className="mb-1"
            label={infoQuery.label}
            readOnly={true}
            asTextArea={true}
            value={infoQuery.query}
          />
        </div>}
      </div>
    )
  }
}




export type ColumnConstraint = {
  constraint_name: string;
  table_name: string;
  column_name: string;
  data_type: string;
  constraint_type: "PRIMARY KEY" | "FOREIGN KEY" | "CHECK" | "UNIQUE";
  delete_rule: string | null;
  update_rule: string | null;
  foreign_table_schema: string | null;
  foreign_table_name: string | null;
  foreign_column_name: string | null;
}

export const getColumnConstraints = (tableName: string, columnName: string, sql: SQLHandler): Promise<ColumnConstraint[]> => {
  return sql(`
    SELECT DISTINCT 
      trim(constraint_type) as constraint_type, tc.constraint_name,
      tc.table_schema, 
      tc.table_name, 
      kcu.column_name, 
      c.data_type,
      rc.delete_rule,
      rc.update_rule,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.columns AS c 
        ON c.table_schema = tc.table_schema
        AND tc.table_name = c.table_name AND kcu.column_name = c.column_name
      LEFT JOIN information_schema.referential_constraints rc 
        ON rc.constraint_name = tc.constraint_name 
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.table_name = $1 AND c.column_name = $2
  `, [tableName, columnName], { returnType: "rows" }) as any;

}