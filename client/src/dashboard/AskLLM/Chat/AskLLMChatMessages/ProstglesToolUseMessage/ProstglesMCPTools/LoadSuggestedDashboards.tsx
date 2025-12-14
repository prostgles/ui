import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { isObject } from "@common/publishUtils";
import { useAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import Chip from "@components/Chip";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { pageReload } from "@components/Loader/Loading";
import PopupMenu from "@components/PopupMenu";
import { SvgIcon } from "@components/SvgIcon";
import { mdiAlert, mdiDelete, mdiOpenInNew, mdiViewCarousel } from "@mdi/js";
import { tryCatchV2, type JSONB } from "prostgles-types";
import React, { useMemo } from "react";
import { usePrgl } from "../../../../../../pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "../../../../../../utils/utils";
import {
  useSetActiveWorkspace,
  useWorkspacesSync,
} from "../../../../../WorkspaceMenu/useWorkspaces";
import { loadGeneratedWorkspaces } from "../../../../Tools/loadGeneratedWorkspaces/loadGeneratedWorkspaces";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";

export const LoadSuggestedDashboards = ({
  workspaceId,
  message,
}: ProstglesMCPToolsProps) => {
  const { setWorkspace } = useSetActiveWorkspace(workspaceId);
  const { dbs, connectionId, tables } = usePrgl();

  const workspaces = useWorkspacesSync(dbs, connectionId);
  const alreadyLoadedWorkspaceIds = useMemo(() => {
    return workspaces
      .map((w) => (w.source?.tool_use_id === message.id ? w.id : undefined))
      .filter(isDefined);
  }, [message.id, workspaces]);
  const json = message.input as
    | JSONB.GetObjectType<
        (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_dashboards"]["schema"]["type"]
      >
    | undefined;
  const { addAlert } = useAlert();

  if (
    !json ||
    !Array.isArray(json.prostglesWorkspaces) ||
    !json.prostglesWorkspaces.length
  ) {
    return (
      <FlexCol>
        <Chip color="red" leftIcon={{ path: mdiAlert }}>
          No suggested dashboards found in the code block.
        </Chip>
      </FlexCol>
    );
  }
  const prostglesWorkspaces =
    json.prostglesWorkspaces as WorkspaceInsertModel[];
  return (
    <FlexCol>
      <FlexRowWrap>
        {prostglesWorkspaces.map((w, i) => (
          <PopupMenu
            key={`${w.name}${i}-input`}
            title={`Suggested Dashboard: ${w.name}`}
            positioning="fullscreen"
            onClickClose={false}
            button={
              <Chip
                key={i}
                color="blue"
                leftIcon={w.icon ? undefined : { path: mdiViewCarousel }}
                style={{ borderRadius: "8px", cursor: "pointer" }}
              >
                <FlexRow className="gap-p5 pr-p25">
                  {w.icon && <SvgIcon icon={w.icon} />}
                  {w.name}
                </FlexRow>
              </Chip>
            }
          >
            <MonacoCodeInMarkdown
              codeString={
                tryCatchV2(() => JSON.stringify(w, null, 2)).data ?? ""
              }
              className="f-1"
              language="json"
              codeHeader={undefined}
              sqlHandler={undefined}
              loadedSuggestions={undefined}
            />
          </PopupMenu>
        ))}
      </FlexRowWrap>
      {!alreadyLoadedWorkspaceIds.length ?
        <Btn
          color="action"
          iconPath={mdiOpenInNew}
          variant="filled"
          data-command="AskLLMChat.LoadSuggestedDashboards"
          disabledInfo={
            !json.prostglesWorkspaces.length ?
              "No workspaces found in the code block."
            : undefined
          }
          onClick={() => {
            loadGeneratedWorkspaces(prostglesWorkspaces, message.id, {
              dbs,
              connectionId,
              tables,
            })
              .then((insertedWorkspaces) => {
                const [first] = insertedWorkspaces;
                if (first) {
                  setWorkspace(first);
                }
              })
              .catch((error) => {
                if (isObject(error) && error.code === "23505") {
                  addAlert(
                    `Workspace with this name already exists. Must delete or rename the clashing workspaces: \n${prostglesWorkspaces.map((w) => w.name).join(", ")}`,
                  );
                } else {
                  addAlert(
                    `Error loading workspaces: ${error.message || error}`,
                  );
                }
              });
          }}
        >
          Load suggested workspaces
        </Btn>
      : <Btn
          iconPath={mdiDelete}
          variant="faded"
          color="danger"
          title="Delete already loaded workspaces"
          data-command="AskLLMChat.UnloadSuggestedDashboards"
          onClickPromise={async () => {
            await dbs.workspaces.update(
              { id: { $in: alreadyLoadedWorkspaceIds } },
              { deleted: true },
            );
            setWorkspace(undefined);
            pageReload("Workspaces deleted");
          }}
        >
          Remove suggested workspaces
        </Btn>
      }
    </FlexCol>
  );
};
