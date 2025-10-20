import {
  getSerialisableError,
  isObject,
  type AnyObject,
} from "prostgles-types";
import type { DBSSchema } from "../../../../common/publishUtils";
import { getLLMRequestBody } from "./getLLMRequestBody";
import type { MCPToolSchema } from "./getLLMTools";
import {
  parseLLMResponseObject,
  type LLMParsedResponse,
} from "./parseLLMResponseObject";
import { readFetchStream } from "./readFetchStream";
export type LLMMessageWithRole = {
  role: "system" | "user" | "assistant" | "model";
  content: DBSSchema["llm_messages"]["message"];
};
export type FetchLLMResponseArgs = {
  llm_chat: Pick<DBSSchema["llm_chats"], "extra_body" | "extra_headers">;
  llm_model: DBSSchema["llm_models"];
  llm_provider: DBSSchema["llm_providers"];
  llm_credential: DBSSchema["llm_credentials"];
  tools: undefined | (MCPToolSchema & { auto_approve: boolean })[];
  messages: LLMMessageWithRole[];
};

export const fetchLLMResponse = async (
  args: FetchLLMResponseArgs,
): Promise<LLMParsedResponse> => {
  const { llm_provider, llm_credential, llm_model } = args;
  const model = llm_model.name;
  const provider = llm_provider.id;
  const { api_key } = llm_credential;
  const { body, headers } = getLLMRequestBody(args);
  const api_url = llm_provider.api_url
    .replace("$KEY", api_key)
    .replace("$MODEL", model);
  if (api_url === "http://localhost:3004/mocked-llm") {
    return { content: [{ type: "text", text: "Mocked response" }], cost: 0 };
  }

  const res = await fetch(api_url, {
    method: "POST",
    headers,
    body,
  }).catch((err) => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    return Promise.reject(getSerialisableError(err));
  });

  const responseClone = res.clone();

  const responseData = (await readFetchStream(res)) as AnyObject | undefined;
  if (!res.ok) {
    if (isObject(responseData)) {
      throw responseData;
    }
    throw new Error(
      `Failed to fetch LLM response: ${res.statusText} ${JSON.stringify(responseData)}`,
    );
  }
  if (!responseData) {
    throw new Error("No response data from LLM");
  }

  try {
    return parseLLMResponseObject({
      provider,
      responseData,
      model: llm_model,
    });
  } catch (e) {
    console.error(
      `Error parsing LLM response from ${provider} for model ${model}`,
      getSerialisableError(e),
      responseData,
    );
    throw new Error(
      `Error parsing LLM response from ${provider} for model ${model}: ${JSON.stringify(getSerialisableError(e))}`,
    );
  }
};
