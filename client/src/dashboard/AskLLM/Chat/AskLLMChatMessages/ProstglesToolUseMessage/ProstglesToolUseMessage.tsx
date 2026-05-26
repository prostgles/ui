import { AGENT_GOAL_TOOL_NAMES } from "@common/mcp/startAgenticWorkflowSchema";
import { getProstglesMCPFullToolName } from "@common/mcpUtils";
import type { LoadedSuggestions } from "src/dashboard/Dashboard/dashboardUtils";
import type {
  ToolResultMessage,
  ToolUseMessage,
} from "../ToolUseChatMessage/ToolUseChatMessage";
import { Agent } from "./ProstglesMCPTools/Agent/Agent";
import { AgentGoallToolCall } from "./ProstglesMCPTools/Agent/AgentGoallToolCall";
import { AgenticWorkflowMessage } from "./ProstglesMCPTools/AgenticWorkflow/AgenticWorkflowMessage";
import { AskUserQuestions } from "./ProstglesMCPTools/AskUserQuestions";
import { DoclingConvertedDocument } from "./ProstglesMCPTools/DoclingConvertedDocument/DoclingConvertedDocument";
import { ExecuteSQL } from "./ProstglesMCPTools/ExecuteSQL";
import { LoadSuggestedDashboards } from "./ProstglesMCPTools/LoadSuggestedDashboards";
import { RequestToolAccess } from "./ProstglesMCPTools/RequestToolAccess";
import { RunCodeInSandbox } from "./ProstglesMCPTools/RunCodeInSandbox";
import { RunTypescriptInNodejs } from "./ProstglesMCPTools/RunTypescriptInNodejs";
import { CreateComponentQuickFeedbackPreview } from "./ProstglesMCPTools/Webdev/CreateComponentQuickFeedbackPreview";
import { Markdown } from "./ProstglesMCPTools/WebSearch/Markdown";
import { WebSearch } from "./ProstglesMCPTools/WebSearch/WebSearch";

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
    component: AgenticWorkflowMessage,
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
    component: RunCodeInSandbox,
    displayMode: "full",
    showsError: true,
  },
  [getProstglesMCPFullToolName("prostgles-ui", "run_typescript_in_nodejs")]: {
    component: RunTypescriptInNodejs,
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
  [getProstglesMCPFullToolName("web", "websearch") as string]: {
    component: WebSearch,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName("web", "get_snapshot") as string]: {
    component: Markdown,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName("web", "get_document_text") as string]: {
    component: Markdown,
    displayMode: "inline",
  },
  [getProstglesMCPFullToolName("documents", "get_document_text") as string]: {
    component: DoclingConvertedDocument,
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
  [AGENT_GOAL_TOOL_NAMES.REACHED]: {
    component: AgentGoallToolCall,
    displayMode: "full",
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
  chatId: number;
  isShownInToolUseRequest?: boolean;
  toolUseContent: ToolUseMessage;
  resultContent: ToolResultMessage | undefined;
};
