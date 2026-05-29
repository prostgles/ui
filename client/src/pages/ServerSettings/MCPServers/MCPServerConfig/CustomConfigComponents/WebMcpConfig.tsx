import { isDefined } from "@common/filterUtils";
import { webMcpConfigSchema } from "@common/mcp/web.mcp.schema";
import Btn from "@components/Btn";
import ButtonGroup from "@components/ButtonGroup";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiDelete, mdiPlus } from "@mdi/js";
import React from "react";
import { useJSONBParsedData } from "src/dashboard/AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/common/useJSONBParsedData";
import { CodeEditor } from "src/dashboard/CodeEditor/CodeEditor";

type P = {
  value: unknown;
  onChange: (value: unknown) => void;
};

export const WebMcpConfig = ({ value: rawValue, onChange }: P) => {
  const { data } = useJSONBParsedData(rawValue, webMcpConfigSchema.access);

  const {
    mode = "allow",
    urls = [],
    blockInternalSubnets = true,
    internalSubnets = [],
  } = data ?? {};

  const onPartialUpdate = (newData: Partial<typeof data>) => {
    const updatedData = {
      mode,
      urls,
      blockInternalSubnets,
      internalSubnets,
      ...newData,
    };
    onChange(updatedData);
  };

  return (
    <FlexCol>
      <ButtonGroup
        label={{ variant: "normal", label: "Mode" }}
        options={["allow", "deny", "unrestricted"]}
        value={mode}
        onChange={(newMode) => {
          onPartialUpdate({
            mode: newMode,
          });
        }}
      />
      {mode !== "unrestricted" && (
        <>
          {urls.length ?
            <div className="ta-start">URL patterns to {mode}:</div>
          : <InfoRow color="info">
              {mode === "allow" ?
                "No URL patterns means nothing is allowed"
              : "No URL patterns means any URL is allowed" +
                (blockInternalSubnets && internalSubnets.length ?
                  ", except for blocked subnets"
                : "")
              }
            </InfoRow>
          }

          {urls.map((urlPattern, index) => {
            return (
              <FormField
                key={index}
                type="text"
                placeholder="E.g.: https://*.gstatic.com/ or example.com or *.example.com"
                value={urlPattern}
                onChange={(newPattern) => {
                  onPartialUpdate({
                    urls: urls
                      .map((p, i) => {
                        return (
                          i === index ?
                            newPattern === "" ?
                              undefined
                            : newPattern
                          : p
                        );
                      })
                      .filter(isDefined),
                  });
                }}
                rightIcons={
                  <Btn
                    iconPath={mdiDelete}
                    style={{
                      padding: "10px",
                    }}
                    onClick={() => {
                      onPartialUpdate({
                        urls: urls.filter((_, i) => i !== index),
                      });
                    }}
                  />
                }
              />
            );
          })}
          <Btn
            onClick={() => {
              onPartialUpdate({
                urls: [...urls, ""],
              });
            }}
            variant="filled"
            color="action"
            iconPath={mdiPlus}
          >
            Add URL pattern
          </Btn>
          <SwitchToggle
            label="Block internal subnets"
            variant="row"
            checked={blockInternalSubnets}
            onChange={(blockInternalSubnets) => {
              onPartialUpdate({
                blockInternalSubnets,
              });
            }}
          />
          {blockInternalSubnets && (
            <CodeEditor
              contentTop={
                <div className="p-p5 bg-color-1 ta-start">
                  Internal subnets (CIDR notation)
                </div>
              }
              className="o-hidden"
              language={{
                lang: "json",
                jsonSchemas: [
                  {
                    id: "prgl.internalSubnets",
                    schema: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                  },
                ],
              }}
              value={JSON.stringify(internalSubnets, null, 2)}
              onChange={(newBlockedSubnets) => {
                onPartialUpdate({
                  blockInternalSubnets: true,
                  internalSubnets: JSON.parse(newBlockedSubnets) as string[],
                });
              }}
            />
          )}
        </>
      )}
    </FlexCol>
  );
};
