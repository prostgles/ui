import { mdiFormatListCheckbox, mdiPencil } from "@mdi/js";
import React, { useState } from "react";
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import SearchList from "../../components/SearchList"; 
import Tabs from "../../components/Tabs"; 
import { MethodDefinition } from "../AccessControl/Methods/MethodDefinition"; 
import { isEmpty } from "../Dashboard/Dashboard"; 
import { ProstglesMethodProps } from "./ProstglesMethod";
import { usePromise } from "./hooks";

export const ProstglesMethodMenu = (props: ProstglesMethodProps & {  closeMenu: () => void; }) => {
  const { prgl: { dbs, user, connectionId }, w, closeMenu } = props;
  const method = usePromise(() => dbs.published_methods.findOne({ name: w.method_name, connection_id: connectionId }), [w.method_name]);
  const [editedMethod, seteditedMethod] = useState<DBSSchema["published_methods"]>();

  const isAdmin = user?.type === "admin";
  const { hiddenArgs = [] } = w.options;

  if(!method || isEmpty(method)) return null;

  return <Tabs 
    variant={"vertical"}
    contentClass="o-auto f-1 p-p25"
    // defaultActiveKey={isAdmin? "edit" : undefined}
    defaultActiveKey={"args"}
    items={{
      args: {
        label: "Arguments",
        leftIconPath: mdiFormatListCheckbox,
        content: <div className="flex-col ">
          <SearchList 
            onMultiToggle={v => {
              const hiddenArgs = v.filter(d => !d.checked).map(d => d.key) as string[];
              w.$update({ options: { ...w.options, hiddenArgs } }, { deepMerge: true });
            }}
            items={method.arguments.map(a => {
              const checked = !hiddenArgs.includes(a.name);
              return {
                key: a.name,
                subLabel: a.type.startsWith("Lookup")? (`references ${(a as any).table}`) : a.type,
                checked,
                disabledInfo: !a.optional? "Is required" : undefined,
                onPress: () => {
                  w.$update({ options: { ...w.options, hiddenArgs: !checked? hiddenArgs.filter(da => da !== a.name) : [...hiddenArgs, a.name]  } }, { deepMerge: true });
                }
              }
            })}
          />
        </div>
      },
      edit: {
        label: "Edit definition",
        leftIconPath: mdiPencil,
        disabledText: !isAdmin? "Not allowed" : undefined,
        content: <div className="flex-col o-auto f-1 min-s-0 p-1 gap-1">
          <MethodDefinition 
            method={{...(editedMethod ?? method)}}
            theme={props.prgl.theme}
            dbsTables={props.prgl.dbsTables}
            tables={props.tables}
            onChange={v => seteditedMethod(v as any)}
            db={props.prgl.db}
          />
          <div className="p-1 flex-row ai-center">

            <Btn onClick={closeMenu}
              variant="faded"
            >
              {!editedMethod? "Close" : "Cancel"}
            </Btn>

            {editedMethod && <Btn 
              color="action"
              variant="filled"
              className=" ml-auto"
              onClickPromise={ async () => {

                const oldMethod = await dbs.published_methods.findOne({ id: method.id });
                if(oldMethod){
                  await dbs.published_methods.update({ id: method.id }, editedMethod);
                  w.$update({ method_name: editedMethod.name });
                  setTimeout(() => {
                    location.reload();
                  }, 500)
                }
              }}
            >
              Update
            </Btn>}

            </div> 
        </div>
      }
    }}/>
}