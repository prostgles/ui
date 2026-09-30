import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { pageReload } from "@components/Loader/Loading";
import { SearchList } from "@components/SearchList/SearchList";
import Tabs from "@components/Tabs";
import { mdiFormatListCheckbox, mdiPencil } from "@mdi/js";
import { isEmpty, isEqual } from "prostgles-types";
import React, { useState } from "react";
import { MethodDefinition } from "../AccessControl/Methods/MethodDefinition";
import type { W_MethodProps } from "./W_Method";

export const W_MethodMenu = (
  props: W_MethodProps & { closeMenu: () => void },
) => {
  const {
    prgl: { dbs, user, connectionId },
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

  if (!method || isEmpty(method)) return null;

  return (
    <Tabs
      variant={"vertical"}
      contentClass="flex-col min-s-0 f-1 p-0"
      compactMode={window.isMobileDevice ? "hide-inactive" : undefined}
      defaultActiveKey={"args"}
      items={{
        args: {
          label: "Arguments",
          leftIconPath: mdiFormatListCheckbox,
          content: (
            <div className="flex-col p-p5">
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
                      a.type.includes("Lookup") &&
                      "table" in a &&
                      typeof a.table === "string" ?
                        `references ${a.table}`
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
            <FlexCol className="flex-col f-1 min-s-0 gap-1">
              <MethodDefinition
                dbKey={props.prgl.dbKey}
                dbs={props.prgl.dbs}
                connectionId={connectionId}
                dbsMethods={props.prgl.dbsMethods}
                method={{ ...(editedMethod ?? method) }}
                dbsTables={props.prgl.dbsTables}
                tables={props.prgl.tables}
                onChange={(v) => {
                  if (isEqual(v, method)) {
                    setEditedMethod(undefined);
                  } else {
                    setEditedMethod(v as any);
                  }
                }}
                db={props.prgl.db}
              />
              <FlexRow className="p-1">
                <Btn onClick={closeMenu} variant="faded">
                  {!editedMethod ? "Close" : "Cancel"}
                </Btn>

                <Btn
                  variant="faded"
                  color="danger"
                  clickConfirmation={{
                    buttonText: "Delete",
                    color: "danger",
                    message:
                      "You are about to delete this function. Are you sure?",
                  }}
                  onClickPromise={async () => {
                    await dbs.published_methods.delete({ id: method.id });
                    w.$update({ closed: true, deleted: true });
                    closeMenu();
                  }}
                >
                  Delete
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
                          void pageReload("edited published_methods");
                        }, 500);
                      }
                    }}
                  >
                    Update
                  </Btn>
                )}
              </FlexRow>
            </FlexCol>
          ),
        },
      }}
    />
  );
};
