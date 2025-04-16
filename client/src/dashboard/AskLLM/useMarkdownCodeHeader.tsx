import { mdiPlus } from "@mdi/js";
import React, { useCallback } from "react";
import { isObject } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { type MarkedProps } from "../../components/Chat/Marked";
import { useSetNewWorkspace } from "../WorkspaceMenu/WorkspaceMenu";
import { loadGeneratedWorkspaces } from "./loadGeneratedWorkspaces";
import type { LLMSetupStateReady } from "./useLLMSetupState";

type P = LLMSetupStateReady &
  Pick<Prgl, "dbs" | "user" | "connectionId"> & {
    workspaceId: string | undefined;
  };

export const useMarkdownCodeHeader = ({
  workspaceId,
  dbs,
  connectionId,
}: P) => {
  const { setWorkspace } = useSetNewWorkspace(workspaceId);
  const markdownCodeHeader: MarkedProps["codeHeader"] = useCallback(
    ({ language, codeString }) => {
      if (language !== "json") return null;
      try {
        const json = isMaybeProstglesWorkspaces(codeString);
        if (json) {
          return (
            <Btn
              color="action"
              iconPath={mdiPlus}
              variant="faded"
              size="small"
              onClick={() => {
                loadGeneratedWorkspaces(json.prostglesWorkspaces, {
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
                      alert(
                        `Workspace with this name already exists. Must delete or rename the clashing workspaces: \n${json.prostglesWorkspaces.map((w) => w.name).join(", ")}`,
                      );
                    }
                  });
              }}
            >
              Load workspaces
            </Btn>
          );
        }
      } catch (e) {
        console.error(e);
      }
    },
    [connectionId, dbs, setWorkspace],
  );

  return { markdownCodeHeader };
};

const isMaybeProstglesWorkspaces = (
  codeString: string,
): { prostglesWorkspaces: any[] } | undefined => {
  try {
    const json = JSON.parse(codeString);
    return Array.isArray(json.prostglesWorkspaces) ? json : undefined;
  } catch (e) {
    console.error(e);
  }
  return undefined;
};
