import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import PopupMenu from "@components/PopupMenu";
import { ROW_ACTIONS_COLUMN, usePromise } from "prostgles-client";
import { getActionFunctions } from "prostgles-types";
import React from "react";
import type { DBSchemaTableWJoins } from "../../dashboard/Dashboard/dashboardUtils";
import { SmartCardList } from "../../dashboard/SmartCardList/SmartCardList";
import { SmartForm } from "../../dashboard/SmartForm/SmartForm";
import { getTableCardFieldConfigs } from "../../dashboard/SmartForm/SmartFormField/getTableCardFieldConfigs";
import { usePrgl } from "../ProjectConnection/PrglContextProvider";
import { AlertActions } from "./AlertActions";

export const ManagedAlerts = ({
  tables,
}: {
  tables: DBSchemaTableWJoins[];
}) => {
  const prgl = usePrgl();
  const cardFields = usePromise(async () => {
    return Object.fromEntries(
      await Promise.all(
        tables.map(
          async (table) =>
            [
              table.name,
              await getTableCardFieldConfigs({ ...prgl, table }),
            ] as const,
        ),
      ),
    );
  }, [tables, prgl]);
  if (!cardFields) return <Loading />;
  return (
    <FlexCol className="p-1 min-h-0">
      {tables.map((table) => {
        const isRule = table.managedTableType === "alerts";
        const isDelivery = table.managedTableType === "alert-deliveries";
        const jobColumn =
          isDelivery &&
          table.columns.find(
            (column) => column.name === "job_id" && column.select,
          );
        const jobTableName = jobColumn && jobColumn.references?.[0]?.ftable;
        const canViewJob = jobTableName && prgl.db[jobTableName]?.find;
        return (
          <SmartCardList
            key={table.name}
            {...prgl}
            tableName={table.name}
            title={table.label || table.name}
            realtime={!!prgl.db[table.name]?.subscribe}
            orderBy={table.sort}
            fieldConfigs={[
              ...(cardFields[table.name] ?? []).filter(
                (field) =>
                  !jobColumn ||
                  (typeof field === "string" ? field : field.name) !== "job_id",
              ),
              ...(jobColumn ? [{ name: "job_id", hide: true }] : []),
              ...(isRule && getActionFunctions(prgl.methods, table).length ?
                [{ name: ROW_ACTIONS_COLUMN, select: 1, hide: true }]
              : []),
            ]}
            showTopBar={{
              sort: true,
              ...(!isDelivery && {
                insert:
                  isRule ?
                    {
                      defaultData: {
                        created_by: prgl.user?.id,
                        enabled: false,
                      },
                    }
                  : true,
              }),
            }}
            noDataComponent={
              <div>
                {isDelivery ? "No deliveries yet" : "No configured alerts"}
              </div>
            }
            getRowFooter={
              isRule ? (row) => <AlertActions table={table} row={row} />
              : canViewJob ?
                (row) =>
                  Boolean(row.job_id) && (
                    <PopupMenu
                      title="Delivery job"
                      button={<Btn>View delivery job</Btn>}
                      positioning="center"
                      onClickClose={false}
                    >
                      <SmartForm
                        {...prgl}
                        tableName={jobTableName}
                        rowFilter={[
                          { fieldName: "id", type: "=", value: row.job_id },
                        ]}
                        disabledActions={["update", "delete", "clone"]}
                      />
                    </PopupMenu>
                  )
              : undefined
            }
          />
        );
      })}
    </FlexCol>
  );
};
