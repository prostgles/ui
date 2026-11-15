import { FlexCol } from "@components/Flex";
import React from "react";
import type { DBSchemaTableWJoins } from "../../dashboard/Dashboard/dashboardUtils";
import { SmartCardList } from "../../dashboard/SmartCardList/SmartCardList";
import { usePrgl } from "../ProjectConnection/PrglContextProvider";

export const ManagedAlerts = ({
  tables,
  headerControlsTarget,
}: {
  tables: DBSchemaTableWJoins[];
  headerControlsTarget: HTMLDivElement | null;
}) => {
  const prgl = usePrgl();
  return (
    <FlexCol className="p-p5 min-h-0">
      {tables.map((table) => {
        const isDelivery = table.managedTableType === "alert-deliveries";
        return (
          <SmartCardList
            key={table.name}
            {...prgl}
            tableName={table.name}
            bordered={true}
            flat={false}
            title={tables.length > 1 ? table.label || table.name : undefined}
            realtime={!!prgl.db[table.name]?.subscribe}
            headerControlsTarget={headerControlsTarget}
            showTopBar={{
              sort: true,
              ...(!isDelivery && {
                insert: {
                  defaultData: {
                    created_by: prgl.user?.id,
                    enabled: false,
                  },
                },
              }),
            }}
            noDataComponent={
              <div>
                {isDelivery ? "No deliveries yet" : "No configured alerts"}
              </div>
            }
          />
        );
      })}
    </FlexCol>
  );
};
