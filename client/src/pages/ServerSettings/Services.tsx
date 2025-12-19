import type { DBSSchema } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import { useOnErrorAlert } from "@components/AlertProvider";
import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { MonacoLogRenderer } from "@components/MonacoLogRenderer/MonacoLogRenderer";
import { Select } from "@components/Select/Select";
import { StatusChip } from "@components/StatusChip";
import { SvgIcon } from "@components/SvgIcon";
import { SwitchToggle } from "@components/SwitchToggle";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useMemo } from "react";
import type { Prgl } from "src/App";
import type { FieldConfig } from "src/dashboard/SmartCard/SmartCard";
import { SmartCardList } from "src/dashboard/SmartCardList/SmartCardList";

type P = Pick<Prgl, "dbs" | "dbsMethods" | "dbsTables"> & {
  showSpecificService:
    | undefined
    | {
        title: string;
        color?: "red";
        serviceName: string;
      };
};

export const Services = ({
  dbs,
  dbsMethods,
  dbsTables,
  showSpecificService,
}: P) => {
  const { servicesFieldConfigs } = useServicesFieldConfigs({
    dbs,
    dbsMethods,
    showSpecificService,
  });
  return (
    <SmartCardList
      db={dbs as DBHandlerClient}
      title={
        showSpecificService && (
          <Label
            variant="normal"
            style={showSpecificService.color && { color: "var(--red)" }}
          >
            {showSpecificService.title}
          </Label>
        )
      }
      filter={
        showSpecificService && {
          name: showSpecificService.serviceName,
        }
      }
      orderBy={{ key: "label" }}
      tableName={"services"}
      methods={dbsMethods}
      tables={dbsTables}
      showTopBar={false}
      realtime={true}
      showEdit={false}
      fieldConfigs={servicesFieldConfigs}
    />
  );
};

const useServicesFieldConfigs = ({
  dbs,
  dbsMethods,
  showSpecificService,
}: Pick<P, "dbsMethods" | "dbs" | "showSpecificService">) => {
  const { toggleService } = dbsMethods;
  const { onErrorAlert } = useOnErrorAlert();
  const servicesFieldConfigs = useMemo(() => {
    return [
      {
        name: "icon",
        hide: true,
      },
      {
        name: "label",
        hide: true,
      },
      {
        name: "configs",
        hide: true,
      },
      {
        name: "selected_config_options",
        hide: true,
      },
      {
        name: "name",
        renderMode: "full",
        render: (
          _,
          {
            name,
            label,
            icon,
            status,
            configs,
            selected_config_options,
          }: DBSSchema["services"],
        ) => {
          const isRunning =
            status === "building" ||
            status === "starting" ||
            status === "running";
          return (
            <FlexCol className="w-full gap-p5">
              <FlexRow className="w-full gap-0">
                <SvgIcon className="f-0" icon={icon} size={24} />
                <Label variant="header" className="ta-left mx-1">
                  {label}
                </Label>
                <StatusChip
                  data-key="service-status"
                  color={
                    status === "running" ? "green"
                    : status === "error" || status === "build-error" ?
                      "red"
                    : status === "stopped" ?
                      "gray"
                    : "yellow"
                  }
                  text={status}
                />
                {toggleService && (
                  <SwitchToggle
                    className="ml-auto"
                    data-key="service-toggle"
                    title={isRunning ? "Stop service" : "Start service"}
                    checked={isRunning}
                    onChange={() =>
                      void onErrorAlert(async () => {
                        await toggleService(name, !isRunning);
                      })
                    }
                  />
                )}
              </FlexRow>
              <FlexRow>
                {Object.entries(configs ?? {}).map(([configKey, config]) => {
                  return (
                    <Select
                      key={configKey}
                      title={config.label || configKey}
                      data-key={configKey}
                      btnProps={{
                        size: "small",
                      }}
                      disabledInfo={
                        isRunning ?
                          "Stop the service to change this setting."
                        : ""
                      }
                      value={
                        selected_config_options?.[configKey] ||
                        config.defaultOption
                      }
                      fullOptions={getEntries(config.options).map(
                        ([optionKey, option]) => ({
                          key: optionKey,
                          label: option.label ?? optionKey,
                        }),
                      )}
                      onChange={(configValue) => {
                        void dbs.services.update(
                          {
                            name,
                          },
                          {
                            selected_config_options: {
                              $merge: [{ [configKey]: configValue }],
                            },
                          },
                        );
                      }}
                    />
                  );
                })}
              </FlexRow>
            </FlexCol>
          );
        },
      },
      {
        name: "status",
        hide: true,
      },
      {
        name: "description",
        hide: !!showSpecificService,
      },
      {
        name: "default_port",
        hide: !!showSpecificService,
      },
      {
        name: "logs",
        hideIf: (v, { status }) =>
          !v ||
          Boolean(
            showSpecificService &&
              (status === "running" || status === "stopped"),
          ),
        renderMode: "full",
        render: (_, { logs }) => (
          <FlexCol
            className="relative min-w-full f-1"
            style={{
              maxWidth: showSpecificService ? "200px" : undefined,
            }}
          >
            <MonacoLogRenderer logs={logs || ""} label="Logs" />
          </FlexCol>
        ),
      },
    ] satisfies FieldConfig<DBSSchema["services"]>[];
  }, [dbs.services, onErrorAlert, showSpecificService, toggleService]);

  return { servicesFieldConfigs };
};
