import React from "react";
import type { Prgl } from "../../App";
import { InfoRow } from "../../components/InfoRow";
import SmartCardList from "../SmartCard/SmartCardList";
import { AddLLMCredentialForm } from "./AddLLMCredentialForm";
import Popup from "../../components/Popup/Popup";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import SmartForm from "../SmartForm/SmartForm";

export const LLMProviderSetup = ({
  dbs,
  dbsMethods,
  dbsTables,
  theme,
}: Pick<Prgl, "dbs" | "dbsMethods" | "dbsTables" | "theme">) => {
  const [addCreds, setAddCreds] = React.useState(false);

  const addCredsForm = addCreds && (
    <Popup
      title="Add LLM Provider"
      onClose={() => setAddCreds(false)}
      onClickClose={false}
    >
      <FlexCol>
        <SmartForm
          label=""
          showJoinedTables={false}
          hideChangesOptions={true}
          tableName="llm_credentials"
          db={dbs}
          methods={dbsMethods}
          tables={dbsTables}
          theme={theme}
          onChange={console.log}
        />
      </FlexCol>
    </Popup>
  );

  return (
    <>
      <SmartCardList
        className="mb-1"
        db={dbs}
        tableName={"llm_credentials"}
        methods={dbsMethods}
        tables={dbsTables}
        theme={theme}
        showTopBar={true}
        orderByfields={[]}
        noDataComponent={
          <InfoRow color="info" variant="filled">
            No existing credentials{" "}
            <Btn onClick={() => setAddCreds(true)}>Add credentials</Btn>
          </InfoRow>
        }
        fieldConfigs={[
          {
            name: "name",
          },
          {
            name: "is_default",
            className: "o-visible",
          },
        ]}
      />
      <AddLLMCredentialForm dbs={dbs} />
      {addCredsForm}
    </>
  );
};
