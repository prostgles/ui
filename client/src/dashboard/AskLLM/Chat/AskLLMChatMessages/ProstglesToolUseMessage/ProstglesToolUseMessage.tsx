import type { DBSSchema } from "@common/publishUtils";
import { getProstglesMCPFullToolName } from "@common/prostglesMcp";
import type {
  ToolResultMessage,
  ToolUseMessage,
} from "../ToolUseChatMessage/ToolUseChatMessage";
import { DockerSandboxCreateContainer } from "./ProstglesMCPTools/DockerSandboxCreateContainer";
import { LoadSuggestedDashboards } from "./ProstglesMCPTools/LoadSuggestedDashboards";
import { LoadSuggestedToolsAndPrompt } from "./ProstglesMCPTools/LoadSuggestedToolsAndPrompt";
import { ExecuteSQL } from "./ProstglesMCPTools/ExecuteSQL";

export const ProstglesMCPToolsWithUI = {
  [getProstglesMCPFullToolName("prostgles-ui", "suggest_dashboards") as string]:
    {
      component: LoadSuggestedDashboards,
      displayMode: "full",
    },
  [getProstglesMCPFullToolName(
    "prostgles-ui",
    "suggest_tools_and_prompt",
  ) as string]: {
    component: LoadSuggestedToolsAndPrompt,
    displayMode: "full",
  },
  "docker-sandbox--create_container": {
    component: DockerSandboxCreateContainer,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName(
    "prostgles-db",
    "execute_sql_with_commit",
  ) as string]: {
    component: ExecuteSQL,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName(
    "prostgles-db",
    "execute_sql_with_rollback",
  ) as string]: {
    component: ExecuteSQL,
    displayMode: "inline",
  },
} satisfies Record<
  string,
  {
    component: React.ComponentType<ProstglesMCPToolsProps>;
    /**
     * How to display the tool UI
     * - inline (default): Will show a summary button that opens an inline expanded component
     * - full: will render component and a side button to show source JSON in popup
     */
    displayMode: "full" | "inline";
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
