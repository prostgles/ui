import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import PopupMenu from "@components/PopupMenu";
import { mdiBellBadgeOutline, mdiDelete } from "@mdi/js";
import React, { useMemo } from "react";
import { NavLink } from "react-router";
import type { FieldConfig } from "../dashboard/SmartCard/SmartCard";
import { SmartCardList } from "../dashboard/SmartCardList/SmartCardList";
import { StyledInterval } from "../dashboard/W_SQL/customRenderers";
import { usePrgl } from "./ProjectConnection/PrglContextProvider";

export const Alerts = () => {
  const { connectionId, dbs, user, dbsSql, dbsMethodSchema, dbsTables } =
    usePrgl();
  const user_id = user?.id;
  const alertsFilter = useMemo(() => {
    return {
      $and: [
        {
          $notExistsJoined: { alert_viewed_by: { user_id } },
        } as Record<string, any>,
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
  }, [connectionId, user_id]);
  const { data: alerts } = dbs.alerts.useSubscribe(alertsFilter);
  const highestSeverityColor = useMemo(() => {
    let hasWarning = false;
    for (const alertItem of alerts ?? []) {
      if (alertItem.severity === "error") return "danger";
      if (alertItem.severity === "warning") hasWarning = true;
    }
    return hasWarning ? "warn" : "action";
  }, [alerts]);

  const listProps = useMemo(() => {
    const fieldConfigs = [
      {
        name: "severity",
        hide: true,
      },
      {
        name: "title",
        hide: true,
      },
      {
        name: "age",
        select: {
          $ageNow: ["created"],
        },
        hide: true,
      },
      {
        name: "ui_path",
        hide: true,
      },
      {
        name: "connection_id",
        hide: true,
      },
      {
        name: "message",
        renderMode: "full",
        render: (message, row) => {
          const {
            severity,
            title,
            age,
            id: alert_id,
            connection_id,
            ui_path,
          } = row as DBSSchema["alerts"] & { age: any };
          return (
            <FlexRow className="ai-start">
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
                  <StyledInterval
                    value={age}
                    style={{ color: "var(--text-0)" }}
                  />
                  {title && <div className="bold">{title}</div>}
                  <div>{message}</div>
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
                iconPath={mdiDelete}
                onClickPromise={() =>
                  dbs.alert_viewed_by.insert({
                    alert_id,
                    user_id,
                  })
                }
              />
            </FlexRow>
          );
        },
      },
      {
        name: "id",
        hide: true,
      },
    ] satisfies FieldConfig[];
    const rowProps = {
      className: "ai-center",
    };
    return {
      fieldConfigs,
      rowProps,
    };
  }, [dbs, user_id]);

  if (!alerts?.length) return null;

  return (
    <PopupMenu
      data-command="Alerts"
      button={
        <div>
          <Btn
            variant="faded"
            color={highestSeverityColor}
            iconPath={mdiBellBadgeOutline}
          />
        </div>
      }
      positioning="beneath-center"
      // contentStyle={{
      //   background: "var(--bg-color-0)",
      // }}
      // contentClassName="bg-color-0 shadow"
      onClickClose={false}
      // rootStyle={{
      //   border: "unset",
      //   boxShadow: "unset",
      //   background: "transparent",
      // }}
    >
      {!!alerts.length && (
        <SmartCardList
          db={dbs}
          sql={dbsSql}
          methods={dbsMethodSchema}
          tables={dbsTables}
          tableName={"alerts"}
          realtime={true}
          filter={alertsFilter}
          showEdit={false}
          {...listProps}
        />
      )}
    </PopupMenu>
  );
};
