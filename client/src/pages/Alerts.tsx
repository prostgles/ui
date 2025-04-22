import { mdiBellBadgeOutline, mdiDelete } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { ROUTES } from "../../../commonTypes/utils";
import type { Prgl } from "../App";
import Btn from "../components/Btn";
import { FlexCol, FlexRow } from "../components/Flex";
import { InfoRow } from "../components/InfoRow";
import PopupMenu from "../components/PopupMenu";
import { SmartCardList } from "../dashboard/SmartCardList/SmartCardList";
import { StyledInterval } from "../dashboard/W_SQL/customRenderers";
import type { FieldConfig } from "../dashboard/SmartCard/SmartCard";

export const Alerts = (prgl: Prgl) => {
  const { connectionId, dbs, user } = prgl;
  const user_id = user?.id;
  const alertsFilter = useMemo(() => {
    return {
      $existsJoined: { "database_configs.connections": { id: connectionId } },
      $notExistsJoined: { alert_viewed_by: { user_id } },
    } as Record<string, any>;
  }, [connectionId, user_id]);
  const { data: alerts } = dbs.alerts.useSubscribe(alertsFilter);

  const listProps = useMemo(() => {
    const fieldConfigs = [
      {
        name: "severity",
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
        name: "section",
        hide: true,
      },
      {
        name: "connection_id",
        hide: true,
      },
      {
        name: "message",
        renderMode: "valueNode",
        render: (message, row) => {
          const {
            severity,
            title,
            age,
            id: alert_id,
            connection_id,
            section,
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
                <FlexCol>
                  <StyledInterval
                    value={age}
                    style={{ color: "var(--text-0)" }}
                  />
                  {title && <div className="bold">{title}</div>}
                  <div>{message}</div>
                  {connection_id && section && (
                    <NavLink
                      to={`${ROUTES.CONFIG}/${connection_id}?section=${section}`}
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
      button={
        <div>
          <Btn
            variant="faded"
            color={alerts.length ? "action" : undefined}
            iconPath={alerts.length ? mdiBellBadgeOutline : mdiBellBadgeOutline}
            disabledInfo={alerts.length ? undefined : "No alerts"}
          />
        </div>
      }
      positioning="beneath-center"
      contentStyle={{
        background: "transparent",
      }}
      onClickClose={false}
      rootStyle={{
        border: "unset",
        boxShadow: "unset",
        background: "transparent",
      }}
    >
      {!!alerts.length && (
        <SmartCardList
          db={dbs as DBHandlerClient}
          methods={prgl.dbsMethods}
          tables={prgl.dbsTables}
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
