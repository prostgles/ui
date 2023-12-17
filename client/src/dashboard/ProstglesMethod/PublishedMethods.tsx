import { mdiDelete, mdiLanguageTypescript, mdiPencil, mdiPlus } from "@mdi/js";
import { isDefined, omitKeys, pickKeys } from "prostgles-types";
import React, { useState } from "react";
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import Popup from "../../components/Popup/Popup";
import { SwitchToggle } from "../../components/SwitchToggle";
import { SectionHeader } from "../AccessControl/AccessControlRuleEditor";
import { MethodDefinition } from "../AccessControl/Methods/MethodDefinition";
import SmartCardList from "../SmartCard/SmartCardList";
import { useMethods } from "./hooks";

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
  const methods = useMethods(dbs, connectionId)

  const [newMethod, setNewMethod] = useState<Partial<typeof methods[number]>>();
  const isNewMethod = !newMethod?.id;

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
    noDataComponent={<InfoRow color="info">No created functions</InfoRow>}
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
                <div className="text-gray-400">
                  {(!m.arguments.length? " ()" : ` ({ ${m.arguments.map(a => `${a.name}: ${a.type}`).join("; ")} })`)}
                </div>
              </FlexRow>
              {!!m.description.trim() && <div className="text-gray-400">
                {m.description}
              </div>}
            </FlexCol>
            <div className="flex-row ai-center show-on-trigger-hover">
              <Btn iconPath={mdiPencil} 
                onClick={async () => {
                  setNewMethod(await dbs.published_methods.findOne({ id: m.id }))
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
      <Btn iconPath={mdiPlus}
        className="mt-1"
        variant={forAccessRule? "faded" : "filled" }
        size={forAccessRule? "small" : undefined }
        color="action"
        title="Create new method"
        onClick={() => {
          setNewMethod({
            name: "my_new_func",
            arguments: [],
            run: "export const run: MyMethod = async (args, { db, dbo, user }) => {\n  \n}",
            connection_id: connectionId
          })
        }}
      >Create function</Btn>
    }
  />; 

  return <div className={className + " flex-col gap-1"} style={style}>
    <SectionHeader icon={mdiLanguageTypescript}>
      Functions (Experimental)
    </SectionHeader>

    <div className="flex-col pl-2 gap-1">
      {functionList}

      <div className="flex-col f-1">
        
        {newMethod && <Popup 
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
            method={newMethod}
            tables={tables} 
            dbsTables={dbsTables}
            db={db}
            theme={prgl.theme}
            onChange={m => setNewMethod(m)}
          /> 
        </Popup>}

        
      </div>
    </div>
  </div>

}