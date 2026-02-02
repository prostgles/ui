import Btn from "@components/Btn";
import { WebAppFileBrowser } from "@components/CodeFileBrowser/WebAppFileBrowser";
import ErrorComponent from "@components/ErrorComponent";
import { FileBrowser } from "@components/FileBrowser/FileBrowser";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import PopupMenu from "@components/PopupMenu";
import Tabs from "@components/Tabs";
import { mdiFolderOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { pickKeys } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { areEqual, isEmpty } from "src/utils/utils";
import { WebAppConfigComponents } from "./WebAppConfigComponents";
import { WebAppConfigFooterActions } from "./WebAppConfigFooterActions";

export const WebAppConfig = () => {
  const { connectionId, dbs } = usePrgl();
  const {
    data: connection,
    isLoading,
    error,
  } = dbs.connections.useSubscribeOne({
    id: connectionId,
  });

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
  if (!connection) {
    return <Loading />;
  }
  return (
    <FlexCol className="f-1">
      {webAppUrl && <a href={webAppUrl}>{webAppUrl}</a>}
      {isLoading && <Loading />}
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
        <Tabs
          className="f-1 w-full"
          contentClass="f-1 py-1 min-h-0"
          defaultActiveKey="Preview"
          items={{
            Preview: {
              content: (
                <iframe
                  className="f-1 w-full h-full"
                  title="Web App Preview"
                  src={webAppUrl}
                />
              ),
            },
            Components: {
              hide: !web_app_templated,
              content: <WebAppConfigComponents webAppUrl={webAppUrl} />,
            },
            Files: {
              content: <WebAppFileBrowser connection={connection} />,
            },
            Tests: {
              hide: !web_app_templated,
              content: <div>Tests go here</div>,
            },
          }}
        />

        <WebAppConfigFooterActions connection={connection} />
      </>
      <ErrorComponent error={error} />
    </FlexCol>
  );
};
console.error("FINISH");
