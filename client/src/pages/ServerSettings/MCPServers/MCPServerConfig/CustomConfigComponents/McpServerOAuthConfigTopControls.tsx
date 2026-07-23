import type { DBSSchema } from "@common/publishUtils";
import { getSerialisableError, isObject } from "prostgles-types";

import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { mdiInformationOutline } from "@mdi/js";
import { usePromise } from "prostgles-client";
import React, { useEffect, useState } from "react";
import { CodeEditor } from "src/dashboard/CodeEditor/CodeEditor";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
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
}: P) => {
  const {
    dbsMethods: { getMcpOAuthMetadata },
  } = usePrglCore();

  const [error, setError] = useState<unknown>();

  const authInfo = usePromise(async () => {
    if (server.url) {
      if (!getMcpOAuthMetadata) {
        return "not-allowed";
      }
      return getMcpOAuthMetadata({ serverName: server.name }).catch(setError);
    }
    return "none";
  }, [getMcpOAuthMetadata, server.name, server.url]);

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
          : error !== undefined ?
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
            loading={!authInfo && !error}
            data-command="McpServerOAuthConfigTopControls.ShowServerInfo"
            variant="faded"
            color={error ? "danger" : undefined}
            title={"Show server info"}
            disabledInfo={
              error ?
                "Failed to fetch server info: " +
                JSON.stringify(getSerialisableError(error), null, 2)
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
