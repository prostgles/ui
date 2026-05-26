import { sliceText } from "@common/utils";
import { isObject } from "prostgles-types";
import React, { useMemo } from "react";
import type { ToolUseMessage } from "./ToolUseChatMessage";

export const ToolUseChatMessageBtnTextSummary = ({
  m,
}: {
  m: ToolUseMessage;
}) => {
  const inputTextSummary = useMemo(() => {
    const maxLength = 50;
    const input = m.input;
    if (isObject(input)) {
      const keys = Object.keys(input);
      const selectedKeys = keys.slice(0, 5);
      const args = selectedKeys
        .map((key) => {
          const value = input[key];
          const valueString =
            Array.isArray(value) || isObject(value) ?
              JSON.stringify(value)
            : (value as number).toString();

          return `${key}: ${sliceText(valueString, Math.round(maxLength / selectedKeys.length), undefined, true)}`;
        })
        .join(", ");
      return ` ${args}`;
    }
    return sliceText(JSON.stringify(m.input), maxLength, undefined, true);
  }, [m]);

  return (
    <>
      {inputTextSummary && (
        <span
          className="text-ellipsis"
          style={{ fontWeight: "normal", opacity: 0.75 }}
        >
          {inputTextSummary}
        </span>
      )}
    </>
  );
};
