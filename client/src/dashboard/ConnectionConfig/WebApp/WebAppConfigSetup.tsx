import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FileBrowser } from "@components/FileBrowser/FileBrowser";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import Loading from "@components/Loader/Loading";
import PopupMenu from "@components/PopupMenu";
import { mdiFolderOutline } from "@mdi/js";
import React from "react";
import type { useWebAppConfigState } from "./hooks/useWebAppConfigState";

export const WebAppConfigSetup = ({
  connection,
  isLoading,
  error,
  didChange,
  edits,
  setEdits,
  usersTableError,
  usedPorts,
  connectionId,
  web_app_directory,
  dbs,
}: ReturnType<typeof useWebAppConfigState>) => {
  const { onErrorAlert } = useOnErrorAlert();

  if (!connection) {
    return <Loading />;
  }
  if (error) {
    return <ErrorComponent error={error} />;
  }

  const directory = edits?.web_app_directory ?? web_app_directory;
  const { port } = connection;

  const webAppUrl =
    !web_app_directory || !port ?
      undefined
    : `${location.protocol}//${location.hostname}:${port}`;
  return (
    <>
      {webAppUrl && <a href={webAppUrl}>{webAppUrl}</a>}
      {isLoading && <Loading />}
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
                label: "Select directory",
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
      <FormFieldDebounced
        type="integer"
        label={"Port"}
        value={port || undefined}
        hint={`Used ports: ${usedPorts?.filter((p) => p !== port).join(", ")}`}
        onChange={(newPort) => {
          void onErrorAlert(async () => {
            await dbs.connections.update(
              { id: connectionId },
              { port: newPort || null },
            );
          });
        }}
      />
      {usersTableError && web_app_directory && (
        <ErrorComponent error={usersTableError} />
      )}
    </>
  );
};
