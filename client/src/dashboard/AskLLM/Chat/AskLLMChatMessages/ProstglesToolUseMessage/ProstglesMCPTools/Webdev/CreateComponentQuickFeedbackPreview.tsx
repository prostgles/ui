import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { CodeFileBrowser } from "@components/CodeFileBrowser/CodeFileBrowser";
import { CompactTabs } from "@components/CompactTabs/CompactTabs";
import { FlexCol } from "@components/Flex";
import { MonacoLogs } from "@components/MonacoLogs/MonacoLogs";
import type { JSONB } from "prostgles-types";
import React from "react";
import { useWebAppConfigState } from "src/dashboard/ConnectionConfig/WebApp/hooks/useWebAppConfigState";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useTypedToolUseResultDataV2 } from "../common/useTypedToolUseResultData";
import ErrorComponent from "@components/ErrorComponent";

export const CreateComponentQuickFeedbackPreview = ({
  toolUseContent,
  resultContent,
}: Pick<ProstglesMCPToolsProps, "resultContent" | "toolUseContent">) => {
  const data = toolUseContent.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["webdev"]["create_component_quick_feedback_preview"]["schema"]["type"]
  >;

  const { webAppUrl } = useWebAppConfigState();

  const toolResultJson = useTypedToolUseResultDataV2(
    resultContent,
    {
      type: {
        log: {
          optional: true,
          arrayOfType: {
            type: "string",
            text: "string",
          },
        },
      },
    },
    true,
  );

  const logs = toolResultJson?.data?.log?.map(({ text }) => text).join("\n");

  if (!resultContent) {
    return <div>Validating component...</div>;
  }

  return (
    <CompactTabs
      titleWhenMinimised={"Component Quick Feedback"}
      maxHeight={"500px"}
      items={{
        Code: {
          label: "Code",
          content: (
            <FlexCol className="f-1">
              <CodeFileBrowser
                files={{
                  "Component.tsx": data.indexTsx,
                  ...(data.css ? { "Component.css": data.css } : {}),
                  ...(data.dependencies?.length ?
                    {
                      "dependencies.json": JSON.stringify(
                        data.dependencies,
                        null,
                        2,
                      ),
                    }
                  : {}),
                }}
                onChange={() => {}}
              />
              {logs && <MonacoLogs maxHeight={0} logs={logs} />}
            </FlexCol>
          ),
        },
        ...(!resultContent.is_error ?
          {
            Preview: {
              label: "Preview",
              disabledInfo: !webAppUrl ? "webAppUrl missing" : undefined,
              content: (
                <iframe
                  className="f-1 w-full h-full"
                  title="Web App Preview"
                  src={[
                    webAppUrl,
                    "component-preview",
                    "ComponentQuickFeedbackPreview",
                  ].join("/")}
                />
              ),
            },
          }
        : {}),
        ...(Boolean(resultContent.is_error || toolResultJson?.error) && {
          Error: {
            label: "Error",
            content: <ErrorComponent error={toolResultJson ?? resultContent} />,
          },
        }),
      }}
    />
  );
};
