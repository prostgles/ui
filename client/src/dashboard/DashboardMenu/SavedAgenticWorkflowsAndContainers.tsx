import { Icon } from "@components/Icon/Icon";
import Loading from "@components/Loader/Loading";
import Popup from "@components/Popup/Popup";
import {
  SearchList,
  type SearchListItem,
} from "@components/SearchList/SearchList";
import { mdiDocker } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo, useState } from "react";
import { AgenticWorkflow } from "../AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/AgenticWorkflow/AgenticWorkflow";
import { useLLMSetup } from "../AskLLM/Setup/LLMSetupProvider";

export const SavedAgenticWorkflowsAndContainers = () => {
  const { dbs, connectionId } = usePrgl();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number>();

  const state = useLLMSetup();
  const { data: agenticWorkflows } = dbs.agentic_workflows.useSubscribe(
    {
      connection_id: connectionId,
    },
    {
      select: {
        "*": 1,
        agentic_workflow_runs: {
          $leftJoin: "agentic_workflow_runs",
          select: {
            state: 1,
            created: 1,
          },
          filter: {
            "state->>status": "running",
          },
        },
      },
    },
  );

  const searchListProps = useMemo(() => {
    const items = (agenticWorkflows || [])
      .filter((w) => w.saved || w.agentic_workflow_runs.length)
      .map((workflow) => {
        return {
          key: workflow.id,
          label: workflow.name,
          subLabel: workflow.definition_summary,
          onPress: () => {
            setSelectedWorkflowId(workflow.id);
          },
          contentLeft:
            workflow.agentic_workflow_runs.length ?
              <Loading />
            : <Icon path={mdiDocker} />,
        } satisfies SearchListItem;
      });
    return {
      items,
    };
  }, [agenticWorkflows]);
  const selectedWorkflow = useMemo(() => {
    return agenticWorkflows?.find((w) => w.id === selectedWorkflowId);
  }, [agenticWorkflows, selectedWorkflowId]);
  return (
    <>
      <SearchList
        {...searchListProps}
        searchEmpty={true}
        placeholder="Search agentic workflows"
      />
      {selectedWorkflow && (
        <Popup
          positioning="fullscreen"
          title={selectedWorkflow.name}
          onClose={() => setSelectedWorkflowId(undefined)}
        >
          <AgenticWorkflow
            workflow_id={selectedWorkflowId}
            validatedWorkflowDataIsValid={true}
            chatId={undefined}
            inputData={undefined}
            tool_use_id={selectedWorkflow.tool_use_id}
            workflowValidationError={undefined}
          />
        </Popup>
      )}
    </>
  );
};
