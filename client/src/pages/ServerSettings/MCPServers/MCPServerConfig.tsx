import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import ErrorComponent from "../../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import Popup from "../../../components/Popup/Popup";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import { useEditableData } from "../useEditableData";

type P = {
  dbs: DBS;
  serverName: string;
  schema: NonNullable<DBSSchema["mcp_servers"]["config_schema"]>;
  existingConfig: { id: number; value: Record<string, string> } | undefined;
  onDone: () => void;
};
export const MCPServerConfig = ({
  serverName,
  existingConfig,
  schema,
  dbs,
  onDone,
}: P) => {
  const {
    error,
    onSave,
    setValue,
    value: config,
  } = useEditableData(existingConfig?.value ?? {});

  return (
    <Popup
      title={`Configure and enable ${JSON.stringify(serverName)} MCP server`}
      positioning="center"
      onClose={onDone}
      clickCatchStyle={{ opacity: 1 }}
      footerButtons={[
        {
          label: "Cancel",
          onClick: onDone,
        },
        {
          label: existingConfig ? "Update" : "Enable",
          disabledInfo: onSave ? undefined : "No changes",
          variant: "filled",
          color: "action",
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
            });
            onDone();
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

export const MCPServerConfigButton = (props: Omit<P, "onDone">) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement>();
  const { schema, existingConfig } = props;
  return (
    <>
      <Btn
        onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
        style={{ flexShrink: 1 }}
      >
        {Object.entries(schema).map(([key, schema]) => (
          <FlexRow
            key={key}
            title={schema.title ?? key}
            className="font-12 gap-p5 text-ellipsis ji-start"
          >
            {/* <div className="font-10">{schema.title ?? key}</div> */}
            <div className="bold">{existingConfig?.value[key]}</div>
          </FlexRow>
        ))}
      </Btn>
      {anchorEl && (
        <MCPServerConfig {...props} onDone={() => setAnchorEl(undefined)} />
      )}
    </>
  );
};
