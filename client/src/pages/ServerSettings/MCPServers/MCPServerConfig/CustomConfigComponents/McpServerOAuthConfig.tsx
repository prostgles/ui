import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { Select } from "@components/Select/Select";
import React, { useEffect, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { MCPServerConfigProps } from "../MCPServerConfigEditor";
import { useCountdown } from "@components/Stopwatch";

type P = {
  server: DBSSchema["mcp_servers"];
  setConfig: (newConfig: Record<string, string | string[]>) => void;
} & Pick<MCPServerConfigProps, "onDone" | "existingConfig">;

type AuthMode = "none" | "dcr" | "cimd" | "bearer";

type RemoteMcpConfig = {
  authMode?: AuthMode;
  scopes?: string[];
  bearerToken?: string;
  clientMetadataUrl?: string;
};

const usedAuthUrl = new Set<string>();

export const McpServerOAuthConfig = ({
  existingConfig,
  server,
  setConfig,
  onDone,
}: P) => {
  const { dbsMethods, dbs } = usePrglCore();
  const oauth = existingConfig?.oauth;
  const savedConfig = (existingConfig?.config ?? {}) as RemoteMcpConfig;
  const savedScopes = savedConfig.scopes;
  const [selectedScopes, setSelectedScopes] = useState(savedScopes ?? []);
  const [allScopes, setAllScopes] = useState<string[]>();
  const [error, setError] = useState<unknown>();
  const authorizationUrl =
    oauth?.phase === "waiting-for-auth" ? oauth.authorizationUrl : undefined;
  const [capabilities, setCapabilities] = useState<{
    modes: AuthMode[];
    defaultMode: AuthMode;
    scopes: string[];
  }>();
  const countdown = useCountdown();

  useEffect(() => {
    if (!authorizationUrl || usedAuthUrl.has(authorizationUrl)) {
      return;
    }
    usedAuthUrl.add(authorizationUrl);
    countdown.start({
      endTime: new Date(Date.now() + 5_000),
      onFinish: () => {
        window.open(authorizationUrl, "_blank");
      },
    });
  }, [authorizationUrl, countdown]);

  useEffect(() => {
    if (server.url) {
      dbsMethods
        .getMcpOAuthMetadata?.({ serverName: server.name })
        .then(({ serverInfo, metadata: { scopes_supported } }) => {
          setAllScopes(scopes_supported);
        })
        .catch(setError);
    }
  }, [dbsMethods, server.name, server.url]);

  return (
    <FlexCol>
      <Select
        label={"Scopes"}
        multiSelect={true}
        options={allScopes ?? []}
        value={existingConfig?.config.scopes ?? selectedScopes}
        onChange={(newScopes) => {
          // setConfig({ scopes: newScopes });
          setSelectedScopes(newScopes);
        }}
        disabledInfo={
          error !== undefined ? "Failed to fetch scopes" : undefined
        }
      />
      <ErrorComponent title="Error retrieving scopes" error={error} />

      {!existingConfig ?
        <Btn
          onClickPromise={async () => {
            await dbsMethods.authenticateMcpServer!({
              origin: window.location.origin,
              serverName: server.name,
              scopes: selectedScopes,
              authMode: "dcr",
            });
            setConfig({ scopes: selectedScopes });
          }}
          variant="filled"
          color="action"
        >
          Login with OAuth
        </Btn>
      : authorizationUrl ?
        <Btn
          href={authorizationUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="filled"
          color="action"
          children={
            countdown.elapsed ?
              `Open Authorization URL (will open in ${countdown.elapsed})`
            : "Open Authorization URL"
          }
        />
      : oauth?.phase === "code-provided" ?
        <Btn loading={true} color="warn" variant="faded">
          Waiting for server to finish authentication
        </Btn>
      : oauth?.phase === "connected" ?
        server.enabled ?
          <Btn
            label={{ label: "Status", variant: "normal" }}
            color="green"
            variant="filled"
            title="Server is connected. Click to disconnect."
            onClickPromise={async () => {
              await dbs.mcp_servers.update(
                { name: server.name },
                { enabled: false },
              );
            }}
          >
            Connected
          </Btn>
        : <Btn
            label={{ label: "Status", variant: "normal", className: "mb-p25" }}
            color="default"
            variant="faded"
            title="Server is disconnected. Click to connect."
            onClickPromise={async () => {
              await dbs.mcp_servers.update(
                { name: server.name },
                { enabled: true },
              );
            }}
          >
            Disconnected
          </Btn>

      : <ErrorComponent error={"Unknown/Unexpected state"} />}
    </FlexCol>
  );
};
