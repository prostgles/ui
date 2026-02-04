import type { DBSSchema } from "@common/publishUtils";
import { useOnErrorAlert } from "@components/AlertProvider";
import {
  FooterButtons,
  type FooterButtonsProps,
} from "@components/Popup/FooterButtons";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import React from "react";
import type { useWebAppConfigActiveSection } from "./hooks/useWebAppConfigActiveSection";

export const WebAppConfigFooterActions = ({
  connection,
  setParams,
}: {
  connection: DBSSchema["connections"];
  setParams: ReturnType<typeof useWebAppConfigActiveSection>["setParams"];
}) => {
  const {
    connectionId,
    dbsMethods: { buildWebApp, testWebApp, createWebAppFromTemplate, glob },
  } = usePrgl();

  const { onErrorAlert } = useOnErrorAlert();

  const { web_app_directory, web_app_templated, port } = connection;

  const cannotTemplateError = usePromise(async () => {
    if (!web_app_directory) return "No directory set";
    if (web_app_templated) return "Already templated";
    const existingFiles = await glob?.({ path: web_app_directory });
    if (!existingFiles) return "Cannot access directory";
    return existingFiles.result.length === 0 ?
        undefined
      : "Directory not empty";
  }, [glob, web_app_directory, web_app_templated]);

  const dirNotEmpty =
    cannotTemplateError === "Directory not empty" ||
    cannotTemplateError === "Already templated";

  if (!web_app_directory) return;
  return (
    <FooterButtons
      className="mt-2"
      style={{
        padding: "1em 0",
      }}
      footerButtons={[
        {
          label:
            dirNotEmpty ? "Re-create from template" : "Create from template",
          variant: "filled",
          color: "action",
          "data-command": "WebAppConfig.createFromTemplate",
          disabledInfo:
            !connection.port ? "Must set port first"
            : dirNotEmpty ? undefined
            : cannotTemplateError,
          clickConfirmation:
            dirNotEmpty ?
              {
                message:
                  "This will overwrite existing files in the directory. Are you sure you want to continue?",
                buttonText: "Yes, create from template",
                color: "danger",
              }
            : undefined,
          onClickPromise: async () => {
            await onErrorAlert(async () => {
              await createWebAppFromTemplate?.({
                connectionId,
                clean: dirNotEmpty,
              });
              // await dbs.services.insert({
              //   name: "web_app_service",
              //   default_port: port!,
              //   icon: "ApplicationBracketsOutline",
              //   label: "Web App Service",
              //   status: "stopped",
              //   configs: {
              //     // web_app_directory: directory,
              //     // connection_id: connectionId,
              //   },
              // });
            });
          },
        },
        ...(web_app_templated && port ?
          ([
            {
              label: "Build",
              variant: "filled",
              color: "action",
              "data-command": "WebAppConfig.build",
              onClickPromise: async () => {
                await onErrorAlert(async () => {
                  const result = await buildWebApp!({
                    connectionId,
                  });
                  console.log("Docker build result: ", result);
                  if (result.state === "error") {
                    throw result.log;
                  }
                });
              },
            },
            {
              label: "Test",
              variant: "filled",
              color: "action",
              "data-command": "WebAppConfig.test",
              onClickPromise: async () => {
                await onErrorAlert(async () => {
                  const result = await testWebApp!({
                    connectionId,
                  });
                  setParams({ web_config_section: "Tests" });
                  console.log("Docker test result: ", result);
                  if (result.state === "error") {
                    throw result.log;
                  }
                });
              },
            },
          ] satisfies FooterButtonsProps["footerButtons"])
        : []),
      ]}
    />
  );
};
