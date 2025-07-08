import { mdiAlert, mdiDelete, mdiOpenInNew, mdiViewCarousel } from "@mdi/js";
import type { JSONB } from "prostgles-types";
import React, { useMemo } from "react";
import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "../../../../../../commonTypes/mcp";
import {
  isObject,
  type DBSSchema,
} from "../../../../../../commonTypes/publishUtils";
import { useAlert } from "../../../../components/AlertProvider";
import Btn from "../../../../components/Btn";
import Chip from "../../../../components/Chip";
import { FlexCol, FlexRowWrap } from "../../../../components/Flex";
import { pageReload } from "../../../../components/Loading";
import { usePrgl } from "../../../../pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "../../../../utils";
import {
  useSetActiveWorkspace,
  useWorkspacesSync,
} from "../../../WorkspaceMenu/WorkspaceMenu";
import { loadGeneratedWorkspaces } from "../loadGeneratedWorkspaces";

type P = {
  workspaceId: string | undefined;
  message: Extract<
    DBSSchema["llm_messages"]["message"][number],
    { type: "tool_use" }
  >;
};

export const LoadSuggestedDashboards = ({ workspaceId, message }: P) => {
  const { setWorkspace } = useSetActiveWorkspace(workspaceId);
  const { dbs, connectionId } = usePrgl();

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
  return (
    <FlexCol>
      <FlexRowWrap>
        {json.prostglesWorkspaces.map((w, i) => (
          <Chip
            key={i}
            color="blue"
            leftIcon={{ path: mdiViewCarousel }}
            style={{ borderRadius: "8px" }}
          >
            {w.name}
          </Chip>
        ))}
      </FlexRowWrap>
      {!alreadyLoadedWorkspaceIds.length ?
        <Btn
          color="action"
          iconPath={mdiOpenInNew}
          variant="filled"
          disabledInfo={
            !json.prostglesWorkspaces.length ?
              "No workspaces found in the code block."
            : undefined
          }
          onClick={() => {
            loadGeneratedWorkspaces(json.prostglesWorkspaces, message.id, {
              dbs,
              connectionId,
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
                    `Workspace with this name already exists. Must delete or rename the clashing workspaces: \n${json.prostglesWorkspaces.map((w) => w.name).join(", ")}`,
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
