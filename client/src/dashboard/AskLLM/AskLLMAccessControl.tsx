import { mdiAssistant, mdiClose } from "@mdi/js";
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
        button={
          <SwitchToggle 
            label={"Allow chatting with AI assistant"}
            checked={isAllowed}
            onChange={checked => {}} 
          />
        }
        footerButtons={[
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
            label: "Enable",
            variant: "filled",
            color: "action", 
          } 
        ]}
      >
        <div className="ta-left" style={{ maxWidth: "500px" }}>
          To allow chatting with the AI assistant, allowed prompts and credentials must be specified
        </div>
        <FlexCol className="gap-0 ta-left bold mt-1">
          <div>Allowed Prompts and APIs ({allowedItems?.length ?? 0})</div>
          {allowedItems?.map((a, i) => {
            return <FlexRow key={i}>
                <Chip label="llm_prompt_id">{a.llm_prompt_id}</Chip>
                <Chip label="llm_prompt_id">{a.llm_credential_id}</Chip>
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
        <FlexRow className="gap-1">
          <SmartForm 
            label=""
            contentClassname="flex-row px-0 p-p25"
            tableName="access_control_allowed_llm"
            db={dbs as any}
            methods={{}}
            tables={dbsTables}
            theme={prgl.theme}
            columnFilter={c => ["llm_prompt_id", "llm_credential_id"].includes(c.name)}
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
           disabledInfo={allowedItems?.some(d => 
               d.llm_prompt_id === localPromptId && 
               d.llm_credential_id === localCredentialId
             )? "Already allowed" : !localPromptId? "Please select a prompt" : !localCredentialId? "Please select a credential" : undefined
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
           }}
          />
        </FlexRow>
      </PopupMenu> 
    </FlexCol>
   
  </FlexCol>

}