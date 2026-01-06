import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import React from "react";
import {
  useMCPServerConfig,
  type MCPServerConfigProps,
} from "./MCPServerConfig";
import { mdiCog } from "@mdi/js";

export const MCPServerConfigButton = (
  props: Omit<MCPServerConfigProps, "onDone" | "variant"> & {
    schema: NonNullable<DBSSchema["mcp_servers"]["config_schema"]>;
  },
) => {
  const { schema, existingConfig, serverName, chatId } = props;
  const { setServerToConfigure } = useMCPServerConfig();
  return (
    <Btn
      onClick={() => {
        void setServerToConfigure({
          existingConfig,
          serverName,
          chatId,
        });
      }}
      style={{ flexShrink: 1 }}
      iconPath={mdiCog}
      data-command="MCPServerConfigButton"
    >
      {Object.entries(schema).map(([key, schema]) => (
        <FlexRow
          key={key}
          title={schema.title ?? key}
          className="font-12 gap-p5 text-ellipsis ji-start"
        >
          <div className="bold">{existingConfig?.value[key]}</div>
        </FlexRow>
      ))}
    </Btn>
  );
};
