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
  forAccessRule: undefined | {
    access_rule_id: number | undefined;
  };
  prgl: Prgl;
}

export const PublishedMethods = ({ className, style, prgl, forAccessRule }: P) => {
  const { dbsMethods, dbsTables, dbs, db, tables, connectionId } = prgl;

  const [action, setAction] = useState<{ type: "update"; existingMethodId: number; } | { type: "create" }>();

  const { access_rule_id } = forAccessRule ?? {};
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
      !access_rule_id? undefined : {
        name: "access_control_methods",
        select: "*",
        label: " ", 
        render: (v, row) => <SwitchToggle 
          checked={v?.some(a => a.access_control_id === access_rule_id)}
          onChange={checked => {
            if(!checked){
              dbs.access_control_methods.delete({ published_method_id: row.id, access_control_id: access_rule_id })
            } else {
              dbs.access_control_methods.insert({ published_method_id: row.id, access_control_id: access_rule_id })
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
          variant={forAccessRule? "faded" : "filled" }
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
    <SectionHeader icon={forAccessRule? mdiLanguageTypescript : undefined}>
      Functions
    </SectionHeader>
    {!forAccessRule && 
      <p className="p-0 m-0">
        Server-side user triggered functions
      </p>
    }
    <div className={`flex-col gap-1 ${forAccessRule? "pl-2" : ""}`}>
      {functionList}

      <div className="flex-col f-1">
        {action && <NewMethod 
          {...prgl}
          connectionId={connectionId} 
          access_rule_id={access_rule_id}
          dbs={dbs} 
          onClose={() => setAction(undefined)}
          methodId={action.type === "update"? action.existingMethodId : undefined} 
        />}
        {/* {newMethod && <Popup 
          title={isNewMethod? "Add function" : `Update ${newMethod.id}`} 
          // rootStyle={{ transform: "none", top: 0, }}
          positioning="fullscreen"
          onClickClose={false} 
          onClose={() => setNewMethod(undefined)}
          footerButtons={[
            { 
              onClickClose: true,
              label: "Close"
            },
            { 
              label: !isNewMethod? "Update" : "Add",
              color: "action",
              variant: "filled",
              onClickMessage: async (e, setM) => {
                setM({ loading: 1 });

                try {
                  if(newMethod.id){
                    await dbs.published_methods.update(pickKeys(newMethod, ["id"]), omitKeys(newMethod, ["access_control_methods"]))
                  } else {
                    const { id } = await dbs.published_methods.insert({ ...newMethod, connection_id: connectionId }, { returning: { id: 1 } });
                    if(access_rule_id){
                      await dbs.access_control_methods.insert({ access_control_id: access_rule_id, published_method_id: id })
                    }
                  }
                } catch (err){
                  setM({ err })
                }
                setM({ loading: 0 })
                setNewMethod(undefined);
              },
            }
          ]}
          contentClassName="flex-col gap-1 p-2"
        >
         <MethodDefinition 
            connectionId={connectionId}
            dbsMethods={dbsMethods}
            method={newMethod}
            tables={tables} 
            dbsTables={dbsTables}
            db={db}
            theme={prgl.theme}
            onChange={m => setNewMethod(m)}
          /> 
        </Popup>} */}

        
      </div>
    </div>
   
  </FlexCol>

}


// export const useMethods = (dbs: DBS, connection_id: string) => {
  
//   const [methods, setMethods] = useState<Method[]>([]);
  
//   const getIsMounted = useIsMounted();
//   useEffectAsync(async () => {
//     const filter: AnyObject = {
//       connection_id, 
//       // ...(!access_control_id? {} : { 
//       //   $existsJoined: {
//       //     access_control_methods: { 
//       //       access_control_id 
//       //     }
//       //   } 
//       // })
//     };
//     const sub = await dbs.published_methods.subscribe(filter, { select: { "*": 1, access_control_methods: "*" } }, methods => {
//       if(!getIsMounted()){ 
//         return;
//       }
//       setMethods(methods as any); 
//     }); 
//     return sub.unsubscribe; 
//   }, []); 

//   return methods;
// }