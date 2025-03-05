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
            (toolsResponse.is_error ? `**Tool use error**` : (`**Tool result response**`)) + `\n\n${toolResponseText}`
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
