import Btn from "@components/Btn";
import { FileTree } from "@components/FileTree/FileTree";
import { FlexCol, FlexRow } from "@components/Flex";
import React, { useState } from "react";
import { usePrgl } from "../../pages/ProjectConnection/PrglContextProvider";
import PopupMenu from "@components/PopupMenu";
import { InfoRow } from "@components/InfoRow";
import { mdiFolderOutline } from "@mdi/js";

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
    unsavedPath && dbConf && unsavedPath !== config_sync?.schemaPath;

  const schemaPath = unsavedPath ?? config_sync?.schemaPath;
  const title = "Schema Config Project";
  return (
    <FlexCol className="ConnectionConfigSync">
      <PopupMenu
        title={title}
        headerRightContent={
          <InfoRow className="p-p25 mr-p5">
            Read-only Node.js project
          </InfoRow>
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
            {schemaPath || "Select project folder..."}
          </Btn>
        }
        render={(pClose) => (
          <FileTree
            mode="pick-one"
            type="directory"
            onChange={setUnsavedPath}
            value={schemaPath}
          />
        )}
      />
      {config_sync && (
        <FlexRow>
          <div>Last synced: {config_sync.lastSynced}</div>
        </FlexRow>
      )}
      <Btn
        color="action"
        variant="filled"
        disabledInfo={
          !syncSchema ? "Not allowed to sync schema"
          : !schemaPath ?
            "No schema path selected"
          : undefined
        }
        onClickPromise={async () => {
          await syncSchema!({ connectionId, schemaPath: schemaPath! });
        }}
      >
        {mustSave ? "Save and sync" : "Sync now"}
      </Btn>
    </FlexCol>
  );
};
