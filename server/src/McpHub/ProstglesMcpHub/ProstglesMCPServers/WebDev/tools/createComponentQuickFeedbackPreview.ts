import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type {
  JSONBTypeIfDefined,
  McpCallContext,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { getWebDevChatAndConnection } from "./getWebDevChatAndConnection";
import { installDependenciesIfNeeded } from "./utils";
import { writeWebAppFiles } from "@src/serverFunctions/adminServerFunctions/webApp/writeWebAppFiles";

export const createComponentQuickFeedbackPreview = async (
  {
    indexTsx,
    dependencies,
    css,
  }: JSONBTypeIfDefined<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["webdev"]["create_component_quick_feedback_preview"]["schema"]
  >,
  { chat, connection_id, dbs }: McpCallContext,
) => {
  const { web_app_directory } = await getWebDevChatAndConnection(dbs, {
    chat,
    connection_id,
  });

  await writeWebAppFiles(
    {
      connectionId: connection_id,
      files: {
        "client/src/Components/ComponentQuickFeedbackPreview/ComponentQuickFeedbackPreview.tsx":
          indexTsx,
        "client/src/Components/ComponentQuickFeedbackPreview/ComponentQuickFeedbackPreview.css":
          css ?? "",
      },
    },
    { dbo: dbs },
  );

  await installDependenciesIfNeeded({
    dependencies,
    devDependencies: undefined,
    web_app_directory,
  });
};
