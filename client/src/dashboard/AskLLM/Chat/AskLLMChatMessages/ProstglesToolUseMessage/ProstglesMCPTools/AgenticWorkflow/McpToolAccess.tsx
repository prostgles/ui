import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { Label } from "@components/Label";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { SvgIcon } from "@components/SvgIcon";
import { mdiTools } from "@mdi/js";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import React from "react";
import { HeaderSection } from "@components/HeaderSection";

type P = {
  title: string;
  value: NonNullable<
    DBSSchema["agentic_workflows"]["definition_data"]["orchestrationTools"]
  >;
};
export const McpToolAccess = ({ value, title }: P) => {
  const { mcpServerIcons } = useMcpServerIcons();

  return (
    <HeaderSection title={title}>
      <ScrollFade
        title={title}
        className="flex-col gap-p5 oy-auto py-p25"
        style={{ maxHeight: "100px" }}
      >
        {Object.entries(value).map(([mcpServerName, toolNameObj = {}]) => {
          const icon = mcpServerIcons.get(mcpServerName);
          const toolNames = Object.keys(toolNameObj);
          return (
            <FlexRowWrap
              key={mcpServerName}
              title={toolNames.join(", ")}
              style={{ display: "inline-flex" }}
              className="gap-p25"
            >
              <FlexRow className="f-0 w-fit gap-p25">
                {icon ?
                  <SvgIcon icon={icon} className="text-1 f-0" />
                : <Icon path={mdiTools} sizeName="micro" className="text-1" />}
                <strong>{mcpServerName}:</strong>
              </FlexRow>
              <span style={{ fontWeight: "normal" }}>
                {sliceText(toolNames.join(", "), 50)}
              </span>
            </FlexRowWrap>
          );
        })}
      </ScrollFade>
    </HeaderSection>
  );
};
