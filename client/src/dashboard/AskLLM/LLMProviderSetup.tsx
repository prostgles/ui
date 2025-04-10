import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useMemo, useState } from "react";
import type { Prgl } from "../../App";
import Chip from "../../components/Chip";
import { InfoRow } from "../../components/InfoRow";
import { SmartCardList } from "../SmartCardList/SmartCardList";
import { SmartForm } from "../SmartForm/SmartForm";

export const LLMProviderSetup = ({
  dbs,
  dbsMethods,
  dbsTables,
}: Pick<Prgl, "dbs" | "dbsMethods" | "dbsTables">) => {
  const [addCreds, setAddCreds] = useState(false);

  const listProps = useMemo(() => {
    return {
      showTopBar: { insert: true as const },
      fieldConfigs: [
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
      ],
    };
  }, []);

  return (
    <>
      <SmartCardList
        className="mb-1 w-fit min-w-0"
        db={dbs as DBHandlerClient}
        tableName={"llm_credentials"}
        methods={dbsMethods}
        tables={dbsTables}
        noDataComponent={
          <InfoRow color="info" variant="filled">
            No LLM providers
          </InfoRow>
        }
        {...listProps}
      />
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
