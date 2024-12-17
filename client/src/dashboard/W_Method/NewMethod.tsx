import React, { useState } from "react";
import Popup from "../../components/Popup/Popup";
import {
  useAsyncEffectQueue,
  useIsMounted,
  usePromise,
} from "prostgles-client/dist/react-hooks";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import { omitKeys, pickKeys } from "../../utils";
import { MethodDefinition } from "../AccessControl/Methods/MethodDefinition";
import { pageReload } from "../../components/Loading";

export type Method = DBSSchema["published_methods"] & {
  access_control_methods: DBSSchema["access_control_methods"][];
};

type P = Pick<
  Prgl,
  "dbs" | "db" | "tables" | "dbsTables" | "dbsMethods" | "theme" | "dbKey"
> & {
  /** If undefined then it's a new method */
  methodId: number | undefined;
  access_rule_id: number | undefined;
  connectionId: string;
  onClose: VoidFunction;
};
export const NewMethod = ({
  dbKey,
  theme,
  db,
  dbs,
  methodId,
  connectionId,
  onClose,
  dbsTables,
  tables,
  dbsMethods,
  access_rule_id,
}: P) => {
  const [newMethod, setNewMethod] = useState<Partial<Omit<Method, "id">>>({
    name: "my_new_func",
    arguments: [],
    run: "export const run: ProstglesMethod = async (args, { db, dbo, user }) => {\n  \n}",
    connection_id: connectionId,
    description: "",
    outputTable: null,
  });
  const getIsMounted = useIsMounted();
  useAsyncEffectQueue(async () => {
    if (!methodId) return;
    const existingMethod = await dbs.published_methods.findOne({
      id: methodId,
    });
    if (!getIsMounted() || !existingMethod) return;
    setNewMethod(existingMethod);
  }, [methodId]);
  const isNewMethod = methodId === undefined;

  return (
    <Popup
      title={isNewMethod ? "Add function" : `Update ${methodId}`}
      positioning="fullscreen"
      onClickClose={false}
      onClose={onClose}
      footerButtons={[
        {
          onClickClose: true,
          label: "Close",
        },
        {
          label: !isNewMethod ? "Update" : "Add",
          color: "action",
          variant: "filled",
          onClickPromise: async () => {
            if (methodId) {
              await dbs.published_methods.update(
                { id: methodId },
                omitKeys(newMethod, ["access_control_methods"]),
              );
            } else {
              const { id } = await dbs.published_methods.insert(
                {
                  ...newMethod,
                  connection_id: connectionId,
                },
                { returning: { id: 1 } },
              );

              if (access_rule_id) {
                await dbs.access_control_methods.insert({
                  access_control_id: access_rule_id,
                  published_method_id: id,
                });
              }
              pageReload("inserted published_methods");
            }
            onClose();
          },
        },
      ]}
      contentClassName="flex-col gap-1 p-2"
    >
      <MethodDefinition
        dbKey={dbKey}
        dbs={dbs}
        connectionId={connectionId}
        dbsMethods={dbsMethods}
        method={newMethod}
        tables={tables}
        dbsTables={dbsTables}
        db={db}
        theme={theme}
        onChange={(m) => setNewMethod(m)}
      />
    </Popup>
  );
};
