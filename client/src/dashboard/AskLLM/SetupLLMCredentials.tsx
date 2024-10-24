import React from "react"
import type { Prgl } from "../../App"
import SmartForm from "../SmartForm/SmartForm"
import { FlexCol } from "../../components/Flex"

export const SetupLLMCredentials = (prgl: Pick<Prgl, "theme" | "dbs" | "dbsTables">) => {
  
  return <FlexCol data-command="SetupLLMCredentials">
    <div className="my-2 font-18 bold">
      Add a credential to use AI assistant.
    </div>
    <SmartForm 
      label=""
      theme={prgl.theme}
      methods={{}}
      className="p-0"
      db={prgl.dbs as any}
      tables={prgl.dbsTables} 
      tableName="llm_credentials"
      columnFilter={c => !["created"].includes(c.name)}
      showJoinedTables={false}
      hideChangesOptions={true}
      jsonbSchemaWithControls={true}
    />
  </FlexCol>
}