import type { DBSSchema } from "@common/publishUtils";
import { useOnErrorAlert } from "@components/AlertProvider";
import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { MonacoLogRenderer } from "@components/MonacoLogRenderer/MonacoLogRenderer";
import { StatusChip } from "@components/StatusChip";
import { SvgIcon } from "@components/SvgIcon";
import { SwitchToggle } from "@components/SwitchToggle";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";
import type { Prgl } from "src/App";
import { SmartCardList } from "src/dashboard/SmartCardList/SmartCardList";

export const Services = ({
  dbs,
  dbsMethods,
  dbsTables,
}: Pick<Prgl, "dbs" | "dbsMethods" | "dbsTables">) => {
  const { toggleService } = dbsMethods;
  const { onErrorAlert } = useOnErrorAlert();
  return (
    <FlexCol>
      <SmartCardList
        db={dbs as DBHandlerClient}
        tableName={"services"}
        methods={dbsMethods}
        tables={dbsTables}
        realtime={true}
        showEdit={false}
        fieldConfigs={[
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
          },
          {
            name: "default_port",
          },
          {
            name: "logs",
            className: "min-w-full o-unset",
            style: {
              minWidth: "100%",
            },
            renderMode: "full",
            render: (_, { logs }) => (
              <FlexCol className="relative min-w-full f-1">
                <MonacoLogRenderer logs={logs || ""} label="Logs" />
              </FlexCol>
            ),
          },
        ]}
      />
    </FlexCol>
  );
};
