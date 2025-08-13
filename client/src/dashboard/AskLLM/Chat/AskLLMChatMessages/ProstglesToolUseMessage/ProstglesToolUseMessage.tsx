import type { DBSSchema } from "@common/publishUtils";
import { getProstglesMCPFullToolName } from "../../../../../../../commonTypes/prostglesMcp";
import type { ToolResultMessage, ToolUseMessage } from "../ToolUseChatMessage";
import { DockerSandboxCreateContainer } from "./ProstglesMCPTools/DockerSandboxCreateContainer";
import { LoadSuggestedDashboards } from "./ProstglesMCPTools/LoadSuggestedDashboards";
import { LoadSuggestedToolsAndPrompt } from "./ProstglesMCPTools/LoadSuggestedToolsAndPrompt";

export const ProstglesMCPToolsWithUI = {
  [getProstglesMCPFullToolName("prostgles-ui", "suggest_dashboards") as string]:
    {
      component: LoadSuggestedDashboards,
      inline: true,
    },
  [getProstglesMCPFullToolName(
    "prostgles-ui",
    "suggest_tools_and_prompt",
  ) as string]: {
    component: LoadSuggestedToolsAndPrompt,
    inline: true,
  },
  "docker-sandbox--create_container": {
    component: DockerSandboxCreateContainer,
  },
} satisfies Record<
  string,
  {
    component: React.ComponentType<ProstglesMCPToolsProps>;
    inline?: boolean;
  }
>;

export type ProstglesMCPToolsProps = {
  workspaceId: string | undefined;
  message: ToolUseMessage;
  chatId: number;
  toolUseResult:
    | {
        toolUseResult: DBSSchema["llm_messages"];
        toolUseResultMessage: ToolResultMessage;
      }
    | undefined;
};
