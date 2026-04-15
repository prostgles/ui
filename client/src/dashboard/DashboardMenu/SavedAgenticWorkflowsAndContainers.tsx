import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { Icon } from "@components/Icon/Icon";
import Loading from "@components/Loader/Loading";
import Popup from "@components/Popup/Popup";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import {
  SearchList,
  type SearchListItem,
} from "@components/SearchList/SearchList";
import { mdiChat, mdiCubeOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo, useState } from "react";
import { AgenticWorkflow } from "../AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/AgenticWorkflow/AgenticWorkflow";
import { useLLMSetup } from "../AskLLM/Setup/LLMSetupProvider";
import type { DBSSchema } from "@common/publishUtils";
import type { FilterItem, Select } from "prostgles-types";

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
          } satisfies Select<DBSSchema["agentic_workflow_runs"]>,
          filter: {
            state: { "@>": { status: "running" } },
          } satisfies FilterItem<DBSSchema["agentic_workflow_runs"]>,
        },
      },
    },
  );

  const searchListProps = useMemo(() => {
    const items = (agenticWorkflows || [])
      .filter((w) => w.saved || w.agentic_workflow_runs.length)
      .map((workflow) => {
        const dbAccess = workflow.definition_data.databaseAccessDefinitions;
        return {
          key: workflow.id,
          label: workflow.name,
          styles: {
            label: {
              whiteSpace: "nowrap",
            },
            subLabel: {
              whiteSpace: "nowrap",
            },
          },
          subLabel: sliceText(workflow.definition_summary, 200),
          contentBottom:
            dbAccess?.mode === "custom" ?
              <ScrollFade className="flex-row o-auto mt-p5 gap-p5">
                {Object.keys(dbAccess.tablePermissions).map((tableName) => (
                  <Chip
                    style={{ background: "var(--bg-color-3)" }}
                    key={tableName}
                  >
                    {tableName}
                  </Chip>
                ))}
              </ScrollFade>
            : null,
          onPress: () => {
            setSelectedWorkflowId(workflow.id);
          },
          contentLeft:
            workflow.agentic_workflow_runs.length ?
              <Loading sizePx={16} className="mt-p25" />
            : <Icon path={mdiCubeOutline} />,
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
        placeholder="Search agentic workflows"
        data-command="SavedAgenticWorkflowsAndContainers"
        {...searchListProps}
        noResultsContent={null}
        searchEmpty={true}
        style={{
          maxWidth: "600px",
        }}
      />
      {selectedWorkflow && (
        <Popup
          positioning="fullscreen"
          title={selectedWorkflow.name}
          headerRightContent={
            <Btn
              onClick={() => {
                state.setShowChat({
                  selectedChatId: selectedWorkflow.chat_id,
                });
                setSelectedWorkflowId(undefined);
              }}
              iconPath={mdiChat}
              variant="faded"
              color="action"
            >
              Show chat
            </Btn>
          }
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
