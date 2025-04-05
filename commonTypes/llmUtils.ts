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

export const filterArr = <T, U extends Partial<T>>(
  arr: T[],
  pattern: U,
): FilterMatch<T, U>[] => {
  const patternEntries = Object.entries(pattern);
  return arr.filter((item) => {
    return patternEntries.every(
      ([key, value]) => item[key as keyof T] === value,
    );
  }) as FilterMatch<T, U>[];
};
