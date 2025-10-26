import {
  type AnyObject,
  getSerialisableError,
  isDefined,
  omitKeys,
} from "prostgles-types";
import type { DBSSchema } from "../../../../common/publishUtils";
import type { LLMMessageWithRole } from "./fetchLLMResponse";
import { getLLMUsageCost } from "./getLLMUsageCost";
import type {
  AnthropicChatCompletionResponse,
  GoogleGeminiChatCompletionResponse,
  OpenAIChatCompletionResponse,
} from "./LLMResponseTypes";

export type LLMResponseParser<T = AnyObject> = (args: {
  provider: string;
  responseData: T;
  model: DBSSchema["llm_models"];
}) => LLMParsedResponse;

export type LLMParsedResponse = Pick<LLMMessageWithRole, "content"> & {
  meta?: AnyObject | null;
  cost: number | undefined;
};

export const parseLLMResponseObject: LLMResponseParser = ({
  provider,
  responseData,
  model,
}) => {
  if (provider === "Google") {
    const { candidates, ...meta } =
      responseData as GoogleGeminiChatCompletionResponse;
    const content = candidates.flatMap((c) => {
      return c.content.parts.map((p) => {
        if ("text" in p) {
          return {
            type: "text",
            text: p.text,
          } satisfies LLMMessageWithRole["content"][number];
        }
        if ("functionCall" in p) {
          return {
            type: "tool_use",
            id: `${Date.now()}-${Math.random()}`,
            name: p.functionCall.name,
            input: p.functionCall.args,
          } satisfies LLMMessageWithRole["content"][number];
        }
        return {
          type: "text",
          text: "INTERNAL ERROR: Unexpected response from LLM",
        } satisfies LLMMessageWithRole["content"][number];
      });
    });
    return {
      content,
      meta: {
        ...meta,
        finishReason: candidates[0]?.finishReason,
      },
      cost: getLLMUsageCost(model, { type: "Gemini", meta }),
    };
  }
  if (provider === "Anthropic") {
    const { content: rawContent, ...meta } =
      responseData as AnthropicChatCompletionResponse;
    const content = rawContent
      .map((c) => {
        const contentItem: LLMMessageWithRole["content"][number] | undefined =
          c.type === "text" && c.text ?
            {
              type: "text",
              text: c.text,
            }
          : c.type === "tool_use" ?
            ({
              type: "tool_use",
              id: c.id,
              name: c.name,
              input: c.input,
            } satisfies LLMMessageWithRole["content"][number])
          : undefined;

        return contentItem;
      })
      .filter(isDefined);
    return {
      content,
      meta,
      cost: getLLMUsageCost(model, { type: "Anthropic", meta }),
    };
  } else if (
    provider === "OpenAI" ||
    provider === "OpenRouter" ||
    provider === "Ollama" ||
    provider === "Prostgles"
  ) {
    const { choices, ...meta } = responseData as OpenAIChatCompletionResponse;
    const content: LLMMessageWithRole["content"] = choices
      .flatMap((c) => {
        const toolCalls =
          c.message.tool_calls?.map((toolCall) => {
            if (toolCall.function.arguments) {
              try {
                return {
                  type: "tool_use",
                  id: toolCall.id,
                  name: toolCall.function.name,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  input: JSON.parse(toolCall.function.arguments),
                } satisfies LLMMessageWithRole["content"][number];
              } catch (_e) {
                const error = new Error(
                  `Could not parse tool arguments as JSON: ${toolCall.function.arguments}. ` +
                    JSON.stringify(getSerialisableError(_e)),
                );
                error.name = "ToolArgumentsParsingError";
                throw error;
              }
            }
          }) ?? [];
        return [
          c.message.content ?
            ({
              type: "text",
              text: c.message.content,
              reasoning: c.message.reasoning || undefined,
            } satisfies LLMMessageWithRole["content"][number])
          : undefined,
          ...toolCalls,
        ];
      })
      .filter(isDefined);
    return {
      content,
      meta: {
        ...meta,
        finish_reason: choices[0]?.finish_reason,
      },
      cost: getLLMUsageCost(model, { type: "OpenAI", meta }),
    };
  } else {
    const path = ["choices", 0, "message", "content"];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const messageText = parsePath(responseData, path);
    if (typeof messageText !== "string") {
      throw "Unexpected response from LLM. Expecting string";
    }
    const firstPathItem = path[0];
    const meta =
      !isDefined(firstPathItem) ? null
      : Array.isArray(responseData) ?
        responseData.filter((_, i) => i !== firstPathItem)
      : omitKeys(responseData, [firstPathItem.toString()]);
    return {
      content: [{ type: "text", text: messageText }],
      meta,
      cost: undefined,
    };
  }
};

const parsePath = (obj: AnyObject, path: (string | number)[]): any => {
  let val: AnyObject | undefined = obj;
  for (const key of path) {
    if (val === undefined) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    val = val[key];
  }
  return val;
};
