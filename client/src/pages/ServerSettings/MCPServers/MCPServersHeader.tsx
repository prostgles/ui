import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import { InfoRow } from "../../../components/InfoRow";
import type { ServerSettingsProps } from "../ServerSettings";

export type MCPServersProps = Pick<ServerSettingsProps, "dbsMethods">;

export const MCPServersHeader = (props: {
  envInfo:
    | {
        os: string;
        npmVersion: string;
        uvxVersion: string;
      }
    | undefined;
}) => {
  const { envInfo } = props;

  const missingDependencies =
    !envInfo ? undefined
    : !envInfo.npmVersion ?
      <>
        npm not installed. Visit{" "}
        <a href="https://nodejs.org/en/download">
          https://nodejs.org/en/download
        </a>
      </>
    : !envInfo.uvxVersion ?
      <>
        uvx not installed. Visit{" "}
        <a href="https://docs.astral.sh/uv/getting-started/installation/">
          https://docs.astral.sh/uv/getting-started/installation/
        </a>
      </>
    : "";

  return (
    <>
      <InfoRow className="mb-1" variant="naked" color="info" iconPath="">
        Pre-built integrations that can be used through the Ask AI chat and
        server-side functions. For more information visit{" "}
        <a href="https://modelcontextprotocol.io/">Model Context Protocol</a>.
        <br></br>
        <br></br>
        Enabled MCP servers are available to chats after adding them in the
        &quot;Allowed MCP Tools&quot; section of the chat settings.
      </InfoRow>
      {missingDependencies && <InfoRow>{missingDependencies}</InfoRow>}
    </>
  );
};
