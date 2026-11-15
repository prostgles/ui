import { tableMightBeUndefinedDueToAccessControl } from "@common/utils";
import Btn from "@components/Btn";
import Popup from "@components/Popup/Popup";
import React, { useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type {
  MCPServerConfigProps,
  MCPServerEnabledConfig,
} from "./MCPServerConfigEditor";

export const MCPServerAuthPrompt = ({
  onConfigure,
  isConfiguring,
}: {
  isConfiguring: boolean;
  onConfigure: (
    props: Omit<MCPServerConfigProps, "onDone">,
  ) => Promise<void | MCPServerEnabledConfig>;
}) => {
  const { dbs, dbsMethods } = usePrglCore();
  const [dismissedRequests, setDismissedRequests] = useState<string[]>([]);
  const { data: configs } =
    tableMightBeUndefinedDueToAccessControl(
      dbs.mcp_server_configs,
    )?.useSubscribe?.({
      $existsJoined: {
        mcp_servers: { enabled: true, command: "streamable-http" },
      },
    }) ?? {};
  const { data: settings } =
    tableMightBeUndefinedDueToAccessControl(
      dbs.global_settings,
    )?.useSubscribeOne?.() ?? {};

  if (
    isConfiguring ||
    !dbsMethods.authenticateMcpServer ||
    settings?.mcp_servers_disabled
  )
    return null;
  const config = configs?.find(
    ({ oauth, id }) =>
      (oauth?.phase === "awaiting_authorization" || oauth?.phase === "error") &&
      !dismissedRequests.includes(`${id}:${JSON.stringify(oauth)}`),
  );
  if (!config) return null;

  const dismiss = () =>
    setDismissedRequests((previous) => [
      ...previous,
      `${config.id}:${JSON.stringify(config.oauth)}`,
    ]);
  return (
    <Popup
      title={`${config.server_name} needs authentication`}
      onClose={dismiss}
      contentClassName="p-1 flex-col gap-1"
    >
      <div>Reconnect this MCP server to continue using its tools.</div>
      <Btn
        color="action"
        variant="filled"
        onClickPromise={async () => {
          dismiss();
          await onConfigure({
            serverName: config.server_name,
            existingConfig: config,
            defaultConfig: config.config,
            chatId: undefined,
            closeOnReconnect: true,
          });
        }}
      >
        Reconnect
      </Btn>
    </Popup>
  );
};
