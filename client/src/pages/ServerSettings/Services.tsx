import type { DBSSchema } from "@common/publishUtils";
import { useOnErrorAlert } from "@components/AlertProvider";
import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { MonacoLogRenderer } from "@components/MonacoLogRenderer/MonacoLogRenderer";
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
    dbsMethods,
    showSpecificService,
  });
  return (
    <SmartCardList
      db={dbs as DBHandlerClient}
      title={
        showSpecificService && (
          <Label variant="normal">{showSpecificService.title}</Label>
        )
      }
      filter={
        showSpecificService && {
          name: showSpecificService.serviceName,
        }
      }
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
  dbsMethods,
  showSpecificService,
}: Pick<P, "dbsMethods" | "showSpecificService">) => {
  const { toggleService } = dbsMethods;
  const { onErrorAlert } = useOnErrorAlert();
  const servicesFieldConfigs = useMemo(() => {
    return [
      {
        name: "icon",
        hide: true,
      },
      {
        name: "name",
        renderMode: "full",
        render: (_, { name, icon, status }: DBSSchema["services"]) => {
          const isRunning = status === "running";
          return (
            <FlexRow className="w-full">
              <SvgIcon icon={icon} size={24} />
              <Label variant="header">{name}</Label>
              <StatusChip
                color={
                  status === "running" ? "green"
                  : status === "stopped" ?
                    "gray"
                  : "yellow"
                }
                text={status}
              />
              {toggleService && (
                <SwitchToggle
                  className="ml-auto"
                  checked={status !== "stopped"}
                  onChange={() =>
                    void onErrorAlert(() => {
                      return toggleService(name, !isRunning);
                    })
                  }
                />
              )}
            </FlexRow>
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
        // hide: !!showSpecificService,
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
  }, [onErrorAlert, showSpecificService, toggleService]);

  return { servicesFieldConfigs };
};
