import { isDefined, isObject, omitKeys } from "prostgles-types";
import type { FetchLLMResponseArgs } from "./fetchLLMResponse";

export const getLLMRequestBody = ({
  llm_provider,
  llm_credential,
  messages: maybeEmptyMessages,
  tools,
  llm_model,
}: FetchLLMResponseArgs) => {
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
        model,
        system: systemMessageObj.content.map((c, i, arr) =>
          i === arr.length - 1 ?
            {
              ...c,
              cache_control: { type: "ephemeral" },
            }
          : c,
        ),
        messages,
        tools,
      }
    : provider === "Prostgles" ?
      {
        messages,
        tools,
      }
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
        contents: messages.map((m, i, arr) => ({
          role:
            m.content.some((c) => c.type === "tool_result") ? "function"
            : m.content.some((c) => c.type === "tool_use") ? "model"
            : m.role,
          parts: m.content
            .map((c) => {
              if (c.type === "text") return { text: c.text };
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
                  ?.map((c) =>
                    c.type === "tool_use" && c.name ? c.name : undefined,
                  )
                  .find(isDefined);
                return {
                  functionResponse: {
                    name: funcName,
                    response: {
                      name: funcName,
                      content: JSON.parse(resultText ?? "{}"),
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
          if (m.content.some((c) => c.type === "tool_result")) {
            return {
              ...m,
              name: m.content,
              role: "tool",
            };
          }
          return m;
        }),
        tools: tools?.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: omitKeys(t.input_schema, ["$schema", "$id"]),
          },
        })),
      };

  const bodyWithExtras = {
    ...body,
    ...llm_provider.extra_body,
    ...llm_credential.extra_body,
    ...llm_model.extra_body,
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
    },
  };
};
