import React, { useCallback, useState } from "react";
import type { DBSSchema } from "../../../../../../commonTypes/publishUtils";
import Btn from "../../../../components/Btn";
import ErrorComponent from "../../../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../../../components/Flex";
import FormField from "../../../../components/FormField/FormField";
import Popup from "../../../../components/Popup/Popup";
import type { DBS } from "../../../../dashboard/Dashboard/DBS";
import { useEditableData } from "../../useEditableData";

export type MCPServerConfigProps = {
  dbs: DBS;
  serverName: string;
  existingConfig: { id: number; value: Record<string, string> } | undefined;
  onDone: () => void;
};

export const MCPServerConfig = (props: MCPServerConfigProps) => {
  const { serverName, existingConfig, dbs, onDone } = props;
  const {
    error,
    onSave,
    setValue,
    value: config,
  } = useEditableData(existingConfig?.value ?? {});

  const serverInfo = dbs.mcp_servers.useSubscribeOne(
    {
      name: serverName,
    },
    {},
    { skip: !serverName },
  );
  const schema = serverInfo.data?.config_schema;
  if (!schema) return null;

  return (
    <Popup
      title={`Configure and enable ${JSON.stringify(serverName)} MCP server`}
      positioning="center"
      onClose={onDone}
      data-command="MCPServerConfig"
      rootStyle={{
        maxWidth: "min(600px, 100vw)",
      }}
      clickCatchStyle={{ opacity: 1 }}
      footerButtons={[
        {
          label: "Cancel",
          onClick: onDone,
        },
        {
          label: existingConfig ? "Update" : "Enable",
          "data-command": "MCPServerConfig.save",
          disabledInfo: onSave ? undefined : "No changes",
          variant: "filled",
          color: "action",
          className: "ml-auto",
          onClickPromise: async () => {
            await onSave?.(async () => {
              if (existingConfig) {
                await dbs.mcp_server_configs.update(
                  {
                    id: existingConfig.id,
                  },
                  {
                    config,
                  },
                );
              } else {
                await dbs.mcp_server_configs.insert({
                  server_name: serverName,
                  config,
                });
                await dbs.mcp_servers.update(
                  {
                    name: serverName,
                  },
                  { enabled: true },
                );
              }
            })
              .then(() => {
                onDone();
              })
              .catch((e) => {});
          },
        },
      ]}
    >
      <FlexCol>
        {Object.entries(schema).map(([key, schema]) => (
          <FormField
            key={key}
            label={schema.title ?? key}
            hint={schema.description}
            value={config[key]}
            onChange={(v) =>
              setValue({
                ...config,
                [key]: v,
              })
            }
          />
        ))}
        {error && <ErrorComponent error={error} />}
      </FlexCol>
    </Popup>
  );
};
