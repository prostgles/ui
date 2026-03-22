import { filterArr } from "@common/llmUtils";
import {
  includes,
  isDefined,
  omitKeys,
  tryCatchV2,
  type AnyObject,
} from "prostgles-types";
import type { LLMMessage } from "./askLLM";
import type { FetchLLMResponseArgs } from "./fetchLLMResponse";
import { getCompactedMessages } from "./getCompactedMessages";

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
      const nonEmptyMessageContent = m.content
        .filter((m) => m.type !== "text" || !("text" in m) || m.text.trim())
        .map((c) => {
          if (c.type === "text-document") {
            return {
              type: "text",
              text: `<document name=${JSON.stringify(c.fileName)}>\n${c.text}\n</document>`,
            } as const;
          }
          return c;
        });
      return {
        ...m,
        content: nonEmptyMessageContent,
      };
    })
    .filter((m) => m.content.length);

  const toolNames = new Set<string>();
  tools?.forEach((tool) => {
    if (toolNames.has(tool.name)) {
      throw new Error(
        `Duplicate tool name ${JSON.stringify(tool.name)} in tools array`,
      );
    }
    toolNames.add(tool.name);
  });

  const { messagesAfterCompaction } = getCompactedMessages({
    nonEmptyMessages,
  });
  const systemMessage = messagesAfterCompaction.filter(
    (m) => m.role === "system",
  );
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
      messagesAfterCompaction
    : messagesAfterCompaction.filter((m) => m.role !== "system");
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
        contents: messages.map((m) => ({
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
              if (c.type === "text" && "text" in c) return [{ text: c.text }];
              if (c.type === "tool_use") {
                return [
                  {
                    functionCall: {
                      name: c.name,
                      args: c.input,
                    },
                  },
                ];
              }
              const toolResults = getToolResults([c]);
              if (toolResults.length) {
                return toolResults.map((toolResult) => {
                  const resultText = toolResult.content;
                  const funcName = toolResult.tool_name; //arr[i - 1]?.content
                  // .map((c) =>
                  //   c.type === "tool_use" && c.name ? c.name : undefined,
                  // )
                  // .find(isDefined);
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
                });
              }
            })
            .flat()
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
        messages: messages
          .map((m) => {
            const toolUseContent = filterArr(m.content, {
              type: "tool_use" as const,
            });
            const textContent = filterArr(m.content, { type: "text" as const });

            if (toolUseContent.length) {
              return {
                role: "assistant",
                content: textContent.map((t) => t.text).join("\n") || "",
                tool_calls: toolUseContent.map((tc) => ({
                  id: tc.id,
                  type: "function",
                  function: {
                    name: tc.name,
                    arguments: JSON.stringify(tc.input),
                  },
                })),
              };
            }
            const toolUseResults = getToolResults(m.content);
            if (toolUseResults.length) {
              return toolUseResults.map((toolUseResult) => {
                return {
                  role: "tool",
                  tool_call_id: toolUseResult.tool_use_id,
                  content: toolUseResult.content,
                  ...(toolUseResult.is_error && {
                    is_error: toolUseResult.is_error,
                  }),
                };
              });
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
          })
          .flat(),
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

  const toolCalls = new Map<string, { resultCount: number }>();
  messages.forEach((message) => {
    message.content.forEach((m) => {
      if (m.type === "tool_use") {
        const match = toolCalls.get(m.id);
        if (match) {
          throw new Error(
            `Duplicate tool_use id ${m.id} for ${m.name}, this should not happen`,
          );
        }
        toolCalls.set(m.id, { resultCount: 0 });
      } else if (m.type === "tool_result" && m.tool_use_id) {
        const toolCall = toolCalls.get(m.tool_use_id);
        if (!toolCall) {
          throw new Error(
            `tool_result with tool_use_id for ${m.tool_name} has no matching tool_use, this should not happen`,
          );
        }
        if (toolCall.resultCount) {
          throw new Error(
            `Multiple tool_result with the same tool_use_id for ${m.tool_name}, this should not happen`,
          );
        }
        toolCall.resultCount++;
      }
    });
  });

  const bodyWithExtras = {
    ...body,
    ...llm_provider.extra_body,
    ...llm_credential.extra_body,
    ...llm_model.extra_body,
    ...llm_chat.extra_body,
  };
  return {
    body: JSON.stringify(bodyWithExtras),
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

const getToolResults = (content: LLMMessage) => {
  const toolUseResults = filterArr(content, {
    type: "tool_result" as const,
  });

  return toolUseResults.map((toolUseResult) => {
    const { content, ...otherProps } = toolUseResult;
    const contentText =
      typeof content === "string" ? content : (
        filterArr(content, { type: "text" as const })
          .map((c) => c.text)
          .join("\n")
      );
    return {
      ...otherProps,
      role: "tool",
      tool_call_id: toolUseResult.tool_use_id,
      content:
        contentText ||
        "?? Internal issue in tool result parsing in prostgles ui",
    };
  });
};
