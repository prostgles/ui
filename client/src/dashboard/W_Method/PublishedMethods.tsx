import { mdiDelete, mdiLanguageTypescript, mdiPencil, mdiPlus } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { isDefined } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { DBSSchema } from "@common/publishUtils";
import type { Prgl } from "../../App";
import Btn from "@components/Btn";
import ConfirmationDialog from "@components/ConfirmationDialog";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import PopupMenu from "@components/PopupMenu";
import { SwitchToggle } from "@components/SwitchToggle";
import { SectionHeader } from "../AccessControl/AccessControlRuleEditor";
import type { ValidEditedAccessRuleState } from "../AccessControl/useEditedAccessRule";
import { SmartCardList } from "../SmartCardList/SmartCardList";
import { ProcessLogs } from "../TableConfig/ProcessLogs";
import { NewMethod } from "./NewMethod";
import { FunctionLabel } from "./FunctionLabel";
import type { DBS } from "../Dashboard/DBS";
import type { FieldConfig } from "../SmartCard/SmartCard";

type P = {
  className?: string;
  style?: React.CSSProperties;
  accessRuleId: number | undefined;
  prgl: Prgl;
  editedRule: ValidEditedAccessRuleState | undefined;
};

export const PublishedMethods = ({
  className,
  style,
  prgl,
  accessRuleId,
  editedRule,
}: P) => {
  const { dbsMethods, dbsTables, dbs, connectionId } = prgl;
  const { listProps, action, setAction } = useSmartCardListProps({
    dbs,
    connectionId,
    editedRule,
  });

  return (
    <FlexCol className={className} style={style}>
      <SectionHeader icon={mdiLanguageTypescript}>Functions</SectionHeader>
      <div className={`flex-col gap-1 pl-2 `}>
        <p className="p-0 m-0">Server-side user triggered functions</p>
        <SmartCardList
          db={dbs as DBHandlerClient}
          methods={dbsMethods}
          tables={dbsTables}
          tableName="published_methods"
          realtime={true}
          noDataComponent={
            <InfoRow color="info" variant="filled">
              No functions
            </InfoRow>
          }
          showEdit={false}
          {...listProps}
          footer={
            <FlexRow className="mt-1">
              <Btn
                iconPath={mdiPlus}
                variant={isDefined(accessRuleId) ? "faded" : "filled"}
                color="action"
                title="Create new method"
                onClick={() => {
                  setAction({ type: "create" });
                }}
              >
                Create function
              </Btn>
              <PopupMenu
                title="Logs"
                onClickClose={false}
                button={<Btn variant="faded">Show logs</Btn>}
                showFullscreenToggle={{ defaultValue: true }}
                clickCatchStyle={{ opacity: 0.5 }}
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
        />
        <div className="flex-col f-1">
          {action && (
            <NewMethod
              {...prgl}
              connectionId={connectionId}
              access_rule_id={accessRuleId}
              dbs={dbs}
              onClose={() => setAction(undefined)}
              methodId={
                action.type === "update" ? action.existingMethodId : undefined
              }
            />
          )}
        </div>
      </div>
    </FlexCol>
  );
};

const useSmartCardListProps = ({
  dbs,
  connectionId,
  editedRule,
}: {
  dbs: DBS;
  connectionId: string;
  editedRule: P["editedRule"];
}) => {
  const [action, setAction] = useState<
    { type: "update"; existingMethodId: number } | { type: "create" }
  >();

  const listProps = useMemo(() => {
    const filter = { connection_id: connectionId };
    const style = { width: "fit-content" };
    const rowProps = {
      className: "trigger-hover",
    };
    const fieldConfigs: FieldConfig<DBSSchema["published_methods"]>[] = [
      { name: "description", hide: true },
      { name: "arguments", hide: true },
      {
        name: "name",
        renderMode: "full",
        render: (v, row: DBSSchema["published_methods"]) =>
          !editedRule ?
            <FunctionLabel {...row} />
          : <SwitchToggle
              checked={
                !!editedRule.newRule?.access_control_methods?.some(
                  (m) => m.published_method_id === row.id,
                )
              }
              label={{
                children: <FunctionLabel {...row} />,
              }}
              onChange={(checked) => {
                const access_control_methods =
                  editedRule.newRule?.access_control_methods ?? [];

                editedRule.onChange({
                  access_control_methods:
                    checked ?
                      [
                        ...access_control_methods,
                        { published_method_id: row.id },
                      ]
                    : access_control_methods.filter(
                        (a) => a.published_method_id !== row.id,
                      ),
                });
              }}
            />,
      } satisfies FieldConfig<DBSSchema["published_methods"]>,
      {
        name: "id",
        label: " ",
        className: "f-1 ",
        render: (v, row: DBSSchema["published_methods"]) => (
          <FlexRow className="noselect w-full">
            <div className="ml-auto flex-row ai-center show-on-trigger-hover">
              <Btn
                title="Edit function"
                iconPath={mdiPencil}
                onClick={async () => {
                  setAction({
                    type: "update",
                    existingMethodId: row.id,
                  });
                }}
              />
              <PopupMenu
                button={
                  <Btn
                    title="Delete function..."
                    color="danger"
                    iconPath={mdiDelete}
                  />
                }
                onClickClose={false}
                clickCatchStyle={{ opacity: 1 }}
                render={(pClose) => (
                  <ConfirmationDialog
                    acceptBtn={{
                      color: "danger",
                      text: "Delete function",
                      dataCommand: "PublishedMethods.deleteFunction",
                    }}
                    message="Are you sure you want to delete this function?"
                    onAccept={async () => {
                      await dbs.published_methods.delete({ id: row.id });
                    }}
                    onClose={pClose}
                  />
                )}
              />
            </div>
          </FlexRow>
        ),
      },
    ].filter(isDefined);
    return {
      filter,
      fieldConfigs,
      style,
      rowProps,
    };
  }, [connectionId, editedRule, dbs.published_methods]);

  return {
    listProps,
    action,
    setAction,
  };
};
