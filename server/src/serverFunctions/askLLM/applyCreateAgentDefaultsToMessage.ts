import { getProstglesMCPFullToolName } from "@common/mcpUtils";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBS } from "@src/index";
import { getJSONBSchemaValidationError } from "prostgles-types";
import type { LLMMessage } from "./askLLM";
import { getCreateAgentInputWithDefaults } from "./getCreateAgentInputWithDefaults";

export const applyCreateAgentDefaultsToMessage = async (
  message: LLMMessage,
  chatId: number,
  dbs: DBS,
) => {
  for (const content of message) {
    if (
      content.type !== "tool_use" ||
      content.name !==
        getProstglesMCPFullToolName("prostgles-ui", "create_agent")
    )
      continue;
    const inputValidation = getJSONBSchemaValidationError(
      PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"].create_agent.schema,
      content.input,
      { allowExtraProperties: true },
    );
    if (inputValidation.error !== undefined) continue;
    content.input = await getCreateAgentInputWithDefaults(
      inputValidation.data,
      chatId,
      dbs,
    );
  }
};
