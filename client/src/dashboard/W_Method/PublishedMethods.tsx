import { mdiDelete, mdiLanguageTypescript, mdiPencil, mdiPlus } from "@mdi/js";
import { isDefined } from "prostgles-types";
import React, { useState } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import { SwitchToggle } from "../../components/SwitchToggle";
import { SectionHeader } from "../AccessControl/AccessControlRuleEditor";
import SmartCardList from "../SmartCard/SmartCardList";
import { ProcessLogs } from "../TableConfig/ProcessLogs";
import { NewMethod } from "./NewMethod"; 

type P = {
  className?: string;
  style?: React.CSSProperties;
  accessRuleId: number | undefined;
  prgl: Prgl;
}

export const PublishedMethods = ({ className, style, prgl, accessRuleId }: P) => {
  const { dbsMethods, dbsTables, dbs, connectionId } = prgl;

  const [action, setAction] = useState<{ type: "update"; existingMethodId: number; } | { type: "create" }>();
 
  const functionList = <SmartCardList 
    theme={prgl.theme}
    db={dbs as any}
    methods={dbsMethods}
    tables={dbsTables}
    tableName="published_methods"
    realtime={true} 
    filter={{ connection_id: connectionId }}
    showEdit={false} 
    style={{ width: "fit-content" }}
    rowProps={{
      className: "trigger-hover"
    }}
    noDataComponent={<InfoRow color="info">No functions</InfoRow>}
    fieldConfigs={[
      { name: "description", hide: true },
      { name: "name", hide: true },
      { name: "id", hide: true },
      !isDefined(accessRuleId)? undefined : {
        name: "access_control_methods",
        select: "*",
        label: " ", 
        render: (v, row) => <SwitchToggle 
          checked={v?.some(a => a.access_control_id === accessRuleId)}
          onChange={checked => {
            if(!checked){
              dbs.access_control_methods.delete({ published_method_id: row.id, access_control_id: accessRuleId })
            } else {
              dbs.access_control_methods.insert({ published_method_id: row.id, access_control_id: accessRuleId })
            }
          }}
        />
      },
      {
        name: "arguments", 
        label: " ",
        // hide: true,
        render: (v, m: DBSSchema["published_methods"]) => (
          <FlexRow className="noselect">
            <FlexCol>
              <FlexRow>
                <div className="font-18">
                  {m.name}
                </div>
                <div className="text-2">
                  {(!m.arguments.length? " ()" : ` ({ ${m.arguments.map(a => `${a.name}: ${a.type}`).join("; ")} })`)}
                </div>
              </FlexRow>
              {!!m.description.trim() && <div className="text-2">
                {m.description}
              </div>}
            </FlexCol>
            <div className="flex-row ai-center show-on-trigger-hover">
              <Btn iconPath={mdiPencil} 
                onClick={async () => {
                  setAction({
                    type: "update",
                    existingMethodId: m.id
                  });
                }}
              />  
              <Btn iconPath={mdiDelete}
                color="danger"
                onClick={async () => {
                  await dbs.published_methods.delete({ id: m.id })
                }}
              />
            </div>
          </FlexRow>
        )
      }, 
    ].filter(isDefined)}
    footer={
      <FlexRow className="mt-1">
        <Btn 
          iconPath={mdiPlus}          
          variant={isDefined(accessRuleId)? "faded" : "filled" }
          color="action"
          title="Create new method"
          onClick={() => {
            setAction({ type: "create" });
          }}
        >Create function</Btn>
        <PopupMenu 
          title="Logs" 
          onClickClose={false}
          button={<Btn variant="faded">Show logs</Btn>}
          showFullscreenToggle={{ defaultValue: true }}
          clickCatchStyle={{ opacity: .5 }}
          positioning="center"
        >
          <ProcessLogs 
            noMaxHeight={true}
            type="methods" 
            connectionId={connectionId} 
            dbs={dbs} 
            dbsMethods={dbsMethods} 
          />
        </PopupMenu>
      </FlexRow>
    }
  />; 

  return <FlexCol className={className} style={style}>
    <SectionHeader icon={isDefined(accessRuleId)? mdiLanguageTypescript : undefined}>
      Functions
    </SectionHeader>
    {!isDefined(accessRuleId) && 
      <p className="p-0 m-0">
        Server-side user triggered functions
      </p>
    }
    <div className={`flex-col gap-1 ${isDefined(accessRuleId)? "pl-2" : ""}`}>
      {functionList}
      <div className="flex-col f-1">
        {action && <NewMethod 
          {...prgl}
          connectionId={connectionId} 
          access_rule_id={accessRuleId}
          dbs={dbs} 
          onClose={() => setAction(undefined)}
          methodId={action.type === "update"? action.existingMethodId : undefined} 
        />} 
      </div>
    </div>
   
  </FlexCol>

} 