import React from 'react';

import { SubscriptionHandler } from "prostgles-types";
import RTComp, { DeepPartial } from "../RTComp";

import { URLSearchParamsInit } from "react-router-dom";
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import { Prgl } from '../../App';
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from '../../components/Flex';
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import { DBS } from "../Dashboard/DBS";
import { AcessControlUserTypes, Workspace } from "../Dashboard/dashboardUtils";
import { AccessControlRuleEditor } from "./AccessControlRuleEditor";
import { AccessControlRules } from "./ExistingAccessRules";


type P = { // Pick<CommonWindowProps, "db" | "dbs" | "tables" | "dbsMethods" | "dbsTables" | "dbMethods"> & 
  prgl: Prgl;
  className?: string;
  searchParams: URLSearchParams;
  setSearchParams: (nextInit: URLSearchParamsInit)=>void;
}


type D = {
}

export type AccessRule = Required<DBSSchema["access_control"]> & { 
  access_control_user_types: { 
    ids: string[] 
  }[]; 
  published_methods: Required<DBSSchema["published_methods"]>[];
};

export type EditedAccessRule = Omit<AccessRule, "database_id" | "id">;

export type AccessControlAction =
  | { 
      type: "create";
      selectedRuleId?: undefined;
    } 
  | { 
      type: "create-default";
      selectedRuleId?: undefined;
    } 
  | {
      type: "edit";
      selectedRuleId: number;
    };

export type AccessControlState = {
  loading: boolean;
  tables: {
    name: string;
    is_view: boolean;
    columns: string;
  }[];
  connection?: DBSSchema["connections"];
  database_config?: DBSSchema["database_configs"];
  dbsConnection?: DBSSchema["connections"];
  rule?: AccessRule; 
  ruleWasEdited?: boolean;
  error?: any;
  rules: AccessRule[];
  existingACUserTypes: AcessControlUserTypes[];

  workspaces?: Workspace[]; 
}

const SEARCH_PARAMS = {
  SELECTED_RULE_ID: "editRuleId",
  CREATE_RULE: "createRule", 
} as const;

export class AccessControl extends RTComp<P, AccessControlState, D> {
  
  state: AccessControlState = {
    loading: false,
    tables: [],
    rules: [],
    existingACUserTypes: [],
  }

  d = {
  }

  loaded = false;
  acSub?: SubscriptionHandler;
  conUTypesSub?: SubscriptionHandler;
  ugSub?: SubscriptionHandler;

  static ACCESS_CONTROL_SELECT = { 
    select: { 
      "*": 1,
      access_control_user_types: { ids: { "$array_agg": ["user_type"] } },
      published_methods: "*"    
    },      
  } as const;
  
  //@ts-ignores
  static getRules = async (dbs: DBS, filter: Parameters<typeof dbs.access_control.find>[0]): Promise<AccessControlState["rules"]> => { 
    const rules = await dbs.access_control.find(filter, AccessControl.ACCESS_CONTROL_SELECT);
    return rules;
  }

  get action(): AccessControlAction | undefined {
    const { searchParams } = this.props;
    const selectedRuleId = searchParams.get(SEARCH_PARAMS.SELECTED_RULE_ID);
    const createRule = searchParams.get(SEARCH_PARAMS.CREATE_RULE); 
    
    return selectedRuleId? {
      type: "edit",
      selectedRuleId: +selectedRuleId,
    } : createRule? {
      type: "create",
    } : undefined;
  }

  set action(newAction: AccessControlAction | undefined ) {
    const { setSearchParams, searchParams } = this.props;
    if(!newAction){
      searchParams.delete(SEARCH_PARAMS.CREATE_RULE) 
      searchParams.delete(SEARCH_PARAMS.SELECTED_RULE_ID)
      setSearchParams(searchParams);
    } else if(newAction.type === "create") {
      searchParams.delete(SEARCH_PARAMS.SELECTED_RULE_ID) 
      searchParams.set(SEARCH_PARAMS.CREATE_RULE, "true");
      setSearchParams(searchParams);
    } else if(newAction.type === "create-default") {
      searchParams.delete(SEARCH_PARAMS.SELECTED_RULE_ID)
      searchParams.delete(SEARCH_PARAMS.CREATE_RULE) 
      setSearchParams(searchParams);
    } else {
      searchParams.delete(SEARCH_PARAMS.CREATE_RULE); 
      searchParams.set(SEARCH_PARAMS.SELECTED_RULE_ID, newAction.selectedRuleId.toString());
      setSearchParams(searchParams);
    }
  }

  async onDelta(deltaP: Partial<P>, deltaS: Partial<AccessControlState>, deltaD?: DeepPartial<D>){
    const { connectionId, dbs } = this.props.prgl;

    const _dbs = dbs as Partial<typeof dbs>;
    if(connectionId && !this.acSub && _dbs.access_control_user_types?.subscribe && _dbs.access_control && _dbs.connections && _dbs.workspaces){

      const dbConf = await dbs.database_configs.findOne({ $existsJoined: { connections: { id: connectionId } } });
      if(!dbConf) return;
      const database_id = dbConf.id
      const setRules = async () => {
        const rules = await AccessControl.getRules(dbs, { database_id });
        this.setState({
          rules
        });
      }
      this.acSub = await dbs.access_control.subscribe({ database_id }, { select: "" }, (rules: any) => {
        setRules();
      }) as any;

      this.conUTypesSub = await dbs.access_control_user_types.subscribe({ }, { select: "" }, existingACUserTypes => {
        setRules();
      });

      this.setState({
        connection: await dbs.connections.findOne({ id: connectionId }),
        dbsConnection: await dbs.connections.findOne({ is_state_db: true }),
      });

      this.setState({
        workspaces: await dbs.workspaces.find(),
        database_config: dbConf,
      })
    }
  }

  async onUnmount(){
    this.ugSub?.unsubscribe();
    this.acSub?.unsubscribe();
    this.conUTypesSub?.unsubscribe();
  } 

  render(){
    const { workspaces, connection, rules, dbsConnection, database_config } = this.state;
    const { className, prgl } = this.props;
    const { action } = this;

    if(!(prgl.dbs.access_control_user_types as any)?.subscribe){
      return <InfoRow className='f-0 h-fit'>Must be admin to access this section </InfoRow>
    }

    if(!connection || !dbsConnection || !database_config) return <Loading />;
     
    return (<div className={"flex-col f-1 " + className}>

        <div className="f-1 flex-row min-h-0 ">
          {action? 
            <AccessControlRuleEditor 
              { ...this.props }
              database_config={database_config}
              action={action}  
              connection={connection} 
              dbsConnection={dbsConnection}
              onCancel={() => {
                this.action = undefined;
                this.setState({ rule: undefined });
              }} 
            /> :
            <FlexCol className="f-1 relative">
              <FlexRow>
                <Btn variant="filled" 
                  color="action"
                  data-command="config.ac.create"
                  onClick={() => { 
                    this.action = { type: "create" } 
                  }}
                >
                  Create new rule
                </Btn> 

              </FlexRow>

              <AccessControlRules 
                workspaces={workspaces ?? []}
                rules={rules} 
                onSelect={r => {
                  this.action = { type: "edit", selectedRuleId: r.id } 
                }} 
              />

            </FlexCol>
          }

        </div>
      </div>
      
    )
  }
}
