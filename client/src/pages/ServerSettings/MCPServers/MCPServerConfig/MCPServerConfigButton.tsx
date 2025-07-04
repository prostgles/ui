import React from "react";
import type { DBSSchema } from "../../../../../../commonTypes/publishUtils";
import Btn from "../../../../components/Btn";
import { FlexRow } from "../../../../components/Flex";
import {
  MCPServerConfig,
  useMCPServerConfig,
  type MCPServerConfigProps,
} from "./MCPServerConfig";

export const MCPServerConfigButton = (
  props: Omit<MCPServerConfigProps, "onDone" | "variant"> & {
    schema: NonNullable<DBSSchema["mcp_servers"]["config_schema"]>;
  },
) => {
  const { schema, existingConfig, serverName } = props;
  const { setServerToConfigure } = useMCPServerConfig();
  return (
    <Btn
      onClick={() => {
        setServerToConfigure({
          existingConfig,
          serverName,
        });
      }}
      style={{ flexShrink: 1 }}
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
