import { FlexRowWrap } from "@components/Flex";
import {
  mdiCogOutline,
  mdiCpu64Bit,
  mdiMemory,
  mdiTimelapse,
  mdiWeb,
  mdiWebOff,
} from "@mdi/js";
import React, { useState } from "react";

import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import FormField from "@components/FormField/FormField";
import { HeaderSection } from "@components/HeaderSection";
import { getDurationAsStr } from "@components/Stopwatch";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

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
          iconPath={mdiCogOutline}
          variant="faded"
          color={showEdit ? "action" : undefined}
          onClick={() => setShowEdit(!showEdit)}
          size="micro"
        />
      }
    >
      {!showEdit ?
        <FlexRowWrap className="pointer " onClick={() => setShowEdit(true)}>
          <Btn
            variant="faded"
            className="text-1"
            title="Timeout"
            size="small"
            iconPath={mdiTimelapse}
          >
            {getDurationAsStr(timeout)}
          </Btn>
          <Btn
            title={"Internet access: " + internetAccess}
            className="text-1"
            size="small"
            color={
              internetAccess === "host" ? "warn"
              : internetAccess === "bridge" ?
                "action"
              : undefined
            }
            variant="faded"
            iconPath={internetAccess === "none" ? mdiWebOff : mdiWeb}
          >
            {internetAccess}
          </Btn>
          <Btn
            className="text-1"
            size="small"
            variant="faded"
            title="CPUs"
            iconPath={mdiCpu64Bit}
          >
            {cpus}
          </Btn>
          <Btn size="small" title="Memory" variant="faded" iconPath={mdiMemory}>
            {memory}
          </Btn>
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
                  iconPath: mdiWebOff,
                  subLabel:
                    "Container cannot access the internet. Uses bridge-internal network mode.",
                },
                {
                  key: "bridge",
                  label: "Bridge",
                  iconPath: mdiWeb,
                  subLabel:
                    "Container can access the internet. Uses bridge network mode.",
                },
                {
                  key: "host",
                  label: "Host",
                  iconPath: mdiWeb,
                  subLabel:
                    "Container can access the internet AND other services running on your machine. Uses host network mode. Not recommended for security reasons.",
                },
              ] as const satisfies {
                key: typeof internetAccess;
                label: string;
                iconPath: string;
                subLabel: string;
              }[]
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
