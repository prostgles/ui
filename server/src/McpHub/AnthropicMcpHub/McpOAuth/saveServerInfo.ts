import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import type { RemoteMcpServerParameters } from "../McpTypes";
import { isEqual } from "prostgles-types";

export const saveServerInfo = async (
  {
    savePngIcon,
    dbs,
    server,
  }: { savePngIcon: boolean; dbs: DBS; server: DBSSchema["mcp_servers"] },
  {
    serverVersion,
    capabilities,
  }: Parameters<
    NonNullable<
      Required<RemoteMcpServerParameters>["RemoteServerEvents"]["onConnected"]
    >
  >[0],
) => {
  const firstIcon = serverVersion?.icons?.find(
    (icon) => icon.mimeType === "image/png",
  );
  const maxSize = 1024 * 1024; // 1MB
  const icon_bytes =
    savePngIcon && firstIcon?.src ?
      await fetch(firstIcon.src)
        .then((res) => {
          /** Test type and size */
          if (res.headers.get("Content-Type") !== "image/png") {
            throw new Error(
              `Expected icon to be of type "image/png" but got "${res.headers.get(
                "Content-Type",
              )}"`,
            );
          }
          const contentLength = res.headers.get("Content-Length");
          if (contentLength && parseInt(contentLength) > maxSize) {
            throw new Error(
              `Expected icon to be less than 1MB but got ${contentLength} bytes`,
            );
          }
          return res.arrayBuffer();
        })
        .catch((cause) =>
          Promise.reject(new Error("Failed to fetch icon", { cause })),
        )
    : null;

  if (icon_bytes && icon_bytes.byteLength > maxSize) {
    throw new Error(
      `Expected icon to be less than 1MB but got ${icon_bytes.byteLength} bytes`,
    );
  }

  const newData = {
    info: serverVersion?.description ?? serverVersion?.title ?? null,
    capabilities,
    server_version: serverVersion,
    icon_bytes,
  };

  if (
    isEqual(server.capabilities, capabilities ?? null) &&
    isEqual(server.server_version, serverVersion ?? null)
  ) {
    return;
  }

  await dbs.mcp_servers.update(
    {
      name: server.name,
    },
    newData,
  );
};
