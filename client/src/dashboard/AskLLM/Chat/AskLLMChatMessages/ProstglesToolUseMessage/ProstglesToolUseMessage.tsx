import {
  getMCPFullToolName,
  getProstglesMCPFullToolName,
} from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import type {
  ToolResultMessage,
  ToolUseMessage,
} from "../ToolUseChatMessage/ToolUseChatMessage";
import { DockerSandboxCreateContainer } from "./ProstglesMCPTools/DockerSandboxCreateContainer";
import { ExecuteSQL } from "./ProstglesMCPTools/ExecuteSQL";
import { LoadSuggestedDashboards } from "./ProstglesMCPTools/LoadSuggestedDashboards";
import { LoadSuggestedWorkflow } from "./ProstglesMCPTools/LoadSuggestedWorkflow/LoadSuggestedWorkflow";
import { LoadSuggestedToolsAndPrompt } from "./ProstglesMCPTools/LoadSuggestedToolsAndPrompt/LoadSuggestedToolsAndPrompt";
import { WebSearch } from "./ProstglesMCPTools/WebSearch/WebSearch";
import { AskUserQuestions } from "./ProstglesMCPTools/AskUserQuestions";

export const ProstglesMCPToolsWithUI = {
  [getMCPFullToolName("prostgles-ui", "suggest_dashboards") as string]: {
    component: LoadSuggestedDashboards,
    displayMode: "full",
  },
  [getMCPFullToolName("prostgles-ui", "suggest_tools_and_prompt") as string]: {
    component: LoadSuggestedToolsAndPrompt,
    displayMode: "full",
  },
  [getMCPFullToolName("prostgles-ui", "suggest_agentic_workflow") as string]: {
    component: LoadSuggestedWorkflow,
    displayMode: "full",
    showsError: true,
  },
  [getMCPFullToolName("prostgles-ui", "ask_user_questions") as string]: {
    component: AskUserQuestions,
    displayMode: "full",
  },
  "prostgles-ui--create_container": {
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
  [getMCPFullToolName("websearch", "websearch") as string]: {
    component: WebSearch,
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
    /* whether the tool component itself shows errors or if errors should be shown by the parent component */
    showsError?: boolean;
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
