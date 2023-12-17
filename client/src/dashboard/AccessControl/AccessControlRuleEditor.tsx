import React, { PropsWithChildren, useState } from 'react';

import { mdiAccount, mdiClose, mdiTableAccount, mdiTableLock } from "@mdi/js";
import { ContextDataObject, DBSSchema, TableRulesErrors } from "../../../../commonTypes/publishUtils";
import { dataCommand } from '../../Testing';
import Btn from "../../components/Btn";
import ButtonGroup from "../../components/ButtonGroup";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRow, classOverride } from "../../components/Flex";
import { Icon } from "../../components/Icon/Icon";
import Loading from '../../components/Loading';
import { CommonWindowProps } from "../Dashboard/Dashboard";
import { PublishedMethods } from "../ProstglesMethod/PublishedMethods";
import { AccessControlAction, AccessControlState, AccessRule, EditedAccessRule } from "./AccessControl";
import { AccessRuleEditorFooter } from "./AccessRuleEditorFooter";
import { PAllTables } from "./PermissionTypes/PAllTables";
import { PCustomTables } from "./PermissionTypes/PCustomTables";
import { PRunSQL } from "./PermissionTypes/PRunSQL";
import { PublishedWorkspaceSelector } from "./PublishedWorkspaceSelector";
import { UserStats } from "./UserStats";
import { UserTypeSelect } from "./UserTypeSelect";
import { ValidEditedAccessRuleState, useEditedAccessRule } from "./useEditedAccessRule";
import { usePromise } from "../ProstglesMethod/hooks";


const ACCESS_TYPES = ["Custom", "All views/tables", "Run SQL"] as const;
export type PermissionEditProps = Pick<UserGroupRuleEditorProps, "prgl" | "dbsConnection"> & {
  action: AccessControlAction;
  contextData: ContextDataObject | undefined; 
  userTypes: string[];
  editedRule: ValidEditedAccessRuleState | undefined;
}

export type TableErrors = Record<string, TableRulesErrors> | string;

type UserGroupRuleEditorProps = Pick<CommonWindowProps, "prgl">  & {
  action: AccessControlAction;
  connection: Required<AccessControlState>["connection"];
  database_config: DBSSchema["database_configs"];
  dbsConnection: Required<AccessControlState>["connection"];  
  onCancel: VoidFunction;
}

