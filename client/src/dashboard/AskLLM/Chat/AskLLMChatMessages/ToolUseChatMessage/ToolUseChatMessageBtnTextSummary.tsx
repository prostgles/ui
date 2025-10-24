import { isObject } from "prostgles-types";
import React, { useMemo } from "react";
import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";

export const ToolUseChatMessageBtnTextSummary = ({
  m,
}: {
  m: Extract<
    DBSSchema["llm_messages"]["message"][number],
    { type: "tool_use" }
  >;
}) => {
  const inputTextSummary = useMemo(() => {
    const maxLength = 50;
    if (isObject(m.input)) {
      const keys = Object.keys(m.input);
      const selectedKeys = keys.slice(0, 5);
      const args = selectedKeys
        .map((key) => {
          const value = m.input[key];
          const valueString =
            Array.isArray(value) || isObject(value) ?
              JSON.stringify(value)
            : value.toString();

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
