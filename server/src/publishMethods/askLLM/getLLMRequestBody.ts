import {
  includes,
  isDefined,
  omitKeys,
  tryCatchV2,
  type AnyObject,
} from "prostgles-types";
import { filterArr } from "../../../../commonTypes/llmUtils";
import type { FetchLLMResponseArgs } from "./fetchLLMResponse";

export const getLLMRequestBody = ({
  llm_provider,
  llm_credential,
  messages: maybeEmptyMessages,
  tools: maybeEmptyTools,
  llm_model,
  llm_chat,
}: FetchLLMResponseArgs) => {
  /**
   * Sending an empty array of tools or messages produces an error in openrouter: tool_choice may only be specified while providing tools
   */
  const tools =
    maybeEmptyTools && maybeEmptyTools.length ? maybeEmptyTools : undefined;
  const nonEmptyMessages = maybeEmptyMessages
    .map((m) => {
      const nonEmptyMessageContent = m.content.filter(
        (m) => m.type !== "text" || !("text" in m) || m.text.trim(),
      );
      return {
        ...m,
        content: nonEmptyMessageContent,
      };
    })
    .filter((m) => m.content.length);

  const systemMessage = nonEmptyMessages.filter((m) => m.role === "system");
  const [systemMessageObj, ...otherSM] = systemMessage;
  if (otherSM.length) throw "Multiple prompts found";
  const { api_key } = llm_credential;
  const model = llm_model.name;
  const provider = llm_provider.id as
    | "OpenAI"
    | "Anthropic"
    | "Google"
    | "Prostgles"
    | "OpenRouter"
    | "Ollama";
  const messages =
    includes(["OpenAI", "OpenRouter", "Prostgles", "Ollama"], provider) ?
      nonEmptyMessages
    : nonEmptyMessages.filter((m) => m.role !== "system");
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
        model,
        system: systemMessageObj?.content.map((c, i, arr) =>
          i === arr.length - 1 ?
            {
              ...c,
              cache_control: { type: "ephemeral" },
            }
          : c,
        ),
        messages: messages.map((m) => ({
          ...m,
          content: m.content.map((c) => {
            return (
              c.type === "image" ?
                {
                  type: "image",
                  source: {
                    ...c.source,
                    data: removeBase64Prefix(c.source.data),
                  },
                }
              : c.type === "tool_result" ? omitKeys(c, ["tool_name"])
              : c
            );
          }),
        })),
        tools,
      }
    : provider === "Google" ?
      {
        system_instruction: systemMessageObj && {
          parts: systemMessageObj.content
            .map((c) => {
              if (c.type !== "text" || !("text" in c)) return undefined;
              return {
                text: c.text,
              };
            })
            .filter(isDefined),
        },
        /**
         * https://ai.google.dev/gemini-api/docs/text-generation?lang=rest
         */
        contents: messages.map((m, i, arr) => ({
          role:
            m.content.some((c) => c.type === "tool_result") ? "function"
            : m.content.some((c) => c.type === "tool_use") ? "model"
            : m.role,
          parts: m.content
            .map((c) => {
              // if (c.type === "image") {
              //   return {
              //     inlineData: {
              //       mimeType: c.source.media_type,
              //       data: removeBase64Prefix(c.source.data),
              //     },
              //   };
              // }
              if (c.type === "text" && "text" in c) return { text: c.text };
              if (c.type === "tool_use") {
                return {
                  functionCall: {
                    name: c.name,
                    args: c.input,
                  },
                };
              }
              if (c.type === "tool_result") {
                const resultText =
                  typeof c.content === "string" ?
                    c.content
                  : c.content
                      .map((c) => {
                        c.type === "text" ? c.text : undefined;
                      })
                      .find(isDefined);
                const funcName = arr[i - 1]?.content
                  .map((c) =>
                    c.type === "tool_use" && c.name ? c.name : undefined,
                  )
                  .find(isDefined);
                const resultObject = tryCatchV2(
                  () => JSON.parse(resultText || "{}") as AnyObject,
                );
                return {
                  functionResponse: {
                    name: funcName,
                    response: {
                      name: funcName,
                      content: resultObject.data ?? {
                        parsingError: "Could not parse tool result as JSON",
                        toolResult: resultText,
                      },

                      // JSON.parse(
                      //   (resultText as string | undefined) ?? "{}",
                      // ),
                    },
                  },
                };
              }
            })
            .filter(isDefined),
        })),
        ...(tools && {
          tools: [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: omitKeys(t.input_schema, ["$schema", "$id"]),
              })),
            },
          ],
        }),
      }
    : /**  "OpenAI"  */
      {
        model,
        messages: messages.map((m) => {
          const isToolUse = filterArr(m.content, { type: "tool_use" as const });
          if (isToolUse.length) {
            return {
              role: "assistant",
              content: null,
              tool_calls: isToolUse.map((tc) => ({
                id: tc.id,
                type: "function",
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.input),
                },
              })),
            };
          }
          const [isToolUseResult] = filterArr(m.content, {
            type: "tool_result" as const,
          });
          if (isToolUseResult) {
            const [firstContent] = isToolUseResult.content;
            return {
              role: "tool",
              tool_call_id: isToolUseResult.tool_use_id,
              content:
                typeof firstContent === "string" ? firstContent
                : firstContent?.type === "text" ? firstContent.text
                : "?? Internal issue in tool result parsing in prostgles ui",
            };
          }
          return {
            ...m,
            content: m.content.map((c) => {
              if (c.type === "image") {
                return {
                  type: "image_url",
                  image_url: { url: c.source.data },
                };
              }
              if (c.type === "tool_result") {
                return {
                  type: "function_call_output",
                  call_id: c.tool_use_id,
                  output:
                    typeof c.content === "string" ?
                      c.content
                    : (filterArr(c.content, { type: "text" as const })[0]
                        ?.text ??
                      "?? Internal issue in tool result parsing in prostgles ui"),
                };
              }
              return c;
            }),
            ...(m.content.some((c) => c.type === "tool_result") && {
              role: "tool",
            }),
          };
        }),
        tools: tools?.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: omitKeys(t.input_schema, ["$schema", "$id"]),
          },
        })),
        ...(provider === "Ollama" && {
          stream: false,
        }),
      };

  const bodyWithExtras = {
    ...body,
    ...llm_provider.extra_body,
    ...llm_credential.extra_body,
    ...llm_model.extra_body,
    ...llm_chat.extra_body,
  };
  return {
    body: JSON.stringify(
      provider === "Prostgles" ? [bodyWithExtras] : bodyWithExtras,
    ),
    headers: {
      ...headers,
      ...llm_provider.extra_headers,
      ...llm_credential.extra_headers,
      ...llm_model.extra_headers,
      ...llm_chat.extra_headers,
    },
  };
};

const removeBase64Prefix = (data: string) => {
  const base64Prefix = "base64,";
  if (data.includes(base64Prefix)) {
    return data.substring(data.indexOf("base64,") + 7);
  }
  return data;
};
