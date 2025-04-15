import { mdiPlus } from "@mdi/js";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexRow } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import Popup from "../../../components/Popup/Popup";
import { ScrollFade } from "../../../components/SearchList/ScrollFade";
import { SwitchToggle } from "../../../components/SwitchToggle";
import { CodeEditorWithSaveButton } from "../../../dashboard/CodeEditor/CodeEditorWithSaveButton";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import {
  useAddMCPServer,
  type MCPServerConfig as MCPServerJSONConfig,
} from "./useAddMCPServer";

export const AddMCPServer = ({ dbs }: { dbs: DBS }) => {
  const [showAddServer, setShowAddServer] = React.useState(false);
  const state = useAddMCPServer(showAddServer);
  const { configSchemas, mcpServer, value, setValue, setConfigSchemas } = state;

  return (
    <>
      <Btn
        variant="filled"
        color="action"
        iconPath={mdiPlus}
        data-command="AddMCPServer.Open"
        onClick={() => setShowAddServer(true)}
      >
        Add MCP Server
      </Btn>
      {showAddServer && (
        <Popup
          data-command="AddMCPServer"
          positioning="top-center"
          title="Add MCP Server"
          clickCatchStyle={{ opacity: 1 }}
          contentStyle={{
            minWidth: "min(600px, 100vw)",
            minHeight: "min(500px, 100vh)",
          }}
          contentClassName="f-1 p-2"
          onClose={() => setShowAddServer(false)}
          footerButtons={[
            {
              label: "Close",
              onClickClose: true,
            },
            {
              label: "Add MCP Server",
              color: "action",
              variant: "filled",
              className: "ml-auto",
              "data-command": "AddMCPServer.Add",
              disabledInfo:
                !mcpServer ? "Must provide a config"
                : !(dbs as any).mcp_servers?.insert ? "Must be admin"
                : undefined,
              onClickPromise:
                !mcpServer ? undefined : (
                  async () => {
                    await dbs.mcp_servers.insert(mcpServer);
                    setShowAddServer(false);
                  }
                ),
            },
          ]}
        >
          <p className="ta-start">
            Paste the JSON configuration of the MCP server you want to add
          </p>
          <CodeEditorWithSaveButton
            label=""
            language={"json"}
            options={{
              minimap: {
                enabled: false,
              },
              lineNumbers: "off",
              automaticLayout: true,
            }}
            codePlaceholder={JSON.stringify(exampleConfig, null, 2)}
            autoSave={true}
            value={value}
            onSave={setValue}
          />
          {Boolean(configSchemas?.length) && (
            <ScrollFade
              className="py-1 o-auto flex-col gap-1"
              style={{ maxHeight: "400px" }}
            >
              <p className="ta-start">
                Specify if any of the arguments or environment variables are
                configurable
              </p>
              {configSchemas?.map((s, schemaIndex) => {
                const update = (changes: Partial<typeof s>) => {
                  const newSchemas = configSchemas.map((oldS, oldIndex) => {
                    if (oldIndex === schemaIndex) {
                      return {
                        ...oldS,
                        ...changes,
                      } as typeof s;
                    }
                    return oldS;
                  });
                  setConfigSchemas(newSchemas);
                };

                return (
                  <FlexRow key={s.name + schemaIndex}>
                    <FormField
                      className="f-1"
                      label={`${s.name} (${s.type === "arg" ? `arg ${s.index}` : "env"})`}
                      value={s.description}
                      placeholder="Description"
                      onChange={(description) =>
                        update({ description, configurable: true })
                      }
                    />
                    <SwitchToggle
                      data-key={s.name}
                      label={"Is configurable"}
                      checked={!!s.configurable}
                      variant="col"
                      onChange={(configurable) => update({ configurable })}
                    />
                  </FlexRow>
                );
              })}
            </ScrollFade>
          )}
        </Popup>
      )}
    </>
  );
};

const exampleConfig: MCPServerJSONConfig = {
  mcpServers: {
    github: {
      command: "docker",
      args: [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server",
      ],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
      },
    },
  },
};
