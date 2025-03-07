import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { type AnyObject, isDefined, omitKeys, pickKeys } from "prostgles-types";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { ReadableStreamDefaultReader } from "stream/web";
import { readFetchStream } from "./readFetchStream";
export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: DBSSchema["llm_messages"]["message"];
};
type Args = {
  llm_model: DBSSchema["llm_models"];
  llm_provider: DBSSchema["llm_providers"];
  llm_credential: DBSSchema["llm_credentials"];
  tools:
    | undefined
    | ({
        name: string;
        description: string;
      } & (
        | {
            /**
             * Anthropic
             */
            input_schema: AnyObject;
          }
        | {
            /**
             * Google/OpenAI
             */
            parameters: AnyObject;
          }
      ))[];
  messages: LLMMessage[];
};

type LLMParsedResponse = Pick<LLMMessage, "content"> & {
  meta?: AnyObject | null;
};

export const fetchLLMResponse = async ({
  llm_provider,
  llm_credential,
  messages: maybeEmptyMessages,
  tools,
  llm_model,
}: Args): Promise<LLMParsedResponse> => {
  const nonEmptyMessages = maybeEmptyMessages
    .map((m) => {
      const nonEmptyMessageContent = m.content.filter(
        (m) => m.type !== "text" || m.text.trim(),
      );
      return {
        ...m,
        content: nonEmptyMessageContent,
      };
    })
    .filter((m) => m.content.length);

  const systemMessage = nonEmptyMessages.filter((m) => m.role === "system");
  const [systemMessageObj, ...otherSM] = systemMessage;
  if (!systemMessageObj) throw "Prompt not found";
  if (otherSM.length) throw "Multiple prompts found";
  const { api_key } = llm_credential;
  const model = llm_model.name;
  const provider = llm_provider.id;
  const messages =
    provider === "OpenAI" ? nonEmptyMessages : (
      nonEmptyMessages.filter((m) => m.role !== "system")
    );
  const headers: RequestInit["headers"] =
    provider === "Anthropic" ?
      {
        "content-type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
      }
    : provider === "Google" ?
      {
        "content-type": "application/json",
      }
    : {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      };

  const body =
    provider === "Anthropic" ?
      {
        // ...pickKeys(config, [
        //   // "model",
        //   "max_tokens",
        // ]),
        model,
        system: systemMessageObj.content,
        messages,
        tools,
      }
    : provider === "Prostgles" ?
      [
        {
          messages,
          tools,
        },
      ]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    : provider === "Google" ?
      {
        system_instruction: {
          parts: systemMessageObj.content
            .map((c) => {
              if (c.type !== "text") return undefined;
              return {
                text: c.text,
              };
            })
            .filter(isDefined),
        },
        /**
         * https://ai.google.dev/gemini-api/docs/text-generation?lang=rest
         */
        contents: messages.map((m) => ({
          role: m.role,
          parts: m.content
            .map((c) => (c.type === "text" ? { text: c.text } : undefined))
            .filter(isDefined),
        })),
        ...(tools && {
          tools: [
            {
              functionDeclarations: tools,
            },
          ],
        }),
      }
    : /**  "OpenAI"  */
      {
        // ...pickKeys(config, [
        //   "temperature",
        //   "max_completion_tokens",
        //   // "model",
        //   "frequency_penalty",
        //   "presence_penalty",
        //   "response_format",
        // ]),
        model,
        messages,
        tools,
      };
  const api_url = llm_provider.api_url
    .replace("$KEY", api_key)
    .replace("$MODEL", model); // ?? config.model
  if (api_url === "http://localhost:3004/mocked-llm") {
    return { content: [{ type: "text", text: "Mocked response" }] };
  }

  const res = await fetch(api_url, {
    method: "POST",
    headers: {
      ...headers,
      ...llm_provider.extra_headers,
      ...llm_credential.extra_headers,
      ...llm_model.extra_headers,
    },
    body: JSON.stringify({
      ...body,
      ...llm_provider.extra_body,
      ...llm_credential.extra_body,
      ...llm_model.extra_body,
    }),
  }).catch((err) => Promise.reject(JSON.stringify(getErrorAsObject(err))));

  const responseData = await readFetchStream(res);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch LLM response: ${res.statusText} ${responseData}`,
    );
  }
  return parseResponseObject({
    provider,
    responseData,
    llm_credential,
  });
};

type ParseResponseObjectArgs = {
  provider: string;
  responseData: AnyObject | undefined;
  llm_credential: DBSSchema["llm_credentials"];
};
const parseResponseObject = ({
  llm_credential,
  provider,
  responseData,
}: ParseResponseObjectArgs): LLMParsedResponse => {
  if (provider === "Google") {
    const { candidates, ...meta } = responseData as GoogleResponse;
    const content = candidates.flatMap((c) => {
      return c.content.parts.map((p) => {
        return {
          type: "text",
          text: p.text,
        } satisfies LLMMessage["content"][number];
      });
    });
    return { content, meta };
  }
  if (provider === "Anthropic") {
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
  } else {
    const path = llm_credential.result_path ?? [
      "choices",
      0,
      "message",
      "content",
    ];
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

type GoogleResponse = {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
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
