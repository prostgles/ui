import { mdiCog, mdiFormatListCheckbox, mdiPencil } from "@mdi/js";
import { isEmpty } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import { JSONBSchemaA } from "../../components/JSONBSchema/JSONBSchema";
import { pageReload } from "../../components/Loading";
import SearchList from "../../components/SearchList/SearchList";
import Tabs from "../../components/Tabs";
import { MethodDefinition } from "../AccessControl/Methods/MethodDefinition";
import type { W_MethodProps } from "./W_Method";

export const W_MethodMenu = (
  props: W_MethodProps & { closeMenu: () => void },
) => {
  const {
    prgl: { dbs, dbsTables, user, connectionId },
    w,
    closeMenu,
  } = props;
  const { data: method } = dbs.published_methods.useFindOne({
    name: w.method_name,
    connection_id: connectionId,
  });
  const [editedMethod, setEditedMethod] =
    useState<DBSSchema["published_methods"]>();

  const isAdmin = user?.type === "admin";
  const { hiddenArgs = [] } = w.options;

  const functionCol = useMemo(() => {
    return dbsTables
      .find((t) => t.name === "windows")
      ?.columns.find((c) => c.name === "function_options");
  }, []);
  if (!method || isEmpty(method)) return null;

  return (
    <Tabs
      variant={"vertical"}
      contentClass="o-auto f-1 p-p25"
      compactMode={window.isMobileDevice ? "hide-inactive" : undefined}
      // defaultActiveKey={isAdmin? "edit" : undefined}
      defaultActiveKey={"args"}
      items={{
        display: {
          label: "Display",
          leftIconPath: mdiCog,
          content: (
            <div className="flex-col o-auto f-1 min-s-0 p-1 gap-1">
              {functionCol?.jsonbSchema && (
                <JSONBSchemaA
                  schema={functionCol.jsonbSchema}
                  db={props.prgl.db}
                  tables={props.tables}
                  onChange={(v) => {
                    w.$update({ function_options: v });
                  }}
                  value={w.function_options}
                />
              )}
            </div>
          ),
        },
        args: {
          label: "Arguments",
          leftIconPath: mdiFormatListCheckbox,
          content: (
            <div className="flex-col ">
              <SearchList
                onMultiToggle={(v) => {
                  const hiddenArgs = v
                    .filter((d) => !d.checked)
                    .map((d) => d.key) as string[];
                  w.$update(
                    { options: { ...w.options, hiddenArgs } },
                    { deepMerge: true },
                  );
                }}
                items={method.arguments.map((a) => {
                  const checked = !hiddenArgs.includes(a.name);
                  return {
                    key: a.name,
                    subLabel:
                      a.type.startsWith("Lookup") ?
                        `references ${(a as any).table}`
                      : a.type,
                    checked,
                    disabledInfo: !a.optional ? "Is required" : undefined,
                    onPress: () => {
                      w.$update(
                        {
                          options: {
                            ...w.options,
                            hiddenArgs:
                              !checked ?
                                hiddenArgs.filter((da) => da !== a.name)
                              : [...hiddenArgs, a.name],
                          },
                        },
                        { deepMerge: true },
                      );
                    },
                  };
                })}
              />
            </div>
          ),
        },
        edit: {
          label: "Edit definition",
          leftIconPath: mdiPencil,
          disabledText: !isAdmin ? "Not allowed" : undefined,
          content: (
            <div className="flex-col o-auto f-1 min-s-0 p-1 gap-1">
              <MethodDefinition
                dbKey={props.prgl.dbKey}
                dbs={props.prgl.dbs}
                connectionId={connectionId}
                dbsMethods={props.prgl.dbsMethods}
                method={{ ...(editedMethod ?? method) }}
                theme={props.prgl.theme}
                dbsTables={props.prgl.dbsTables}
                tables={props.tables}
                onChange={(v) => setEditedMethod(v as any)}
                db={props.prgl.db}
              />
              <div className="p-1 flex-row ai-center">
                <Btn onClick={closeMenu} variant="faded">
                  {!editedMethod ? "Close" : "Cancel"}
                </Btn>

                {editedMethod && (
                  <Btn
                    color="action"
                    variant="filled"
                    className=" ml-auto"
                    onClickPromise={async () => {
                      const oldMethod = await dbs.published_methods.findOne({
                        id: method.id,
                      });
                      if (oldMethod) {
                        await dbs.published_methods.update(
                          { id: method.id },
                          editedMethod,
                        );
                        w.$update({ method_name: editedMethod.name });
                        setTimeout(() => {
                          pageReload("edited published_methods");
                        }, 500);
                      }
                    }}
                  >
                    Update
                  </Btn>
                )}
              </div>
            </div>
          ),
        },
      }}
    />
  );
};
