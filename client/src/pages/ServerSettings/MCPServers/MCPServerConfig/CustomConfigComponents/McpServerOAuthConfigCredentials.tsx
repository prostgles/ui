import { ROUTES } from "@common/utils";
import FormField from "@components/FormField/FormField";
import React from "react";
import { type McpServerOAuthConfigState } from "./useMcpServerOAuthConfigState";

const redirectUrl = new URL(
  ROUTES.MCP_OAUTH_CALLBACK,
  window.location.origin,
).toString();

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
      <>
        <FormField
          type="text"
          label={"Client metadata URL"}
          value={clientMetadataUrl}
          onChange={setClientMetadataUrl}
          hint={"URL where the server's client metadata JSON is hosted."}
        />
        <FormField
          id="redirect-uri"
          label={"Redirect URL"}
          readOnly={true}
          value={redirectUrl}
        />
      </>
    );
  }

  if (authMode === "client_credentials" || authMode === "authorization_code") {
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