export const AccessControlRuleEditor = ({ 
  action, database_config,
  prgl, dbsConnection, onCancel, 
}: UserGroupRuleEditorProps) => {
  const {
    dbs, dbsTables, dbsMethods, connection,  tables
  } = prgl;
  const editedRule = useEditedAccessRule({ action, prgl });
  
  const [wspErrors, setWspErrors] = useState<string>();
 
  const currentSQLUser: string | undefined = usePromise(async () => await prgl.db.sql?.(`SELECT "current_user"()`, {}, { returnType: "value" }));

  if(!editedRule){
    return <Loading />;
  }
 
  if(editedRule.type === "edit-not-found"){
    return <ErrorComponent error={`${action.selectedRuleId} was not found`} />
  }

  const { userTypes, onChange, newRule, rule } = editedRule;
  const title = action.selectedRuleId? `Edit rule` : action.type === "create-default"? "Create default rule" : "Create new rule";


  const { dbPermissions, dbsPermissions } = newRule ?? {};

  const tablesWithRules = tables.map(t => {
    const rule = dbPermissions?.type === "Custom"? dbPermissions.customTables.find(ct => ct.tableName === t.name) : 
      dbPermissions?.type === "All views/tables"? Object.fromEntries(dbPermissions.allowAllTables.map(r => [r, true])) : 
      undefined
    return {
      ...t,
      rule
    };
  }).sort((a, b) => (+(!!b.rule) - +(!!a.rule)) || a.name.localeCompare(b.name));
  
  const permEditorProps = {
    action, prgl, tablesWithRules,
    contextData: editedRule.contextData,
    dbsConnection, connection, userTypes,
    onChange: (newDBPerm: AccessRule["dbPermissions"]) => onChange({ ...rule, dbPermissions: newDBPerm }), 
    rule,
    editedRule,
  }
    
  return <FlexCol 
    className={"AccessRuleEditor f-1 gap-2 min-s-0 jc-none"}
  >

    <FlexRow className="bt b-gray-300 text-1p5"> 
      <div className="py-1 font-20 bold noselect f-1 ws-nowrap text-ellipsis">
        {title}
      </div>
      <Btn 
        className="ml-auto f-0" 
        iconPath={mdiClose} 
        onClick={onCancel} 
      />
    </FlexRow>
     
    <FlexRow> 
      <SectionHeader icon={mdiAccount} className=" mr-auto ">
        Target user types
      </SectionHeader>

      <UserStats theme={prgl.theme}  dbs={dbs} dbsTables={dbsTables} dbsMethods={dbsMethods} />
    </FlexRow>

    <div className="pl-2">
      <UserTypeSelect 
        data-command={"config.ac.edit.user"}
        connectionId={connection.id} 
        database_id={database_config.id}
        userTypes={editedRule.userTypes} 
        fromEditedRule={editedRule.initialUserTypes}
        dbs={dbs} 
        onChange={newUserGroupNames => {
          editedRule.onChange({
            access_control_user_types: [{ ids: newUserGroupNames }]
          })
        }} 
      />
    </div>
 
    <FlexCol className={"_RuleTypeSection flex-col  " + ((editedRule.userTypes.length || action.type === "create-default")? "" : " hidden ")}>

      <SectionHeader icon={mdiTableAccount} className=" mt-2 ">
        Access type
      </SectionHeader>
      <div className="pl-2 mt-p5 "  {...dataCommand("config.ac.edit.type")}>
        <ButtonGroup 
          value={(newRule ?? rule)?.dbPermissions?.type} 
          options={ACCESS_TYPES}
          className="mb-1"
          onChange={accessType => {
            let dbPermissions: EditedAccessRule["dbPermissions"] = { type: "Custom", customTables: [] };
            const dbsPermissions: EditedAccessRule["dbsPermissions"] = { ...rule?.dbsPermissions, createWorkspaces: true };
            if(accessType === "Run SQL"){
              dbPermissions = { type: accessType, allowSQL: false };
            } else if(accessType === "All views/tables"){
              dbPermissions = { type: accessType, allowAllTables: [] }
            }

            editedRule.onChange({
              dbPermissions, 
              dbsPermissions
            })

            setWspErrors(undefined);
          }}
        />
      </div>
      {dbPermissions && 
        <div className="pl-2 ">
          {dbPermissions.type === "Run SQL"?  
            <FlexCol className="gap-p25">
              <span>The selected user groups will be allowed to run SQL queries.</span>
              <span>This is the same level of access to the database as the current user <strong>"{currentSQLUser}"</strong></span>
            </FlexCol> :
          dbPermissions.type === "All views/tables"? 
            "Allow read and/or write access to specified tables" : 
            "Fine grained access control to specified tables"
          }
        </div>
      }
    </FlexCol>

    {dbPermissions && 
      <FlexCol className={"_DataSection pb-4 " + (dbPermissions.type === "Custom"? " f-1 " : " f-0 ")}>
        {dbPermissions.type === "Custom" && 
          <PublishedWorkspaceSelector
            tables={tables}
            className="mb-1"
            prgl={prgl} 
            dbsPermissions={dbsPermissions ?? null}
            onSetError={err => {
              setWspErrors(err)
            }}
            wspError={wspErrors}
            dbPermissions={dbPermissions}
            onChange={newDbsPermissions => { 
            
              onChange({
                dbsPermissions: {
                  ...dbsPermissions,
                  ...newDbsPermissions
                },
              })
            }} 
            onChangeRule={newRule => {
              onChange({
                ...rule,
                ...newRule
              } as any)
            }}
          />
        }

        {dbPermissions.type !== "Run SQL" && 
          <SectionHeader icon={mdiTableLock}>
            Data access
          </SectionHeader>
        }
        <div 
          className="pl-2 f-0 flex-col min-h-0 h-fit"  
          style={{ maxHeight: "min(60vh, 450px)" }}
          {...dataCommand("config.ac.edit.dataAccess")}
        >
          {
            dbPermissions.type === "Run SQL"?  
              <PRunSQL 
                { ...permEditorProps}
                dbPermissions={dbPermissions} 
              />:

            dbPermissions.type === "All views/tables"? 
              <PAllTables 
                { ...permEditorProps}
                dbPermissions={dbPermissions} 
              /> : 

            <PCustomTables 
              { ...permEditorProps} 
              dbPermissions={dbPermissions}
              onChange={newDBPerm => onChange({ ...rule, dbPermissions: newDBPerm })}
            />
          }

        </div>
      
        <PublishedMethods 
          className="my-2" 
          prgl={prgl}
          forAccessRule={{
            access_rule_id: action.type === "edit"? action.selectedRuleId : undefined 
          }}
        />

        <AccessRuleEditorFooter 
          editedRule={editedRule}
          dbs={dbs} 
          database_id={database_config.id}
          action={action} 
          onCancel={onCancel}
          connectionId={connection.id}
          error={wspErrors}
        />
        {/* {(editedRule.type === "edit" || editedRule.type === "create-complete" || wspErrors) &&  
        } */}

      </FlexCol>
    }
  </FlexCol>
}

export const SectionHeader = ({ icon, children, className }: PropsWithChildren<{ icon: string; className?: string; }>) => {
  return <div className={classOverride("SectionHeader flex-row gap-p5 ai-center", className)}>
    <Icon path={icon} />
    <h3 className="m-0 p-0">{children}</h3>
  </div>
}