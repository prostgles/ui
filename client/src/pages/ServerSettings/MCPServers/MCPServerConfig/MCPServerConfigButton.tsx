import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { mdiCogOutline } from "@mdi/js";
import React from "react";
import {
  useMCPServerConfig,
  type MCPServerConfigProps,
} from "./MCPServerConfig";

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
      size="micro"
      iconPath={mdiCogOutline}
      data-command="MCPServerConfigButton"
    >
      {Object.entries(schema).map(([key, schema]) => {
        const value = existingConfig?.value[key];
        const displayValue =
          typeof value === "string" ? value
          : Array.isArray(value) ? value.join(", \n")
          : "";
        return (
          <FlexRow
            key={key}
            title={schema.title ?? key}
            className=" gap-p5 text-ellipsis ji-start"
          >
            {displayValue}
          </FlexRow>
        );
      })}
    </Btn>
  );
};
