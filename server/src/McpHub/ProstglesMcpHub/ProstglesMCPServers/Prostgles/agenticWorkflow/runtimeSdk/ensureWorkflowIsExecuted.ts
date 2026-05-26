import { WORKFLOW_ENV_VARS } from "./defineAgenticWorkflowHandlers.types";

export const assertWorkflowStarted = (runState: { wasStarted: boolean }) => {
  if (!WORKFLOW_ENV_VARS.DOCKER_MCP_ENDPOINT) {
    // Not running inside container
    return;
  }

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:\n", reason);
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:\n", error);
    process.exit(1);
  });

  setTimeout(() => {
    if (runState.wasStarted) {
      return;
    }
    console.error(`
defineAgenticWorkflow was not called within 1 second of the container starting. 
This likely means there is an error in your workflow code that is preventing it from running, or you are not using defineAgenticWorkflow correctly.
When generating workflow code, you MUST:

1. Use defineAgenticWorkflow() - NOT exported functions
2. Structure must be:

\`\`\`typescript
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
void defineAgenticWorkflow(
  {
    name: "Workflow Name",
    // workflow parameters
  },
  async ({ agentName }) => {
    // workflow logic
  },
);
\`\`\`

3. DO NOT use:
   - export default function
   - export const myWorkflow
   - Any other export syntax

4. The workflow callback is the SECOND argument to defineAgenticWorkflow
`);
    process.exit(1);
  }, 1000);
};
