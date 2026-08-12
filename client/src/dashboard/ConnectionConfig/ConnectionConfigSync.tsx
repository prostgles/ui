import { getAgeFromDiff } from "@common/utils";
import Btn from "@components/Btn";
import { ProjectCodeEditor } from "@components/CodeFileBrowser/ProjectCodeEditor";
import { FileTree } from "@components/FileTree/FileTree";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import PopupMenu from "@components/PopupMenu";
import { mdiFolderOutline } from "@mdi/js";
import { omitKeys } from "prostgles-types";
import React, { useState } from "react";
import { usePrgl } from "../../pages/ProjectConnection/PrglContextProvider";
import { getIntervalAsText } from "../W_SQL/customRenderers";

export const ConnectionConfigSync = () => {
  const prgl = usePrgl();
  const {
    dbs,
    dbsMethods: { syncSchema },
    connectionId,
  } = prgl;

  const [unsavedPath, setUnsavedPath] = useState<string | undefined>(undefined);
  const { data: dbConf } = dbs.database_configs.useSubscribeOne({
    $existsJoined: {
      connections: { id: connectionId },
    },
  });

  const { config_sync } = dbConf || {};
  const mustSave =
    unsavedPath && dbConf && unsavedPath !== config_sync?.configPath;

  const configPath = unsavedPath ?? config_sync?.configPath;
  const title = "Schema Config Project";
  const lastSyncedInterval =
    config_sync?.lastSynced ?
      getAgeFromDiff(Date.now() - new Date(config_sync.lastSynced).getTime())
    : undefined;
  const lastSyncedAgo =
    lastSyncedInterval ?
      getIntervalAsText(omitKeys(lastSyncedInterval, ["milliseconds"])).join(
        ", ",
      )
    : undefined;
  return (
    <FlexCol>
      <FlexRowWrap className="ConnectionConfigSync h-fit">
        <PopupMenu
          title={title}
          headerRightContent={
            <InfoRow className="p-p25 mr-p5">Read-only Node.js project</InfoRow>
          }
          positioning="center"
          clickCatchStyle={{ opacity: 1 }}
          onClickClose={false}
          footerButtons={[
            {
              label: "Done",
              color: "action",
              onClickClose: true,
              variant: "filled",
              "data-command": "UserInput.Done",
              className: "ml-auto",
            },
          ]}
          button={
            <Btn
              variant="faded"
              iconPath={mdiFolderOutline}
              color={"action"}
              label={{
                label: title + " (Read-Only)",
                style: {
                  lineHeight: "1em",
                  fontWeight: "normal",
                  fontSize: "inherit",
                  color: "var(--text-1)",
                  marginBottom: "0.25em",
                },
              }}
            >
              {configPath || "Select project folder..."}
            </Btn>
          }
          render={(pClose) => (
            <FileTree
              mode="pick-one"
              type="directory"
              onChange={setUnsavedPath}
              value={configPath}
            />
          )}
        />
        <Btn
          label={
            !lastSyncedAgo ? undefined : (
              {
                variant: "normal",
                label: `Last synced: ${lastSyncedAgo} ago`,
              }
            )
          }
          color="action"
          variant="filled"
          disabledInfo={
            !syncSchema ? "Not allowed to sync schema"
            : !configPath ?
              "No schema path selected"
            : undefined
          }
          onClickPromise={async () => {
            await syncSchema!({ connectionId, configPath: configPath! });
          }}
        >
          {mustSave ? "Save and sync" : "Sync now"}
        </Btn>
      </FlexRowWrap>
      {config_sync && (
        <ProjectCodeEditor title=" " projectPath={config_sync.configPath} />
      )}
    </FlexCol>
  );
};
