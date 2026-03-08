import { FlexRowWrap } from "@components/Flex";
import {
  mdiCog,
  mdiCpu64Bit,
  mdiMemory,
  mdiTimelapse,
  mdiWeb,
  mdiWebOff,
} from "@mdi/js";
import React, { useState } from "react";

import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import FormField from "@components/FormField/FormField";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { HeaderSection } from "@components/HeaderSection";
import {
  getIntervalAsText,
  getPGIntervalAsText,
} from "src/dashboard/W_SQL/customRenderers";
import { getDurationAsStr } from "@components/Stopwatch";

export const ContainerConfigurationEditor = ({
  workflow,
}: {
  workflow: DBSSchema["agentic_workflows"];
}) => {
  const { containerConfiguration } = workflow.definition_data;
  const { id, definition_override } = workflow;
  const { dbs } = usePrglCore();
  const containerConfigurationWithOverrides = {
    ...containerConfiguration,
    ...definition_override?.containerConfiguration,
  };
  const {
    timeout,
    cpus = 1,
    memory = "512m",
    internetAccess = "none",
  } = containerConfigurationWithOverrides;

  const updateContainerConfiguration = async (
    newConfig: Partial<typeof containerConfiguration>,
  ) => {
    await dbs.agentic_workflows.update(
      { id, chat_id: workflow.chat_id, user_id: workflow.user_id },
      {
        definition_override: {
          ...workflow.definition_override,
          containerConfiguration: {
            ...workflow.definition_override?.containerConfiguration,
            ...newConfig,
          },
        },
      },
    );
  };
  const [showEdit, setShowEdit] = useState(false);

  return (
    <HeaderSection
      title="Container configuration"
      titleEndContent={
        <Btn
          iconPath={mdiCog}
          variant="faded"
          color={showEdit ? "action" : undefined}
          onClick={() => setShowEdit(!showEdit)}
          size="micro"
        />
      }
    >
      {!showEdit ?
        <FlexRowWrap className="pointer " onClick={() => setShowEdit(true)}>
          <Chip
            className="text-1"
            title="Timeout"
            leftIcon={{
              path: mdiTimelapse,
            }}
          >
            {getDurationAsStr(timeout)}
          </Chip>
          <Chip
            title="Internet access"
            className="text-1"
            leftIcon={{
              path: internetAccess === "none" ? mdiWebOff : mdiWeb,
            }}
          >
            {internetAccess}
          </Chip>
          <Chip
            className="text-1"
            title="CPUs"
            leftIcon={{
              path: mdiCpu64Bit,
            }}
          >
            {cpus}
          </Chip>
          <Chip
            title="Memory"
            leftIcon={{
              path: mdiMemory,
            }}
          >
            {memory}
          </Chip>
        </FlexRowWrap>
      : <FlexRowWrap>
          <FormField
            type="integer"
            style={{ maxWidth: "120px" }}
            label={"Timeout (s)"}
            value={Math.round(timeout / 1000)}
            onChange={(newTimeout) =>
              updateContainerConfiguration({ timeout: newTimeout * 1000 })
            }
          />
          <FormField
            label={"Internet access"}
            value={internetAccess}
            style={{ maxWidth: "120px" }}
            fullOptions={
              [
                {
                  key: "none",
                  label: "None",
                  subLabel:
                    "Container can access internet. Uses bridge network mode.",
                },
                {
                  key: "full",
                  label: "Full",
                  subLabel:
                    "Container cannot access the internet. Uses bridge-internal network mode.",
                },
              ] as const
            }
            onChange={(newValue) =>
              updateContainerConfiguration({ internetAccess: newValue })
            }
          />
          <FormField
            type="number"
            label={"CPUs"}
            style={{ maxWidth: "120px" }}
            value={Number(cpus)}
            onChange={(newValue) =>
              updateContainerConfiguration({ cpus: newValue.toString() })
            }
          />
          <FormField
            type="text"
            label={"Memory"}
            style={{ maxWidth: "120px" }}
            value={memory}
            onChange={(newValue) => {
              const isValid = /^\d+(m|g|t|k|b)?$/i.test(newValue);
              if (isValid) {
                void updateContainerConfiguration({ memory: newValue });
              }
            }}
          />
        </FlexRowWrap>
      }
    </HeaderSection>
  );
};
