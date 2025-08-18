import { DBSSchema } from "./publishUtils";

export type LLMMessage = DBSSchema["llm_messages"];

export const getLLMMessageText = ({
  message,
}: Pick<LLMMessage, "message">): string => {
  if (typeof message === "string") return message;
  const textMessages = filterArr(message, { type: "text" } as const);
  const text = textMessages.map((m) => m.text).join("\n");

  const toolsUsed = getLLMMessageToolUse({ message }).map((m) => m.name);
  const toolsResponse = getLLMMessageToolUseResult({ message })[0];
  const toolResponseText =
    typeof toolsResponse?.content === "string" ?
      toolsResponse.content
    : filterArr(toolsResponse?.content ?? [], { type: "text" } as const)[0]
        ?.text;
  return [
    toolsUsed.length ? `**Tools used: ${toolsUsed.join(", ")}**` : null,
    toolsResponse ?
      (toolsResponse.is_error ? `**Tool use error**` : (
        `**Tool ${toolsUsed.join(", ")} response**`
      )) + `\n\n${toolResponseText}`
    : null,
    text,
  ]
    .filter((v) => v)
    .join("\n");
};

export const getLLMMessageToolUse = ({
  message,
}: Pick<LLMMessage, "message">) => {
  if (typeof message === "string") return [];
  return filterArr(message, { type: "tool_use" } as const);
};

export const getLLMMessageToolUseResult = ({
  message,
}: Pick<LLMMessage, "message">) => {
  if (typeof message === "string") return [];
  return filterArr(message, { type: "tool_result" } as const);
};

type FilterMatch<T, U> = T extends U ? T : never;
type FilterUnMatch<T, U> = T extends U ? never : T;

export const filterArr = <T, U extends Partial<T>>(
  arr: T[] | readonly T[],
  pattern: U,
): FilterMatch<T, U>[] => {
  const patternEntries = Object.entries(pattern);
  return arr.filter((item) => {
    return patternEntries.every(
      ([key, value]) => item[key as keyof T] === value,
    );
  }) as FilterMatch<T, U>[];
};

export const findArr = <T, U extends Partial<T>>(
  arr: T[] | readonly T[],
  pattern: U,
): FilterMatch<T, U> | undefined => {
  const patternEntries = Object.entries(pattern);
  return arr.find((item) => {
    return patternEntries.every(
      ([key, value]) => item[key as keyof T] === value,
    );
  }) as FilterMatch<T, U> | undefined;
};

export const filterArrInverse = <T, U extends Partial<T>>(
  arr: T[],
  pattern: U,
): FilterUnMatch<T, U>[] => {
  const patternEntries = Object.entries(pattern);
  return arr.filter((item) => {
    return patternEntries.every(
      ([key, value]) => item[key as keyof T] !== value,
    );
  }) as FilterUnMatch<T, U>[];
};

export const LLM_PROMPT_VARIABLES = {
  PROSTGLES_SOFTWARE_NAME: "${prostglesSoftwareName}",
  SCHEMA: "${schema}",
  DASHBOARD_TYPES: "${dashboardTypes}",
  TODAY: "${today}",
} as const;

export const reachedMaximumNumberOfConsecutiveToolRequests = (
  messages: Pick<DBSSchema["llm_messages"], "message">[],
  limit: number,
  onlyFailed = false,
): boolean => {
  const reversedMessages = messages.slice().reverse();
  let count = 0;
  for (let i = 0; i < reversedMessages.length; i = i + 2) {
    const message = reversedMessages[i];
    const nextMessage = reversedMessages[i + 1];
    if (!message || !nextMessage) {
      break; // No more pairs to check
    }
    const isToolUseResult = message.message.some(
      (m) => m.type === "tool_result" && (!onlyFailed || m.is_error),
    );
    const isToolUseRequest = isAssistantMessageRequestingToolUse(nextMessage);
    if (!isToolUseResult || !isToolUseRequest) {
      break;
    }

    count++;
  }
  if (count >= limit) return true;

  return false;
};

export const isAssistantMessageRequestingToolUse = (
  message: Pick<DBSSchema["llm_messages"], "message"> | undefined,
): message is DBSSchema["llm_messages"] => {
  return Boolean(message && getLLMMessageToolUse(message).length);
};
