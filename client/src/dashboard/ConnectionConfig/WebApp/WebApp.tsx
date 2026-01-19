import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FileBrowser } from "@components/FileBrowser/FileBrowser";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import Loading from "@components/Loader/Loading";
import { FooterButtons } from "@components/Popup/FooterButtons";
import PopupMenu from "@components/PopupMenu";
import { mdiCheck, mdiClose, mdiFolderOutline } from "@mdi/js";
import { pickKeys } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { DBS } from "src/dashboard/Dashboard/DBS";
import { areEqual, isEmpty } from "src/utils/utils";

type P = {
  connectionId: string;
  dbs: DBS;
};
export const WebApp = ({ dbs, connectionId }: P) => {
  const {
    data: connection,
    isLoading,
    error,
  } = dbs.connections.useSubscribeOne({
    id: connectionId,
  });
  const { onErrorAlert } = useOnErrorAlert();

  const { web_app_directory, web_app_port } = connection ?? {};
  const [edits, setEdits] = useState(
    connection &&
      pickKeys(connection as Partial<typeof connection>, [
        "web_app_directory",
        "web_app_port",
      ]),
  );
  const didChange = useMemo(
    () =>
      connection &&
      edits &&
      !isEmpty(edits) &&
      !areEqual(connection, edits, ["web_app_directory", "web_app_port"]),
    [connection, edits],
  );
  const directory = edits?.web_app_directory ?? web_app_directory;
  const port = edits?.web_app_port ?? web_app_port;

  const webAppUrl =
    web_app_port ?
      `${location.protocol}//${location.hostname}:${web_app_port}`
    : undefined;

  return (
    <FlexCol>
      <h2>Web app setup</h2>
      {webAppUrl && <a href={webAppUrl}>{webAppUrl}</a>}
      {isLoading && <Loading />}
      {connection && (
        <>
          <FormField
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
          />
          <PopupMenu
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
          {directory && (
            <FooterButtons
              className="mt-2"
              footerButtons={[
                {
                  label: "Start web app",
                  variant: "filled",
                  color: "action",
                  disabledInfo:
                    !port ? "Must set port"
                    : !directory ? "Must set directory"
                    : undefined,
                  onClick: () => {
                    void onErrorAlert(async () => {
                      await dbs.services.insert({
                        name: "web_app_service",
                        default_port: port!,
                        icon: "ApplicationBracketsOutline",
                        label: "Web App Service",
                        status: "stopped",
                        configs: {
                          // web_app_directory: directory,
                          // web_app_port: port,
                          // connection_id: connectionId,
                        },
                      });
                    });
                  },
                },
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
