import { mdiAssistant, mdiClose, mdiPlus } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import Chip from "../../components/Chip";
import { FlexCol, FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import PopupMenu from "../../components/PopupMenu";
import { SwitchToggle } from "../../components/SwitchToggle";
import { SectionHeader } from "../AccessControl/AccessControlRuleEditor";
import type { ValidEditedAccessRuleState } from "../AccessControl/useEditedAccessRule";
import { SmartForm } from "../SmartForm/SmartForm";
import { SetupLLMCredentials } from "./SetupLLMCredentials";
import { useLLMSetupState } from "./useLLMSetupState";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { dbsConnection } from "../../../../commonTypes/dbsConnection";

type P = Prgl & {
  accessRuleId: number | undefined;
  editedRule: ValidEditedAccessRuleState | undefined;
  className?: string;
  style?: React.CSSProperties;
};
export const AskLLMAccessControl = ({
  dbs,
  connectionId,
  accessRuleId,
  className,
  style,
  editedRule,
  ...prgl
}: P) => {
  const { dbsTables } = prgl;
  const [localPromptId, setLocalPromptId] = useState<number>();
  const [localCredentialId, setLocalCredentialId] = useState<number>();
  const rule = editedRule?.newRule ?? editedRule?.rule;
  const isAllowed = !!rule?.access_control_allowed_llm?.length;
  const { data: creds } = dbs.llm_credentials.useSubscribe({});
  const { data: prompts } = dbs.llm_prompts.useSubscribe({});
  const allowedItems = rule?.access_control_allowed_llm?.map((d) => ({
    ...d,
    llm_prompt: prompts?.find((p) => p.id === d.llm_prompt_id),
    llm_credential: creds?.find((c) => c.id === d.llm_credential_id),
  }));

  /** We need to reset form after both values are undefined */
  const [addFormKey, setAddFormKey] = useState(0);
  const state = useLLMSetupState({ dbs, user: prgl.user });

  return (
    <FlexCol className={className} style={style}>
      <SectionHeader icon={mdiAssistant}>AI Assistant</SectionHeader>
      <FlexCol className={"pl-2"}>
        <PopupMenu
          positioning="center"
          title="Allow chatting with AI assistant"
          onClickClose={false}
          clickCatchStyle={{ opacity: 1 }}
          contentClassName="flex-col p-2 gap-1"
          data-command="AskLLMAccessControl"
          button={
            <SwitchToggle
              label={"Allow chatting with AI assistant"}
              checked={isAllowed}
              onChange={(_checked) => {}}
            />
          }
          footerButtons={
            !creds?.length ?
              undefined
            : [
                {
                  label: "Close",
                  onClickClose: true,
                },
                {
                  label: "Disable",
                  variant: "faded",
                  color: "danger",
                  className: "ml-auto",
                  onClick: () => {
                    editedRule?.onChange({
                      access_control_allowed_llm: [],
                    });
                  },
                },
                {
                  label: "Done",
                  variant: "filled",
                  color: "action",
                  onClickClose: true,
                },
              ]
          }
        >
          {state.state !== "ready" ?
            <SetupLLMCredentials
              {...prgl}
              asPopup={false}
              dbs={dbs}
              setupState={state}
            />
          : <>
              <div className="ta-left" style={{ maxWidth: "500px" }}>
                To allow chatting with the AI assistant, allowed prompts and
                credentials must be specified
              </div>
              <FlexCol className="gap-0 ta-left bold my-1">
                <div className="mb-1">
                  Allowed Prompts and APIs ({allowedItems?.length ?? 0})
                </div>

                {!allowedItems?.length && (
                  <Btn
                    variant={"filled"}
                    color={"action"}
                    className="mt-1"
                    data-command="AskLLMAccessControl.AllowAll"
                    onClick={() => {
                      editedRule?.onChange({
                        access_control_allowed_llm: state.credentials.flatMap(
                          (c) => {
                            return state.prompts.map((p) => {
                              return {
                                llm_prompt_id: p.id,
                                llm_credential_id: c.id,
                              };
                            });
                          },
                        ),
                      });
                    }}
                  >
                    Allow all
                  </Btn>
                )}

                {allowedItems?.map((a, i) => {
                  return (
                    <FlexRow key={i}>
                      <Chip label="Key name" variant="header">
                        {a.llm_credential?.name}
                      </Chip>
                      <Chip label="Provider" variant="header">
                        {a.llm_credential?.provider_id}
                      </Chip>
                      <Chip label="Prompt" variant="header">
                        {a.llm_prompt?.name}
                      </Chip>
                      <Btn
                        className="ml-auto"
                        iconPath={mdiClose}
                        onClick={() => {
                          editedRule?.onChange({
                            access_control_allowed_llm: (
                              editedRule.newRule?.access_control_allowed_llm ??
                              []
                            ).filter((_, j) => j !== i),
                          });
                        }}
                      />
                    </FlexRow>
                  );
                })}
                {!!allowedItems?.length && (
                  <FormField
                    label={"Max requests per day"}
                    className="mx-p25 mt-1"
                    value={rule?.llm_daily_limit}
                    type="integer"
                    hint="0 for unlimited"
                    data-command="AskLLMAccessControl.llm_daily_limit"
                    onChange={(v) => {
                      editedRule?.onChange({ llm_daily_limit: +v });
                    }}
                  />
                )}
              </FlexCol>
              <FlexCol className="gap-1">
                <div className="bold ta-start">Add custom pair</div>
                <SmartForm
                  label=""
                  key={addFormKey}
                  connection={dbsConnection}
                  contentClassname="flex-row px-0 p-p25"
                  tableName="access_control_allowed_llm"
                  db={dbs as DBHandlerClient}
                  methods={{}}
                  tables={dbsTables}
                  columnFilter={(c) =>
                    ["llm_prompt_id", "llm_credential_id"].includes(c.name)
                  }
                  jsonbSchemaWithControls={true}
                  onChange={(row) => {
                    if ("llm_credential_id" in row) {
                      setLocalCredentialId(row.llm_credential_id);
                    }
                    if ("llm_prompt_id" in row) {
                      setLocalPromptId(row.llm_prompt_id);
                    }
                  }}
                />
                <Btn
                  variant={"filled"}
                  color={"action"}
                  iconPath={mdiPlus}
                  className="as-end"
                  style={{ marginBottom: "1.5em" }}
                  disabledInfo={
                    (
                      allowedItems?.some(
                        (d) =>
                          d.llm_prompt_id === localPromptId &&
                          d.llm_credential_id === localCredentialId,
                      )
                    ) ?
                      "Already allowed"
                    : !localPromptId ?
                      "Please select a prompt"
                    : !localCredentialId ?
                      "Please select a credential"
                    : undefined
                  }
                  onClick={() => {
                    if (!localPromptId || !localCredentialId) return;
                    editedRule?.onChange({
                      access_control_allowed_llm: [
                        ...(editedRule.newRule?.access_control_allowed_llm ??
                          []),
                        {
                          llm_prompt_id: localPromptId,
                          llm_credential_id: localCredentialId,
                        },
                      ],
                    });
                    setLocalPromptId(undefined);
                    setLocalCredentialId(undefined);
                    setAddFormKey(addFormKey + 1);
                  }}
                >
                  Add
                </Btn>
              </FlexCol>
            </>
          }
        </PopupMenu>
      </FlexCol>
    </FlexCol>
  );
};
