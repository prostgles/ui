import { DBSSchema } from "./publishUtils";

export type LLMMessage = DBSSchema["llm_messages"];

export const getLLMMessageText = ({
  message,
}: Pick<LLMMessage, "message">): string => {
  if (typeof message === "string") return message;
  const textMessages = filterArr(message, { type: "text" } as const);
  const text = textMessages.map((m) => m.text).join("\n");

  const toolsUsed = getLLMMessageToolUse({ message }).map((m) => m.name);
  const toolsResponses = getLLMMessageToolUseResult({ message }).map(
    (m) => m.is_error,
  );
  return [
    toolsUsed.length ? `**Tools used: ${toolsUsed.join(", ")}**` : null,
    toolsResponses.length ?
      toolsResponses[0] ?
        `**Tool use error**`
      : `**Tool result response**`
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

export const filterArr = <T, U extends Partial<T>>(
  arr: T[],
  pattern: U,
): FilterMatch<T, U>[] => {
  return arr.filter((item) => {
    return Object.entries(pattern).every(
      ([key, value]) => item[key as keyof T] === value,
    );
  }) as FilterMatch<T, U>[];
};
