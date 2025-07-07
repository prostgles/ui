import { mdiDelete, mdiOpenInNew, mdiViewCarousel } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useMemo } from "react";
import {
  isObject,
  type DBSSchema,
} from "../../../../../../commonTypes/publishUtils";
import { useAlert } from "../../../../components/AlertProvider";
import Btn from "../../../../components/Btn";
import Chip from "../../../../components/Chip";
import { FlexRow, FlexRowWrap } from "../../../../components/Flex";
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
  const json = usePromise(
    async () => isMaybeProstglesWorkspaces(message.input),
    [message.input],
  );
  const { addAlert } = useAlert();
  return (
    <FlexRow>
      {!alreadyLoadedWorkspaceIds.length ?
        <Btn
          color="action"
          iconPath={mdiOpenInNew}
          variant="filled"
          disabledInfo={
            !json ? "No workspaces found in the code block." : undefined
          }
          onClick={
            !json ? undefined : (
              () => {
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
              }
            )
          }
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
      <FlexRowWrap>
        {json?.prostglesWorkspaces.map((w, i) => (
          <Chip
            key={i}
            color="blue"
            leftIcon={{ path: mdiViewCarousel }}
            style={{ borderRadius: "4px" }}
          >
            {w.name}
          </Chip>
        ))}
      </FlexRowWrap>
    </FlexRow>
  );
};

const isMaybeProstglesWorkspaces = (
  data: Record<string, unknown>,
): { prostglesWorkspaces: any[] } | undefined => {
  return Array.isArray(data.prostglesWorkspaces) ?
      (data as { prostglesWorkspaces: any[] })
    : undefined;
};
