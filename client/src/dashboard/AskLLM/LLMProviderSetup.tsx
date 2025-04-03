import React from "react";
import type { Prgl } from "../../App";
import { InfoRow } from "../../components/InfoRow";
import SmartCardList from "../SmartCard/SmartCardList";
import { AddLLMCredentialForm } from "./AddLLMCredentialForm";
import Popup from "../../components/Popup/Popup";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import { SmartForm } from "../SmartForm/SmartForm";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import Chip from "../../components/Chip";
import { dbsConnection } from "../../../../commonTypes/dbsConnection";

export const LLMProviderSetup = ({
  dbs,
  dbsMethods,
  dbsTables,
}: Pick<Prgl, "dbs" | "dbsMethods" | "dbsTables">) => {
  const [addCreds, setAddCreds] = React.useState(false);

  return (
    <>
      <SmartCardList
        className="mb-1 w-fit"
        db={dbs as DBHandlerClient}
        connection={dbsConnection}
        tableName={"llm_credentials"}
        methods={dbsMethods}
        tables={dbsTables}
        showTopBar={true}
        orderByfields={[]}
        noDataComponent={
          <InfoRow color="info" variant="filled">
            No LLM providers
          </InfoRow>
        }
        fieldConfigs={[
          {
            name: "name",
            label: "",
          },
          {
            name: "is_default",
            className: "o-visible",
            render: (is_default) =>
              is_default ? <Chip color="blue">default</Chip> : " ",
          },
        ]}
      />
      <AddLLMCredentialForm dbs={dbs} />
      {addCreds && (
        <Popup
          title="Add LLM Provider"
          onClose={() => setAddCreds(false)}
          onClickClose={false}
        >
          <FlexCol>
            <SmartForm
              connection={dbsConnection}
              label=""
              showJoinedTables={false}
              tableName="llm_credentials"
              db={dbs as DBHandlerClient}
              methods={dbsMethods}
              tables={dbsTables}
              onChange={console.log}
            />
          </FlexCol>
        </Popup>
      )}
    </>
  );
};
