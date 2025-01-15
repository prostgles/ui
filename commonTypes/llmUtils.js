export const getLLMMessageText = ({ message, }) => {
    if (typeof message === "string")
        return message;
    const textMessages = filterArr(message, { type: "text" });
    const text = textMessages.map((m) => m.text).join("\n");
    const toolsUsed = getLLMMessageToolUse({ message }).map((m) => m.name);
    const toolsResponses = getLLMMessageToolUseResult({ message }).map((m) => m.is_error);
    return [
        toolsUsed.length ? `**Tools used: ${toolsUsed.join(", ")}**` : null,
        toolsResponses.length ? `**Tool result response**` : null,
        text,
    ]
        .filter((v) => v)
        .join("\n");
};
export const getLLMMessageToolUse = ({ message, }) => {
    if (typeof message === "string")
        return [];
    return filterArr(message, { type: "tool_use" });
};
export const getLLMMessageToolUseResult = ({ message, }) => {
    if (typeof message === "string")
        return [];
    return filterArr(message, { type: "tool_result" });
};
export const filterArr = (arr, pattern) => {
    return arr.filter((item) => {
        return Object.entries(pattern).every(([key, value]) => item[key] === value);
    });
};
