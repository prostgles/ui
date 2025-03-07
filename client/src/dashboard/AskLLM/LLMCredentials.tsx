import React from "react";
import SmartCardList from "../SmartCard/SmartCardList";
import type { Prgl } from "../../App";
import { InfoRow } from "../../components/InfoRow";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { AddLLMCredentialForm } from "./AddLLMCredentialForm";
import { LLMProviderSetup } from "./LLMProviderSetup";

export const LLMCredentials = (
  props: Pick<Prgl, "dbs" | "dbsMethods" | "dbsTables" | "theme">,
) => {
  return <LLMProviderSetup {...props} />;
  // return (
  //   <>
  //     <SmartCardList
  //       title="API credentials"
  //       className="mb-1"
  //       db={dbs as any}
  //       tableName={"llm_credentials"}
  //       methods={dbsMethods}
  //       tables={dbsTables}
  //       theme={theme}
  //       noDataComponent={
  //         <InfoRow color="info" variant="filled">
  //           No existing credentials
  //         </InfoRow>
  //       }
  //       fieldConfigs={[
  //         {
  //           name: "name",
  //         },
  //         {
  //           name: "endpoint",
  //           hide: true,
  //         },
  //         {
  //           name: "config",
  //           label: "Model",
  //           renderValue: (_, row: DBSSchema["llm_credentials"]) => {
  //             return (
  //               row.config.Provider === "Google" ?
  //                 row.endpoint
  //                   .split("/models/")[1]
  //                   ?.split(":generateContent")[0]
  //               : "model" in row.config ? row.config.model
  //               : "??"
  //             );
  //           },
  //         },
  //         {
  //           name: "is_default",
  //           className: "o-visible",
  //         },
  //       ]}
  //     />
  //     <AddLLMCredentialForm dbs={dbs} />
  //   </>
  // );
};
