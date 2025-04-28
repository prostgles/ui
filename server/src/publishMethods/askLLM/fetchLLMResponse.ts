import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { type AnyObject, isDefined, omitKeys } from "prostgles-types";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { readFetchStream } from "./readFetchStream";
import { getLLMRequestBody } from "./getLLMRequestBody";
export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: DBSSchema["llm_messages"]["message"];
};
export type FetchLLMResponseArgs = {
  llm_chat: Pick<DBSSchema["llm_chats"], "extra_body" | "extra_headers">;
  llm_model: DBSSchema["llm_models"];
  llm_provider: DBSSchema["llm_providers"];
  llm_credential: DBSSchema["llm_credentials"];
  tools:
    | undefined
    | {
        name: string;
        description: string;
        input_schema: AnyObject;
      }[];
  messages: LLMMessage[];
};

type LLMParsedResponse = Pick<LLMMessage, "content"> & {
  meta?: AnyObject | null;
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
    return { content: [{ type: "text", text: "Mocked response" }] };
  }

  const res = await fetch(api_url, {
    method: "POST",
    headers,
    body,
  }).catch((err) => Promise.reject(JSON.stringify(getErrorAsObject(err))));

  const responseData = await readFetchStream(res);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch LLM response: ${res.statusText} ${JSON.stringify(responseData)}`,
    );
  }
  return parseLLMResponseObject({
    provider,
    responseData,
  });
};

type ParseResponseObjectArgs = {
  provider: string;
  responseData: AnyObject | undefined;
};
export const parseLLMResponseObject = ({
  provider,
  responseData,
}: ParseResponseObjectArgs): LLMParsedResponse => {
  if (provider === "Google") {
    const { candidates, ...meta } = responseData as GoogleResponse;
    const content = candidates.flatMap((c) => {
      return c.content.parts.map((p) => {
        if ("text" in p) {
          return {
            type: "text",
            text: p.text,
          } satisfies LLMMessage["content"][number];
        }
        if ("functionCall" in p) {
          return {
            type: "tool_use",
            id: `${Date.now()}-${Math.random()}`,
            name: p.functionCall.name,
            input: p.functionCall.args,
          } satisfies LLMMessage["content"][number];
        }
        return {
          type: "text",
          text: "INTERNAL ERROR: Unexpected response from LLM",
        } satisfies LLMMessage["content"][number];
      });
    });
    return { content, meta };
  }
  if (provider === "Anthropic" || provider === "Prostgles") {
    const { content: rawContent, ...meta } = responseData as AnthropicResponse;
    const content = rawContent
      .map((c) => {
        const contentItem: LLMMessage["content"][number] | undefined =
          c.type === "text" && c.text ?
            {
              type: "text",
              text: c.text,
            }
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          : c.type === "tool_use" ?
            ({
              type: "tool_use",
              id: c.id,
              name: c.name,
              input: c.input,
            } satisfies LLMMessage["content"][number])
          : undefined;

        return contentItem;
      })
      .filter(isDefined);
    return { content, meta };
  } else if (provider === "OpenAI") {
    const { choices, ...meta } = responseData as OpenAIResponse;
    const content: LLMMessage["content"] = [];
    choices.map((c) => {
      if (c.message.tool_calls?.length) {
        c.message.tool_calls.forEach((toolCall) => {
          content.push({
            type: "tool_use",
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
          });
        });
      } else {
        content.push({
          type: "text",
          text: c.message.content ?? "",
        });
      }
    });
    return {
      content,
      meta,
    };
  } else {
    const path = ["choices", 0, "message", "content"];
    const messageText = parsePath(responseData ?? {}, path);
    if (typeof messageText !== "string") {
      throw "Unexpected response from LLM. Expecting string";
    }
    const firstPathItem = path[0];
    const meta =
      !isDefined(firstPathItem) || !responseData ? null
      : Array.isArray(responseData) ?
        responseData.filter((_, i) => i !== firstPathItem)
      : omitKeys(responseData, [firstPathItem.toString()]);
    return { content: [{ type: "text", text: messageText }], meta };
  }
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
  /**
   * "claude-3-5-sonnet-20240620" |
   */
  model: string;
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

type GoogleResponse = {
  candidates: {
    content: {
      parts: (
        | {
            text: string;
          }
        | {
            functionCall: {
              name: string;
              args: AnyObject | undefined;
            };
          }
      )[];
      role: "model";
    };
    finishReason: "STOP";
    avgLogprobs: number;
  }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion: "gemini-1.5-flash";
};

type OpenAIResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?:
        | null
        | {
            id: string;
            type: "function";
            function: {
              name: string;
              arguments: string;
            };
          }[];
      refusal: null;
      annotations: [];
    };
    /**
     * "tool_calls" |
     */
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details: {
      cached_tokens: number;
      audio_tokens: number;
    };
    completion_tokens_details: {
      reasoning_tokens: number;
      audio_tokens: number;
      accepted_prediction_tokens: number;
      rejected_prediction_tokens: number;
    };
  };
  service_tier: "default";
  system_fingerprint: null;
};
