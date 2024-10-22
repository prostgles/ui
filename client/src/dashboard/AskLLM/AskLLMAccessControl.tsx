import { mdiAssistant, mdiClose, mdiPlus } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import Chip from "../../components/Chip";
import { FlexCol, FlexRow } from "../../components/Flex";
import PopupMenu from "../../components/PopupMenu";
import { SwitchToggle } from "../../components/SwitchToggle";
import { isDefined } from "../../utils";
import { SectionHeader } from "../AccessControl/AccessControlRuleEditor";
import type { ValidEditedAccessRuleState } from "../AccessControl/useEditedAccessRule";
import SmartForm from "../SmartForm/SmartForm";
import { SetupLLMCredentials } from "./SetupLLMCredentials";
import { Section } from "../../components/Section";

type P = Prgl & {
  accessRuleId: number | undefined;
  editedRule: ValidEditedAccessRuleState | undefined;
  className?: string;
  style?: React.CSSProperties;
}
export const AskLLMAccessControl = ({ dbs, connectionId, accessRuleId, className, style, editedRule, ...prgl }: P) => {
  const { dbsTables } = prgl;
  const [localPromptId, setLocalPromptId] = useState<number>();
  const [localCredentialId, setLocalCredentialId] = useState<number>();
  const rule = editedRule?.newRule ?? editedRule?.rule;
  const isAllowed = !!rule?.access_control_allowed_llm?.length;
  const allowedItems = rule?.access_control_allowed_llm;
  const { data: creds } = dbs.llm_credentials.useSubscribe({});
  const { data: prompts } = dbs.llm_prompts.useSubscribe({});
  
  /** We need to reset form after both values are undefined */
  const [addFormKey, setAddFormKey] = useState(0);
  
  return <FlexCol className={className} style={style}>
    <SectionHeader icon={isDefined(accessRuleId)? mdiAssistant : undefined}>
      AI Assistant
    </SectionHeader> 
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
            onChange={_checked => {}} 
          />
        }
        footerButtons={!creds?.length? undefined : [
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
          } 
        ]}
      >

        {!creds?.length? 
          <SetupLLMCredentials {...prgl} dbs={dbs} /> :
          <>
            <div className="ta-left" style={{ maxWidth: "500px" }}>
              To allow chatting with the AI assistant, allowed prompts and credentials must be specified
            </div>
            <FlexCol className="gap-0 ta-left bold mt-1">
              <div>Allowed Prompts and APIs ({allowedItems?.length ?? 0})</div>
              {!allowedItems?.length && <Btn
                variant={"filled"}
                color={"action"}
                className="mt-1"
                data-command="AskLLMAccessControl.AllowAll"
                onClick={() => {
                  if(!creds.length || !prompts?.length) return;
                  editedRule?.onChange({
                    access_control_allowed_llm: creds.flatMap(c => {
                      return prompts.map(p => {
                        return { llm_prompt_id: p.id, llm_credential_id: c.id } 
                      })
                    })
                  });
                }}
              >Allow all</Btn>}
              {allowedItems?.map((a, i) => {
                return <FlexRow key={i}>
                  <Chip label="llm_credential_id">{a.llm_credential_id}</Chip>
                  <Chip label="llm_prompt_id">{a.llm_prompt_id}</Chip>
                  <Btn
                    iconPath={mdiClose}
                    onClick={() => {
                      editedRule?.onChange({
                        access_control_allowed_llm: (editedRule.newRule?.access_control_allowed_llm ?? []).filter((_, j) => j !== i),
                      });
                    }}
                  />
                </FlexRow>
              })}
            </FlexCol>
            <Section className="gap-1" title="Allow custom pairs" titleIconPath="">
              <SmartForm 
                label=""
                key={addFormKey}
                contentClassname="flex-row px-0 p-p25"
                tableName="access_control_allowed_llm"
                db={dbs as any}
                methods={{}}
                tables={dbsTables}
                theme={prgl.theme}
                columnFilter={c => ["llm_prompt_id", "llm_credential_id"].includes(c.name)}
                jsonbSchemaWithControls={true}
                onChange={row => {
                  if("llm_credential_id" in row){
                    setLocalCredentialId(row.llm_credential_id);
                  }
                  if("llm_prompt_id" in row){
                    setLocalPromptId(row.llm_prompt_id);
                  }
                }}
              />  
              <Btn
                variant={"filled"}
                color={"action"}
                iconPath={mdiPlus}
                className="as-end"
                style={{ marginBottom: "1.5em"}}
                disabledInfo={
                  allowedItems?.some(d => 
                    d.llm_prompt_id === localPromptId && 
                    d.llm_credential_id === localCredentialId
                  )? "Already allowed" : 
                    !localPromptId? "Please select a prompt" : 
                    !localCredentialId? "Please select a credential" : 
                    undefined
                }
                onClick={() => {
                  if(!localPromptId || !localCredentialId) return;
                  editedRule?.onChange({
                    access_control_allowed_llm: [
                      ...(editedRule.newRule?.access_control_allowed_llm ?? []), 
                      { llm_prompt_id: localPromptId, llm_credential_id: localCredentialId },
                    ]
                  });
                  setLocalPromptId(undefined);
                  setLocalCredentialId(undefined);
                  setAddFormKey(addFormKey + 1);
                }}
              >
                Add
              </Btn>
            </Section>
          </>
        }
      </PopupMenu> 
    </FlexCol>
   
  </FlexCol>

}