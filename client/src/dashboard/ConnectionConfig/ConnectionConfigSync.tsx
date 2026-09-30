import { getAgeFromDiff } from "@common/utils";
import Btn from "@components/Btn";
import { ProjectCodeEditor } from "@components/CodeFileBrowser/ProjectCodeEditor";
import { FileTree } from "@components/FileTree/FileTree";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { mdiFolderOutline } from "@mdi/js";
import { usePromise } from "prostgles-client";
import { omitKeys } from "prostgles-types";
import React, { useState } from "react";
import { usePrgl } from "../../pages/ProjectConnection/PrglContextProvider";
import { getIntervalAsText } from "../W_SQL/customRenderers";

export const ConnectionConfigSync = () => {
  const prgl = usePrgl();
  const {
    dbs,
    dbsMethods: { findSchemaConfigSource, syncSchema, glob },
    connectionId,
    methods,
    tables,
  } = prgl;

  const [unsavedPath, setUnsavedPath] = useState<string | undefined>(undefined);
  const [sourcePosition, setSourcePosition] = useState<{
    fileName: string;
    startLineNumber: number;
    endLineNumber: number;
  }>();
  const { data: dbConf } = dbs.database_configs.useSubscribeOne({
    $existsJoined: {
      connections: { id: connectionId },
    },
  });

  const { config_sync } = dbConf || {};
  const mustSave =
    unsavedPath && dbConf && unsavedPath !== config_sync?.configPath;

  const configPath = unsavedPath ?? config_sync?.configPath;
  const [folderVersion, setFolderVersion] = useState(0);
  const folder = usePromise(async () => {
    if (!configPath || !glob) return;
    void folderVersion;
    try {
      const { result } = await glob({ cwd: configPath, pattern: "{*,.*}" });
      return { path: configPath, empty: result.length === 0 };
    } catch {
      return { path: configPath, empty: false };
    }
  }, [configPath, glob, folderVersion]);
  const isEmptyFolder = folder?.path === configPath && folder?.empty;
  const templateWarning =
    "Setting up the template will install dependencies and sync its settings, overriding existing table display options and table configuration. It also adds an example service and restarts the connection.";
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

  const sourceResult = usePromise(async () => {
    if (!findSchemaConfigSource || config_sync?.type !== "cli") {
      return { items: [] };
    }
    try {
      const sources = await findSchemaConfigSource({
        connectionId,
        tableNames: tables.map(({ name }) => name),
        functionNames: Object.keys(methods),
      });
      const items = sources.map((source) => {
        const label =
          source.type === "function" ?
            "Function"
          : tableSourceLabels[source.type];
        return {
          ...source,
          key: `${source.type}\0${source.name}`,
          label: source.name,
          subLabel: label,
          parentLabels: [source.type === "function" ? "Functions" : label],
        };
      });
      return { items };
    } catch (error) {
      return { items: [], error: String(error) };
    }
  }, [config_sync, connectionId, findSchemaConfigSource, methods, tables]);
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
          render={() => (
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
            : glob && folder?.path !== configPath ?
              "Checking project folder"
            : undefined
          }
          clickConfirmation={
            isEmptyFolder ?
              {
                message: templateWarning,
                buttonText: "Set up template and sync",
                color: "warn",
              }
            : undefined
          }
          onClickPromise={
            syncSchema &&
            (async () => {
              try {
                await syncSchema({
                  connectionId,
                  configPath: configPath!,
                  setupTemplate: isEmptyFolder || undefined,
                });
              } finally {
                setFolderVersion((value) => value + 1);
              }
            })
          }
        >
          {isEmptyFolder ?
            "Set up template and sync"
          : mustSave ?
            "Save and sync"
          : "Sync now"}
        </Btn>
      </FlexRowWrap>
      {isEmptyFolder && (
        <InfoRow color="warning">
          This folder is empty. {templateWarning}
        </InfoRow>
      )}
      {config_sync && (
        <>
          {sourceResult?.error && (
            <InfoRow color="warning">{sourceResult.error}</InfoRow>
          )}
          <ProjectCodeEditor
            title={
              config_sync.type === "cli" ?
                <Select
                  optional
                  value={undefined}
                  fullOptions={sourceResult?.items ?? []}
                  emptyLabel="Go to source..."
                  disabledInfo={
                    !findSchemaConfigSource ?
                      "Source navigation is not available"
                    : undefined
                  }
                  onChange={(key) => {
                    const item = sourceResult?.items.find(
                      (entry) => entry.key === key,
                    );
                    if (!item) return;
                    setSourcePosition(item);
                  }}
                />
              : " "
            }
            projectPath={config_sync.configPath}
            sourcePosition={sourcePosition}
          />
        </>
      )}
    </FlexCol>
  );
};

const tableSourceLabels = {
  tableConfig: "Table config",
  tableHooks: "Table hooks",
  tableOptions: "Table options",
} as const;
