import { mdiBellBadgeOutline, mdiDelete } from "@mdi/js";
import React from "react";
import type { Prgl } from "../App";
import Btn from "../components/Btn";
import { InfoRow } from "../components/InfoRow";
import PopupMenu from "../components/PopupMenu";
import SmartCardList from "../dashboard/SmartCard/SmartCardList";
import { FlexCol, FlexRow } from "../components/Flex";
import { StyledInterval } from "../dashboard/W_SQL/customRenderers";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { NavLink } from "react-router-dom";
import { API_PATH_SUFFIXES } from "../../../commonTypes/utils";

export const Alerts = (prgl: Prgl) => {
  const { connectionId, dbs } = prgl;

  const { data: alerts } = dbs.alerts.useSubscribe({
    //@ts-ignore
    $existsJoined: { "database_configs.connections": { id: connectionId } },
    $notExistsJoined: { alert_viewed_by: { user_id: prgl.user?.id } },
  });

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
          db={dbs as any}
          theme={prgl.theme}
          methods={prgl.dbsMethods}
          tables={prgl.dbsTables}
          tableName={"alerts"}
          filter={{
            $existsJoined: {
              "database_configs.connections": { id: connectionId },
            },
            $notExistsJoined: { alert_viewed_by: { user_id: prgl.user?.id } },
          }}
          showEdit={false}
          rowProps={{
            className: "ai-center",
          }}
          fieldConfigs={[
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
              render: (
                message,
                {
                  severity,
                  title,
                  age,
                  id: alert_id,
                  connection_id,
                  section,
                }: DBSSchema["alerts"] & { age: any },
              ) => (
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
                          to={`${API_PATH_SUFFIXES.CONFIG}/${connection_id}?section=${section}`}
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
                        user_id: prgl.user?.id,
                      })
                    }
                  />
                </FlexRow>
              ),
            },
            {
              name: "id",
              hide: true,
            },
          ]}
        />
      )}
    </PopupMenu>
  );
};
