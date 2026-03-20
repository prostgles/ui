import { getProstglesMCPFullToolName } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import type { LoadedSuggestions } from "src/dashboard/Dashboard/dashboardUtils";
import type {
  ToolResultMessage,
  ToolUseMessage,
} from "../ToolUseChatMessage/ToolUseChatMessage";
import { Agent } from "./ProstglesMCPTools/Agent/Agent";
import { AgenticWorkflow } from "./ProstglesMCPTools/AgenticWorkflow/AgenticWorkflow";
import { AskUserQuestions } from "./ProstglesMCPTools/AskUserQuestions";
import { DockerSandboxCreateContainer } from "./ProstglesMCPTools/DockerSandboxCreateContainer";
import { ExecuteSQL } from "./ProstglesMCPTools/ExecuteSQL";
import { LoadSuggestedDashboards } from "./ProstglesMCPTools/LoadSuggestedDashboards";
import { RequestToolAccess } from "./ProstglesMCPTools/RequestToolAccess";
import { CreateComponentQuickFeedbackPreview } from "./ProstglesMCPTools/Webdev/CreateComponentQuickFeedbackPreview";
import { WebSearch } from "./ProstglesMCPTools/WebSearch/WebSearch";
import { WebSnapshot } from "./ProstglesMCPTools/WebSearch/WebSnapshot";

export const ProstglesMCPToolsWithUI = {
  [getProstglesMCPFullToolName("prostgles-ui", "create_dashboards") as string]:
    {
      component: LoadSuggestedDashboards,
      displayMode: "full",
    },
  [getProstglesMCPFullToolName(
    "prostgles-ui",
    "create_agentic_workflow",
  ) as string]: {
    component: AgenticWorkflow,
    displayMode: "full",
    showsError: true,
  },
  [getProstglesMCPFullToolName("prostgles-ui", "create_agent") as string]: {
    component: Agent,
    displayMode: "full",
    showsError: true,
  },
  [getProstglesMCPFullToolName("prostgles-ui", "ask_user_questions") as string]:
    {
      component: AskUserQuestions,
      displayMode: "full",
    },
  [getProstglesMCPFullToolName("prostgles-ui", "run_code_in_sandbox")]: {
    component: DockerSandboxCreateContainer,
    displayMode: "full",
    showsError: true,
  },
  [getProstglesMCPFullToolName("prostgles-ui", "request_tool_access")]: {
    component: RequestToolAccess,
    displayMode: "full",
    showsError: true,
  },
  [getProstglesMCPFullToolName("db", "execute_sql") as string]: {
    component: ExecuteSQL,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName("db", "execute_readonly_sql") as string]: {
    component: ExecuteSQL,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName("websearch", "websearch") as string]: {
    component: WebSearch,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName("websearch", "get_snapshot") as string]: {
    component: WebSnapshot,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName("websearch", "get_document_text") as string]: {
    component: WebSnapshot,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName(
    "webdev",
    "create_component_quick_feedback_preview",
  ) as string]: {
    component: CreateComponentQuickFeedbackPreview,
    displayMode: "full",
    showsError: true,
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
    /**
     * If true then no error message will be shown outside the tool component.
     * It is expected that the tool component itself shows/handles errors
     */
    showsError?: boolean;
  }
>;

export type ProstglesMCPToolsProps = {
  loadedSuggestions: LoadedSuggestions | undefined;
  workspaceId: string | undefined;
  message: ToolUseMessage;
  chatId: number;
  isShownInToolUseRequest?: boolean;
  toolUseResult:
    | {
        toolUseResult: DBSSchema["llm_messages"];
        toolUseResultMessage: ToolResultMessage;
      }
    | undefined;
};
