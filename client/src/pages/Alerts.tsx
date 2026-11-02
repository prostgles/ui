import { tableMightBeUndefinedDueToAccessControl } from "@common/utils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRow } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { mdiBellBadgeOutline, mdiBellOutline } from "@mdi/js";
import { useSubscribe } from "prostgles-client";
import React, { useMemo, useState } from "react";
import { AlertNotifications } from "./Alerts/AlertNotifications";
import { ManagedAlerts } from "./Alerts/ManagedAlerts";
import { usePrgl } from "./ProjectConnection/PrglContextProvider";

export const Alerts = () => {
  const { connectionId, dbs, db, tables, user } = usePrgl();
  const [section, setSection] = useState<string>();
  const userId = user?.id;
  const subscribe = tableMightBeUndefinedDueToAccessControl(
    dbs.alerts,
  )?.subscribe;
  const filters = useMemo(() => {
    const connectionFilter = {
      $and: [
        { user_id: { $in: [userId, null] } },
        {
          $or: [
            { connection_id: { $in: [connectionId, null] } },
            {
              $existsJoined: {
                "database_configs.connections": { id: connectionId },
              },
            },
          ],
        },
      ],
    };
    return {
      unread: {
        $and: [
          ...connectionFilter.$and,
          { $notExistsJoined: { alert_viewed_by: { user_id: userId } } },
        ],
      },
      read: {
        $and: [
          ...connectionFilter.$and,
          { $existsJoined: { alert_viewed_by: { user_id: userId } } },
        ],
      },
    };
  }, [connectionId, userId]);
  const { data: unread, error } = useSubscribe(
    subscribe!,
    false,
    filters.unread,
    { select: ["severity"], limit: null },
    { skip: !subscribe || !userId },
  );
  const managedTables = tables.filter(
    (table) =>
      (table.managedTableType === "alerts" ||
        table.managedTableType === "alert-deliveries") &&
      db[table.name]?.find,
  );
  if (!userId || (!subscribe && !managedTables.length)) return null;
  const rules = managedTables.filter(
    (table) => table.managedTableType !== "alert-deliveries",
  );
  const deliveries = managedTables.filter(
    (table) => table.managedTableType === "alert-deliveries",
  );
  const sections: Record<string, { label: string; content: React.ReactNode }> =
    {
      ...(subscribe && {
        notifications: {
          label: "Notifications",
          content: <AlertNotifications filters={filters} />,
        },
      }),
      ...(rules.length && {
        rules: {
          label: "Rules",
          content: <ManagedAlerts tables={rules} />,
        },
      }),
      ...(deliveries.length && {
        deliveries: {
          label: "Delivery history",
          content: <ManagedAlerts tables={deliveries} />,
        },
      }),
    };
  const [defaultSection] = Object.keys(sections);
  const activeSection = section && sections[section] ? section : defaultSection;
  const color =
    unread?.some((notification) => notification.severity === "error") ? "danger"
    : unread?.some((notification) => notification.severity === "warning") ?
      "warn"
    : "action";

  return (
    <PopupMenu
      key={connectionId}
      data-command="Alerts"
      title={
        <FlexRow className="gap-1">
          <span>Alerts</span>
          {Object.keys(sections).length > 1 && (
            <SegmentedToggle
              className="font-14"
              value={activeSection}
              onChange={setSection}
              options={Object.fromEntries(
                Object.entries(sections).map(([key, { label }]) => [
                  key,
                  { title: label, children: label, iconPath: "" },
                ]),
              )}
            />
          )}
        </FlexRow>
      }
      button={
        <Btn
          title="Alerts"
          aria-label="Alerts"
          variant="faded"
          color={color}
          iconPath={unread?.length ? mdiBellBadgeOutline : mdiBellOutline}
        >
          {unread?.length || undefined}
        </Btn>
      }
      positioning="beneath-center"
      onClickClose={false}
      clickCatchStyle={{ opacity: 1 }}
      contentStyle={{ width: "min(900px, 90vw)", maxHeight: "75vh" }}
    >
      <ErrorComponent error={error} />
      {activeSection && sections[activeSection]?.content}
    </PopupMenu>
  );
};
