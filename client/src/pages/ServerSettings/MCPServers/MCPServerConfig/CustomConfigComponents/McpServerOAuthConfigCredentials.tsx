import FormField from "@components/FormField/FormField";
import React from "react";
import { type McpServerOAuthConfigState } from "./useMcpServerOAuthConfigState";

export const McpServerOAuthConfigCredentials = ({
  bearerToken,
  setBearerToken,
  authMode,
  clientMetadataUrl,
  setClientMetadataUrl,
}: McpServerOAuthConfigState) => {
  if (authMode === "cimd") {
    return (
      <FormField
        type="text"
        label={"Client metadata URL"}
        value={clientMetadataUrl}
        onChange={setClientMetadataUrl}
      />
    );
  }

  if (authMode === "bearer") {
    return (
      <FormField
        type="text"
        label={"Bearer token"}
        value={bearerToken}
        onChange={setBearerToken}
        // hint={"https://github.com/settings/personal-access-tokens"}
      />
    );
  }

  return null;
};
