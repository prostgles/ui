import type { DBSSchema } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import { useOnErrorAlert } from "@components/AlertProvider";
import { Checkbox } from "@components/Checkbox";
import { FlexRow } from "@components/Flex";
import { pickKeys } from "prostgles-types";
import React, { useMemo } from "react";
import { isEmpty } from "src/utils/utils";

export const MCPServerToolsGroupToggle = ({
  tools,
  llm_chats_allowed_mcp_tools,
  onToggleTools,
}: {
  llm_chats_allowed_mcp_tools:
    | {
        tool_id: number;
        auto_approve: boolean | null;
      }[]
    | undefined;

  tools: DBSSchema["mcp_server_tools"][];
  onToggleTools: (
    toolIds: number[],
    action: "approve" | "remove",
  ) => Promise<void>;
}) => {
  const toggleableAnnotations = useMemo(() => {
    return tools.reduce((acc, { id, annotations }) => {
      if (!annotations || isEmpty(annotations)) return acc;
      const toggleable = pickKeys(annotations, ["readOnlyHint"]);
      getEntries(toggleable).forEach(([key, yes]) => {
        const existing = acc.get(key) ?? {
          no: [],
          yes: [],
        };
        if (yes === true) {
          existing.yes.push(id);
        } else if (yes === false) {
          existing.no.push(id);
        }

        acc.set(key, existing);
      });
      return acc;
    }, new Map<keyof NonNullable<(typeof tools)[number]["annotations"]>, { no: number[]; yes: number[] }>());
  }, [tools]);

  const { onErrorAlert } = useOnErrorAlert();

  return (
    <FlexRow>
      {toggleableAnnotations
        .entries()
        .toArray()
        .map(([annotationKey, annotationIds]) => {
          if (annotationKey !== "readOnlyHint") return null;
          const info = toggleableAnnotations.get(annotationKey);
          const allowedToolIds =
            llm_chats_allowed_mcp_tools?.map((at) => at.tool_id) || [];
          const yesChecked = allowedToolIds.some((toolId) =>
            info?.yes.includes(toolId),
          );
          const noChecked = allowedToolIds.some((toolId) =>
            info?.no.includes(toolId),
          );
          return (
            <React.Fragment key={annotationKey}>
              {[
                { label: "Read", checked: yesChecked, ids: annotationIds.yes },
                { label: "Write", checked: noChecked, ids: annotationIds.no },
              ].map(({ label, checked, ids }) => {
                return (
                  <Checkbox
                    key={label}
                    label={label}
                    title="Read Only"
                    style={{
                      fontWeight: 300,
                    }}
                    checked={checked}
                    variant="micro"
                    onChange={({ currentTarget: { checked: newChecked } }) => {
                      onErrorAlert(() =>
                        onToggleTools(ids, newChecked ? "approve" : "remove"),
                      );
                    }}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
    </FlexRow>
  );
};
