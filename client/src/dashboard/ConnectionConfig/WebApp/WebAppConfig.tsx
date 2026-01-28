import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FileBrowser } from "@components/FileBrowser/FileBrowser";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import {
  FooterButtons,
  type FooterButtonsProps,
} from "@components/Popup/FooterButtons";
import PopupMenu from "@components/PopupMenu";
import { mdiFolderOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import { pickKeys } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { areEqual, isEmpty } from "src/utils/utils";

export const WebAppConfig = () => {
  const {
    connectionId,
    dbs,
    dbsMethods: { buildWebApp, testWebApp, createWebAppFromTemplate, glob },
  } = usePrgl();
  const {
    data: connection,
    isLoading,
    error,
  } = dbs.connections.useSubscribeOne({
    id: connectionId,
  });
  const { onErrorAlert } = useOnErrorAlert();

  const { web_app_directory, web_app_port, web_app_templated } =
    connection ?? {};
  const [edits, setEdits] = useState(
    connection &&
      pickKeys(connection as Partial<typeof connection>, [
        "web_app_directory",
        "web_app_port",
        "web_app_templated",
      ]),
  );
  const didChange = useMemo(
    () =>
      connection &&
      edits &&
      !isEmpty(edits) &&
      !areEqual(connection, edits, [
        "web_app_directory",
        "web_app_port",
        "web_app_templated",
      ]),
    [connection, edits],
  );
  const directory = edits?.web_app_directory ?? web_app_directory;
  const port = edits?.web_app_port ?? web_app_port;

  const webAppUrl = `${location.protocol}//${location.hostname}:${port ?? connection?.port}`;

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

  return (
    <FlexCol>
      {webAppUrl && <a href={webAppUrl}>{webAppUrl}</a>}
      {isLoading && <Loading />}
      {connection && (
        <>
          <PopupMenu
            data-command="WebApp.directory"
            button={
              <Btn
                label={{
                  label: "Directory",
                  variant: "normal",
                  className: "mb-p5",
                }}
                variant="faded"
                iconPath={mdiFolderOutline}
              >
                {directory ?? "Set diretory ..."}
              </Btn>
            }
            onClickClose={false}
            onClose={() => setEdits(undefined)}
            footerButtons={(pClose) =>
              !didChange || !edits ?
                []
              : [
                  {
                    label: "Cancel",
                    onClickClose: true,
                  },
                  {
                    label: "Update",
                    className: "ml-auto",
                    variant: "filled",
                    color: "action",
                    onClickPromise: async (e) => {
                      await dbs.connections.update({ id: connectionId }, edits);
                      pClose?.(e);
                    },
                  },
                ]
            }
          >
            <FileBrowser
              path={directory || undefined}
              onChange={(newDir) =>
                setEdits((oldVal) => ({ ...oldVal, web_app_directory: newDir }))
              }
            />
          </PopupMenu>
          {/* <FormField
            type="integer"
            label={"Port"}
            value={port || undefined}
            onChange={(newPort) => {
              setEdits((v) => ({ ...v, web_app_port: newPort }));
            }}
            rightIcons={
              didChange && (
                <>
                  <Btn
                    iconPath={mdiClose}
                    onClick={() => setEdits(undefined)}
                  />
                  <Btn
                    iconPath={mdiCheck}
                    onClick={() => {
                      void onErrorAlert(async () => {
                        await dbs.connections.update(
                          { id: connectionId },
                          { web_app_port: port },
                        );
                      });
                    }}
                  />
                </>
              )
            }
          /> */}
          {directory && (
            <FooterButtons
              className="mt-2"
              style={{
                padding: "1em 0",
              }}
              footerButtons={[
                {
                  label:
                    dirNotEmpty ?
                      "Re-create from template"
                    : "Create from template",
                  variant: "filled",
                  color: "action",
                  disabledInfo: dirNotEmpty ? undefined : cannotTemplateError,
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
                      //     // web_app_port: port,
                      //     // connection_id: connectionId,
                      //   },
                      // });
                    });
                  },
                },
                ...(connection.web_app_templated ?
                  ([
                    {
                      label: "Build",
                      variant: "filled",
                      color: "action",
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
                      onClickPromise: async () => {
                        await onErrorAlert(async () => {
                          const result = await testWebApp!({
                            connectionId,
                          });
                          console.log("Docker test result: ", result);
                          if (result.state === "error") {
                            throw result.log;
                          }
                        });
                      },
                    },
                    {
                      label: "Open in browser",
                      variant: "filled",
                      color: "action",
                      onClick: () => {
                        window.open(webAppUrl, "_blank");
                      },
                    },
                  ] satisfies FooterButtonsProps["footerButtons"])
                : []),
              ]}
            />
          )}
        </>
      )}
      <ErrorComponent error={error} />
    </FlexCol>
  );
};
console.error("FINISH");
