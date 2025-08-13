export const getLLMMessageText = ({ message, }) => {
    var _a, _b;
    if (typeof message === "string")
        return message;
    const textMessages = filterArr(message, { type: "text" });
    const text = textMessages.map((m) => m.text).join("\n");
    const toolsUsed = getLLMMessageToolUse({ message }).map((m) => m.name);
    const toolsResponse = getLLMMessageToolUseResult({ message })[0];
    const toolResponseText = typeof (toolsResponse === null || toolsResponse === void 0 ? void 0 : toolsResponse.content) === "string" ?
        toolsResponse.content
        : (_b = filterArr((_a = toolsResponse === null || toolsResponse === void 0 ? void 0 : toolsResponse.content) !== null && _a !== void 0 ? _a : [], { type: "text" })[0]) === null || _b === void 0 ? void 0 : _b.text;
    return [
        toolsUsed.length ? `**Tools used: ${toolsUsed.join(", ")}**` : null,
        toolsResponse ?
            (toolsResponse.is_error ? `**Tool use error**` : (`**Tool ${toolsUsed.join(", ")} response**`)) + `\n\n${toolResponseText}`
            : null,
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
    const patternEntries = Object.entries(pattern);
    return arr.filter((item) => {
        return patternEntries.every(([key, value]) => item[key] === value);
    });
};
export const findArr = (arr, pattern) => {
    const patternEntries = Object.entries(pattern);
    return arr.find((item) => {
        return patternEntries.every(([key, value]) => item[key] === value);
    });
};
export const filterArrInverse = (arr, pattern) => {
    const patternEntries = Object.entries(pattern);
    return arr.filter((item) => {
        return patternEntries.every(([key, value]) => item[key] !== value);
    });
};
export const LLM_PROMPT_VARIABLES = {
    PROSTGLES_SOFTWARE_NAME: "${prostglesSoftwareName}",
    SCHEMA: "${schema}",
    DASHBOARD_TYPES: "${dashboardTypes}",
    TODAY: "${today}",
};
export const reachedMaximumNumberOfConsecutiveToolRequests = (messages, limit, onlyFailed = false) => {
    const reversedMessages = messages.slice().reverse();
    let count = 0;
    for (let i = 0; i < reversedMessages.length; i = i + 2) {
        const message = reversedMessages[i];
        const nextMessage = reversedMessages[i + 1];
        if (!message || !nextMessage) {
            break; // No more pairs to check
        }
        const isToolUseResult = message.message.some((m) => m.type === "tool_result" && (!onlyFailed || m.is_error));
        const isToolUseRequest = isAssistantMessageRequestingToolUse(nextMessage);
        if (!isToolUseResult || !isToolUseRequest) {
            break;
        }
        count++;
    }
    if (count >= limit)
        return true;
    return false;
};
export const isAssistantMessageRequestingToolUse = (message) => {
    return Boolean(message && getLLMMessageToolUse(message).length);
};
