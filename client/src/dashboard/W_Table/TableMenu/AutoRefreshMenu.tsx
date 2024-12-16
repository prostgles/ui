import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import ButtonGroup from "../../../components/ButtonGroup";
import { InfoRow } from "../../../components/InfoRow";
import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import type { RefreshOptions } from "./W_TableMenu";
import React from "react";
import FormField from "../../../components/FormField/FormField";

export const AutoRefreshMenu = ({
  w,
  db,
}: {
  w:
    | WindowSyncItem<"sql">
    | WindowSyncItem<"map">
    | WindowSyncItem<"table">
    | WindowSyncItem<"timechart">;
  db?: DBHandlerClient;
}) => {
  const { refresh } = w.options;
  const {
    type = "None",
    intervalSeconds = 3,
    throttleSeconds = 1,
  } = refresh ?? {};

  const update = (r: RefreshOptions["refresh"]) => {
    w.$update(
      {
        options: {
          ...w.options,
          refresh: r,
        },
      },
      { deepMerge: true },
    );
  };

  const REFRESH_OPTIONS = [
    {
      key: "Realtime",
      disabledInfo:
        w.type === "table" && !db?.[w.table_name!]?.subscribe ?
          "Cannot subscribe"
        : undefined,
    },
    { key: "Interval" },
    { key: "None" },
  ] as const satisfies readonly {
    key: NonNullable<RefreshOptions["refresh"]>["type"];
    label?: string;
    disabledInfo?: string;
  }[];

  return (
    <div className="flex-col ai-start">
      <ButtonGroup
        fullOptions={REFRESH_OPTIONS.filter(
          (o) => w.type !== "timechart" || o.key !== "Interval",
        )}
        value={type}
        style={{ marginRight: "40px", marginBottom: "1em" }}
        onChange={(type) => {
          update({ type, throttleSeconds: 1, intervalSeconds: 3 });
        }}
      />

      <div className="text-1 noselect mt-0">
        {type === "Realtime" ?
          <>
            Changes shown as received from database. Needs super user to create
            triggers
            {w.table_name &&
              db &&
              db[w.table_name] &&
              !db[w.table_name]?.subscribe && (
                <InfoRow color="danger" className="my-1">
                  Cannot subscribe
                </InfoRow>
              )}
          </>
        : type === "Interval" ?
          "Run the query every N seconds"
        : "Data will not be refreshed"}
      </div>
      {type === "Interval" && (
        <FormField
          label="Seconds"
          type="number"
          value={intervalSeconds}
          hint="0 to disable"
          onChange={(v) => {
            const intervalSeconds = +v;
            if (!intervalSeconds || v < 0) {
              update({ type: "None", intervalSeconds, throttleSeconds });
            } else {
              update({ type, intervalSeconds, throttleSeconds });
            }
          }}
        />
      )}
      {type === "Realtime" && (
        <FormField
          label="Throttle seconds"
          type="number"
          value={throttleSeconds}
          onChange={(throttleSeconds) => {
            update({
              type,
              intervalSeconds,
              throttleSeconds: +(throttleSeconds || 1),
            });
          }}
        />
      )}
    </div>
  );
};
