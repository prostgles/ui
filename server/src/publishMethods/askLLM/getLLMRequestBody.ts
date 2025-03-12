import { isDefined } from "prostgles-types";
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
        system: systemMessageObj.content,
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
        model,
        messages,
        tools,
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
