import type { UIDoc } from "src/app/UIDocs";

export const agenticWorkflowsUIDoc = {
  type: "section",
  title: "Agentic workflows",
  docOptions: "asSeparateFile",
  selectorCommand: "SavedAgenticWorkflowsAndContainers",
  componentName: "SavedAgenticWorkflowsAndContainers",
  description: `List of saved agentic workflows of the current user for the current connection.`,
  docs: `
    Agentic workflows are reusable TypeScript automations generated from AI chat and executed in an isolated sandbox.
    They allow granular access to data, tools and filesystem.
    
    Each workflow combines database operations, MCP tools, and optional agent steps to complete multi-step tasks reliably.
    They are ideal for automating tedious data intensive tasks that may involve using agentic chats.
    Agentic workflows can be saved and reused, making it easier to manage and execute recurring tasks efficiently.
    
    ## Core capabilities  
    - Isolated execution environment with configurable timeout, CPU, memory, filesystem mode, and internet access.
    - Granular database permissions with table-level rules and optional workflow DDL.
    - Controlled MCP tool access for orchestration and agent-specific steps.
    - Typed user input controls including enums, table-aware pickers, and file/folder path selectors.
    - Built-in progress reporting, activity timeline, and run logs.
    - Start, stop, and re-run support with schema drift detection and guided resolution.

    ## Typical workflow lifecycle  
    1. Describe your task in AI Assistant.
    2. Review the generated workflow summary, definition, permissions, and inputs.
    3. Provide required input values and start the run.
    4. Monitor progress in Activity and Logs.
    5. Save the workflow for repeated use in the connection dashboard.

    <img src="./screenshots/ai_assistant_agentic_workflow.svgif.svg" alt="Agentic workflow example" />

  `,
  children: [],
} as const satisfies UIDoc;
