import FormField from "@components/FormField/FormField";
import React from "react";
import { type McpServerOAuthConfigState } from "./useMcpServerOAuthConfigState";
import { FlexCol, FlexRow } from "@components/Flex";
import { ROUTES } from "@common/utils";

export const McpServerOAuthConfigCredentials = ({
  bearerToken,
  setBearerToken,
  authMode,
  clientMetadataUrl,
  setClientMetadataUrl,
  clientId,
  clientSecret,
  setClientId,
  setClientSecret,
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

  if (authMode === "client_credentials" || authMode === "authorization_code") {
    const redirectUrl = new URL(
      ROUTES.MCP_OAUTH_CALLBACK,
      window.location.origin,
    ).toString();
    return (
      <>
        {authMode === "authorization_code" && (
          <FormField
            label={"Redirect URL"}
            readOnly={true}
            value={redirectUrl}
          />
        )}
        <FormField
          type="text"
          label={"Client ID"}
          value={clientId}
          onChange={setClientId}
        />
        <FormField
          type="text"
          label={"Client Secret"}
          value={clientSecret}
          onChange={setClientSecret}
        />
      </>
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
