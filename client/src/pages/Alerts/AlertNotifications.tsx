import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { mdiCheck, mdiEmailMarkAsUnread, mdiHistory } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { NavLink } from "react-router";
import type { FieldConfig } from "../../dashboard/SmartCard/SmartCard";
import { SmartCardList } from "../../dashboard/SmartCardList/SmartCardList";
import { StyledInterval } from "../../dashboard/W_SQL/customRenderers";
import { usePrgl } from "../ProjectConnection/PrglContextProvider";

export const AlertNotifications = ({
  filters,
}: {
  filters: { unread: AnyObject; read: AnyObject };
}) => {
  const { dbs, dbsSql, dbsMethodSchema, dbsTables, user } = usePrgl();
  const [view, setView] = useState<"unread" | "read">("unread");
  const fieldConfigs = useMemo(
    () =>
      [
        ...[
          "id",
          "title",
          "severity",
          "connection_id",
          "ui_path",
          "delivery_id",
        ].map((name) => ({ name, hide: true })),
        { name: "age", select: { $ageNow: ["created"] }, hide: true },
        {
          name: "message",
          renderMode: "full",
          render: (message, row) => {
            const notification = row as DBSSchema["alerts"] & {
              age: React.ComponentProps<typeof StyledInterval>["value"];
            };
            const {
              severity,
              title,
              age,
              id,
              connection_id,
              ui_path,
              delivery_id,
            } = notification;
            return (
              <FlexRow className="ai-start f-1">
                <InfoRow
                  variant="naked"
                  color={
                    severity === "error" ? "danger"
                    : severity === "warning" ?
                      "warning"
                    : "info"
                  }
                >
                  <FlexCol className="gap-p5">
                    <span className="text-1">
                      {delivery_id ? "Alert" : "System"}
                    </span>
                    <StyledInterval
                      value={age}
                      style={{ color: "var(--text-0)" }}
                    />
                    {title && <strong>{title}</strong>}
                    <div style={{ whiteSpace: "pre-wrap" }}>{message}</div>
                    {ui_path && (
                      <NavLink
                        to={`${ui_path.page}/${connection_id || ""}?section=${ui_path.section}`}
                      >
                        Go to issue
                      </NavLink>
                    )}
                  </FlexCol>
                </InfoRow>
                <Btn
                  className="ml-auto"
                  title={view === "unread" ? "Mark as read" : "Mark as unread"}
                  iconPath={view === "unread" ? mdiCheck : mdiEmailMarkAsUnread}
                  onClickPromise={async () => {
                    if (view === "unread") {
                      await dbs.alert_viewed_by.insert({ alert_id: id });
                      return;
                    }
                    await dbs.alert_viewed_by.delete({
                      alert_id: id,
                      user_id: user?.id,
                    });
                  }}
                />
              </FlexRow>
            );
          },
        },
      ] satisfies FieldConfig[],
    [dbs, user?.id, view],
  );

  return (
    <FlexCol className="p-1 min-h-0">
      <SegmentedToggle
        value={view}
        onChange={setView}
        options={{
          unread: {
            title: "Unread",
            children: "Unread",
            iconPath: mdiEmailMarkAsUnread,
          },
          read: { title: "Read", children: "Read", iconPath: mdiHistory },
        }}
      />
      <SmartCardList
        key={view}
        db={dbs}
        sql={dbsSql}
        methods={dbsMethodSchema}
        tables={dbsTables}
        tableName="alerts"
        realtime={true}
        filter={filters[view]}
        orderBy={{ key: "created", asc: false }}
        showEdit={false}
        showTopBar={false}
        fieldConfigs={fieldConfigs}
        noDataComponent={
          <div>
            {view === "unread" ?
              "No unread notifications"
            : "No read notifications"}
          </div>
        }
      />
    </FlexCol>
  );
};
