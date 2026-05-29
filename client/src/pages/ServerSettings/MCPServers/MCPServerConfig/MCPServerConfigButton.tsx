import { isObject, type DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { mdiCogOutline } from "@mdi/js";
import React from "react";
import {
  useMCPServerConfig,
  type MCPServerConfigProps,
} from "./MCPServerConfig";
import { sliceText } from "@common/utils";

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
          defaultConfig: undefined,
        });
      }}
      style={{ flexShrink: 1 }}
      size="micro"
      iconPath={mdiCogOutline}
      data-command="MCPServerConfigButton"
    >
      {Object.entries(schema).map(([key, { title }]) => {
        const value = existingConfig?.value[key];
        const displayValue = getMcpConfigValueAsString(value, undefined);

        return (
          <FlexRow
            key={key}
            title={title ?? key}
            className=" gap-p5 text-ellipsis ji-start"
          >
            {displayValue}
          </FlexRow>
        );
      })}
    </Btn>
  );
};

export const getMcpConfigValueAsString = (
  value: unknown,
  config_schema: DBSSchema["mcp_servers"]["config_schema"] | undefined,
): string => {
  const isLocalSchema = Object.values(config_schema ?? {}).some(
    (field) => field.type === "local",
  );
  const displayValue =
    typeof value === "string" ? value
    : Array.isArray(value) ?
      !value.length ? "(empty)"
      : value.length > 5 ? `(${value.length} items)`
      : sliceText(value.join(", \n"), 100)
    : isObject(value) ?
      Object.entries(value)
        .map(([k, v], _, arr) => {
          const valueAsString = getMcpConfigValueAsString(v, undefined);
          if (isLocalSchema && arr.length === 1) {
            /** Omit first key */
            return valueAsString;
          }
          return `${k}: ${valueAsString}`;
        })
        .join(", \n")
    : JSON.stringify(value);
  return displayValue;
};
