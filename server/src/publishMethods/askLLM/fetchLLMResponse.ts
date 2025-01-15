import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { type AnyObject, pickKeys } from "prostgles-types";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: DBSSchema["llm_messages"]["message"];
};
type Args = {
  llm_credential: Pick<
    DBSSchema["llm_credentials"],
    "config" | "endpoint" | "result_path"
  >;
  tools: {
    name: string;
    description: string;
    /**
     * JSON schema for input
     */
    input_schema: AnyObject;
  }[];
  messages: LLMMessage[];
};

export const fetchLLMResponse = async ({
  llm_credential,
  messages: _messages,
  tools,
}: Args) => {
  const systemMessage = _messages.filter((m) => m.role === "system");
  const [systemMessageObj, ...otherSM] = systemMessage;
  if (!systemMessageObj) throw "Prompt not found";
  if (otherSM.length) throw "Multiple prompts found";
  const { config } = llm_credential;
  const messages =
    config.Provider === "OpenAI" ?
      _messages
    : _messages.filter((m) => m.role !== "system");

  const headers =
    config.Provider === "OpenAI" || config.Provider === "Prostgles" ?
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.API_Key}`,
      }
    : config.Provider === "Anthropic" ?
      {
        "content-type": "application/json",
        "x-api-key": config.API_Key,
        "anthropic-version": config["anthropic-version"],
      }
    : config.headers;

  const body =
    config.Provider === "OpenAI" ?
      {
        ...pickKeys(config, [
          "temperature",
          "max_completion_tokens",
          "model",
          "frequency_penalty",
          "presence_penalty",
          "response_format",
        ]),
        messages,
      }
    : config.Provider === "Anthropic" ?
      {
        ...pickKeys(config, ["model", "max_tokens"]),
        system: systemMessageObj.content,
        messages,
        tools,
      }
    : config.Provider === "Prostgles" ?
      [
        {
          messages,
          tools,
        },
      ]
    : config.body;

  if (llm_credential.endpoint === "http://localhost:3004/mocked-llm") {
    return {
      aiText: "Mocked response",
    };
  }

  const res = await fetch(llm_credential.endpoint, {
    method: "POST",
    headers,
    body: body && JSON.stringify(body),
  }).catch((err) => Promise.reject(JSON.stringify(getErrorAsObject(err))));

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch LLM response: ${res.statusText} ${errorText}`,
    );
  }
  const response = (await res.json()) as AnyObject | undefined;

  let aiText: string;
  let runTools: { name: string; input: any }[] = [];
  if (config.Provider === "Anthropic") {
    const anthropicResponse = response as AnthropicResponse;
    aiText =
      anthropicResponse.content.find(
        (c): c is AnthropicTextResponse => c.type === "text",
      )?.text ?? "";
    runTools = anthropicResponse.content
      .filter((c): c is AnthropicToolUseResponse => c.type === "tool_use")
      .map((c) => ({ name: c.name, input: c.input }));
  } else {
    const path =
      llm_credential.result_path ??
      (config.Provider === "OpenAI" ?
        ["choices", 0, "message", "content"]
      : ["content", 0, "text"]);
    aiText = parsePath(response ?? {}, path);
  }

  if (typeof aiText !== "string") {
    throw "Unexpected response from LLM. Expecting string";
  }
  return {
    aiText,
    runTools,
  };
};

const parsePath = (obj: AnyObject, path: (string | number)[]): any => {
  let val: AnyObject | undefined = obj;
  for (const key of path) {
    if (val === undefined) return undefined;
    val = val[key];
  }
  return val;
};

type AnthropicTextResponse = {
  type: "text";
  text: string;
};
type AnthropicToolUseResponse = {
  type: "tool_use";
  id: string;
  name: string;
  input: AnyObject;
};
type AnthropicResponse = {
  id: string;
  type: "message";
  role: "assistant";
  model: "claude-3-5-sonnet-20240620" | string;
  content: (AnthropicTextResponse | AnthropicToolUseResponse)[];
  stop_reason: "tool_use";
  stop_sequence: null;
  usage: {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    output_tokens: number;
  };
};
