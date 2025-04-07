import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useMemo, useState } from "react";
import type { Prgl } from "../../App";
import Chip from "../../components/Chip";
import { FlexCol } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import Popup from "../../components/Popup/Popup";
import { SmartCardList } from "../SmartCardList/SmartCardList";
import { SmartForm } from "../SmartForm/SmartForm";
import { AddLLMCredentialForm } from "./AddLLMCredentialForm";

export const LLMProviderSetup = ({
  dbs,
  dbsMethods,
  dbsTables,
}: Pick<Prgl, "dbs" | "dbsMethods" | "dbsTables">) => {
  const [addCreds, setAddCreds] = useState(false);

  const fieldConfigs = useMemo(() => {
    return [
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
    ];
  }, []);

  return (
    <>
      <SmartCardList
        className="mb-1 w-fit"
        db={dbs as DBHandlerClient}
        tableName={"llm_credentials"}
        methods={dbsMethods}
        tables={dbsTables}
        showTopBar={{ sort: false }}
        noDataComponent={
          <InfoRow color="info" variant="filled">
            No LLM providers
          </InfoRow>
        }
        fieldConfigs={fieldConfigs}
      />
      <AddLLMCredentialForm dbs={dbs} />
      {addCreds && (
        <SmartForm
          asPopup={true}
          label="Add LLM Provider"
          showJoinedTables={false}
          tableName="llm_credentials"
          db={dbs as DBHandlerClient}
          methods={dbsMethods}
          tables={dbsTables}
          onChange={console.log}
          onClose={() => setAddCreds(false)}
        />
      )}
    </>
  );
};
