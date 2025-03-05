import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { type AnyObject, isDefined, omitKeys, pickKeys } from "prostgles-types";
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

export const fetchLLMResponse = async ({
  llm_credential,
  messages: maybeEmptyMessages,
  tools,
}: Args): Promise<
  Pick<LLMMessage, "content"> & { meta?: AnyObject | null }
> => {
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
  const { config } = llm_credential;
  const messages =
    config.Provider === "OpenAI" ?
      nonEmptyMessages
    : nonEmptyMessages.filter((m) => m.role !== "system");
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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    : config.Provider === "Google" ?
      {
        "content-type": "application/json",
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
        tools,
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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    : config.Provider === "Google" ?
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
    : config.body;

  if (llm_credential.endpoint === "http://localhost:3004/mocked-llm") {
    return { content: [{ type: "text", text: "Mocked response" }] };
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

  if (config.Provider === "Google") {
    const { candidates, ...meta } = response as GoogleResponse;
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
  if (config.Provider === "Anthropic") {
    const { content: rawContent, ...meta } = response as AnthropicResponse;
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
    const path =
      llm_credential.result_path ??
      (config.Provider === "OpenAI" ?
        ["choices", 0, "message", "content"]
      : ["content", 0, "text"]);
    const messageText = parsePath(response ?? {}, path);
    if (typeof messageText !== "string") {
      throw "Unexpected response from LLM. Expecting string";
    }
    const firstPathItem = path[0];
    const meta =
      !isDefined(firstPathItem) || !response ? null
      : Array.isArray(response) ? response.filter((_, i) => i !== firstPathItem)
      : omitKeys(response, [firstPathItem.toString()]);
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
