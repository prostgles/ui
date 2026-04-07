import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FileTree } from "@components/FileTree/FileTree";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import Loading from "@components/Loader/Loading";
import PopupMenu from "@components/PopupMenu";
import { mdiFolderOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { SQLSmartEditor } from "src/dashboard/SQLEditor/SQLSmartEditor";
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
}: ReturnType<typeof useWebAppConfigState>) => {
  const { sql, dbs } = usePrgl();
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
      {webAppUrl && (
        <a className="w-fit" href={webAppUrl}>
          {webAppUrl}
        </a>
      )}
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
        <FileTree
          rootPath={directory?.split("/").slice(0, -1).join("/")}
          checkBoxes={{
            type: "directory",
            radioMode: true,
            checkedItems: directory ? [directory] : [],
            onCheckedChange: (v) => {
              setEdits((oldVal) => ({ ...oldVal, web_app_directory: v[0] }));
            },
          }}
        />
      </PopupMenu>
      <FormFieldDebounced
        type="integer"
        label={"Port"}
        value={port || undefined}
        hint={`Used ports: ${usedPorts?.filter((p) => p && p !== port).join(", ")}`}
        onChange={(newPort) => {
          void onErrorAlert(async () => {
            await dbs.connections.update(
              { id: connectionId },
              { port: newPort || null },
            );
          });
        }}
      />
      {usersTableError && (
        <PopupMenu
          button={
            <Btn color="danger" variant="faded">
              {usersTableError.error}
            </Btn>
          }
          onClickClose={false}
          title="Ensure users table (id UUID, type TEXT) exists"
          render={(pClose) => (
            <SQLSmartEditor
              asPopup={false}
              query={usersTableError.query}
              sql={sql!}
              title=""
              onCancel={pClose}
              onSuccess={pClose}
            />
          )}
        />
      )}
    </>
  );
};
