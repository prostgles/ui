import { mdiBellBadgeOutline, mdiDelete } from "@mdi/js"
import React from "react"
import type { Prgl } from "../App"
import Btn from "../components/Btn"
import { InfoRow } from "../components/InfoRow"
import PopupMenu from "../components/PopupMenu"
import SmartCardList from "../dashboard/SmartCard/SmartCardList"
import { FlexCol } from "../components/Flex"

export const Alerts = (prgl: Prgl) => {
  const { connectionId, dbs } = prgl
 
  const { data: alerts } = dbs.alerts.useSubscribe({ 
    //@ts-ignore
    $existsJoined: { "database_configs.connections": { id: connectionId } },
    $notExistsJoined: { "alert_viewed_by": { user_id: prgl.user?.id } } 
  });

  return <PopupMenu
    button={
      <div>
        <Btn
          variant="faded" 
          color={alerts?.length? "action" : undefined}
          iconPath={alerts?.length? mdiBellBadgeOutline : mdiBellBadgeOutline} 
          disabledInfo={alerts?.length? undefined : "No alerts"}
        />
      </div>
    }
    positioning="beneath-left"
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
    {!!alerts?.length && <SmartCardList 
      db={dbs as any}
      theme={prgl.theme}
      methods={prgl.dbsMethods}
      tables={prgl.dbsTables}
      tableName={"alerts"}
      filter={{ 
        $existsJoined: { "database_configs.connections": { id: connectionId } },
        $notExistsJoined: { "alert_viewed_by": { user_id: prgl.user?.id } } 
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
          name: "message",
          render: (message, { severity, title }: any) => 
            <InfoRow 
              variant="naked" 
              color={severity === "error"? "danger" : severity === "warning"? "warning" : "info"}
            >
              <FlexCol>
              {title && <div className="bold">{title}</div>}
              <div>
                {message}
              </div>
              </FlexCol>
            </InfoRow>
        },
        {
          name: "id",
          render: (alert_id) => <Btn 
            iconPath={mdiDelete}
            onClickPromise={() => 
              dbs.alert_viewed_by.insert({ alert_id, user_id: prgl.user?.id })
            }
          />
        }
      ]}
    />}
  </PopupMenu>
}