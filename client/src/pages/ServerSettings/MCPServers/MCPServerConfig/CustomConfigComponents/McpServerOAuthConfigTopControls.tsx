import type { DBSSchema } from "@common/publishUtils";
import { getSerialisableError, isObject } from "prostgles-types";

import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { mdiInformationOutline } from "@mdi/js";
import React, { useEffect } from "react";
import { CodeEditor } from "src/dashboard/CodeEditor/CodeEditor";
import type { McpServerOAuthConfigState } from "./useMcpServerOAuthConfigState";

type P = {
  server: DBSSchema["mcp_servers"];
  setConfig: (newConfig: DBSSchema["mcp_server_configs"]["config"]) => void;
} & McpServerOAuthConfigState;

export const McpServerOAuthConfigTopControls = ({
  server,
  authMode,
  savedConfig,
  existingConfig,
  savePngIcon,
  setSavePngIcon,
  selectedScopes,
  setSelectedScopes,
  authModeFullOptions,
  setAuthMode,
  authInfo,
  authInfoError,
}: P) => {
  const dcrNotSupported =
    (isObject(authInfo) && authInfo.modes.dcr === false) ||
    (existingConfig?.oauth?.phase === "error" &&
      existingConfig.oauth.error === "dcr-not-supported");

  useEffect(() => {
    setAuthMode((v) => (dcrNotSupported && v === "dcr" ? "bearer" : v));
  }, [dcrNotSupported, setAuthMode]);

  if (authInfo === "not-allowed") {
    return <ErrorComponent error={"getMcpOAuthMetadata is not available"} />;
  }

  const allScopes =
    authInfo === "none" ? [] : authInfo?.metadata.scopes_supported;

  return (
    <FlexRowWrap>
      <Select
        label={"Auth mode"}
        fullOptions={authModeFullOptions}
        onChange={setAuthMode}
        value={authMode}
        data-command="McpServerOAuthConfigTopControls.authMode"
      />
      <Select
        label={"Scopes"}
        multiSelect={true}
        options={allScopes ?? []}
        value={savedConfig?.scopes ?? selectedScopes}
        onChange={(newScopes) => {
          // setConfig({ scopes: newScopes });
          setSelectedScopes(newScopes);
        }}
        disabledInfo={
          authMode === "none" ? "No OAuth authentication required"
          : authMode === "bearer" ?
            "Scopes are not used with bearer token authentication"
          : authInfoError !== undefined ?
            "Failed to fetch scopes"
          : undefined
        }
      />
      {!existingConfig && (
        <FormField
          label={{
            label: "Save png icon",
            style: { margin: 0 },
            info: "Save the server provided icon and use it in the UI.",
          }}
          data-command="McpServerOAuthConfigTopControls.bearerToken"
          type="checkbox"
          value={savePngIcon}
          onChange={setSavePngIcon}
        />
      )}
      <PopupMenu
        title={"Server info"}
        subTitle={server.url!}
        positioning="fullscreen"
        onClickClose={false}
        className="as-end"
        button={
          <Btn
            iconPath={mdiInformationOutline}
            loading={!authInfo && !authInfoError}
            data-command="McpServerOAuthConfigTopControls.ShowServerInfo"
            variant="faded"
            color={authInfoError ? "danger" : undefined}
            title={"Show server info"}
            disabledInfo={
              authInfoError ?
                "Failed to fetch server info: " +
                JSON.stringify(getSerialisableError(authInfoError), null, 2)
              : undefined
            }
          />
        }
      >
        <CodeEditor
          language={"json"}
          value={JSON.stringify(authInfo, null, 2)}
        />
      </PopupMenu>
    </FlexRowWrap>
  );
};
