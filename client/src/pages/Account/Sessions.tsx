import {
  mdiApple,
  mdiAppleSafari,
  mdiCellphone,
  mdiDelete,
  mdiFirefox,
  mdiGoogleChrome,
  mdiLaptop,
  mdiLinux,
  mdiMicrosoftEdge,
  mdiMicrosoftWindows,
} from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import type { DivProps } from "../../components/Flex";
import { classOverride, FlexRow } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import SmartCardList from "../../dashboard/SmartCard/SmartCardList";
import {
  StyledInterval,
  renderInterval,
} from "../../dashboard/W_SQL/customRenderers";
import { Icon } from "../../components/Icon/Icon";
import { t } from "../../i18n/i18nUtils";

type SessionsProps = Pick<
  Prgl,
  "dbs" | "dbsTables" | "user" | "dbsMethods" | "theme"
> & {
  displayType: "web_session" | "api_token";
  className?: string;
};

export const getActiveTokensFilter = (
  type: SessionsProps["displayType"],
  user_id: string | undefined,
) =>
  ({
    user_id,
    type: type === "api_token" ? "api_token" : "web",
    $filter: [{ $ageNow: ["expires"] }, "<", "0"],
    active: true,
  }) as AnyObject;

export const Sessions = ({
  dbs,
  dbsTables,
  user,
  displayType,
  className = "",
  dbsMethods,
  theme,
}: SessionsProps) => {
  if (!user) return null;

  const tokenMode = displayType === "api_token";
  const sessionLabel =
    tokenMode ? t.Sessions["API tokens"] : t.Sessions["Sessions"];

  return (
    <SmartCardList
      title={tokenMode ? undefined : ({ count }) => `${sessionLabel} ${count}`}
      db={dbs as any}
      theme={theme}
      methods={dbsMethods}
      tableName="sessions"
      tables={dbsTables}
      filter={getActiveTokensFilter(displayType, user.id) as AnyObject}
      realtime={true}
      style={{
        maxHeight: "40vh",
      }}
      className={"min-h-0 f-1 " + className}
      noDataComponent={
        <InfoRow color="info" style={{ alignItems: "center" }}>
          {t.Sessions["No active "]}
          {sessionLabel}
        </InfoRow>
      }
      noDataComponentMode="hide-all"
      orderBy={{
        id_num: false,
      }}
      limit={10}
      showEdit={false}
      fieldConfigs={[
        { name: "is_connected", hide: true },
        {
          name: "active",
          label: " ",
          render: (v) => (
            <StatusDotCircleIcon
              className="my-p5"
              title={v ? t.Sessions.Active : t.Sessions.Inactive}
              color={v ? "green" : "red"}
            />
          ),
        },
        {
          name: "user_agent",
          hide: displayType === "api_token",
          render: (v, row) => {
            const os = (
              v.match(/Windows|Linux|Mac|Android|iOS/i)?.[0] ?? ""
            ).toLowerCase();
            const browser = (
              v.match(/Chrome|Firefox|Safari|Edge|Opera/i)?.[0] ?? ""
            ).toLowerCase();
            return (
              <PopupMenu
                title={t.Sessions["User agent"]}
                button={
                  <FlexRow className="gap-0 pointer">
                    <Btn
                      title={
                        row.is_connected ? "User is connected" : (
                          "User is offline"
                        )
                      }
                      style={{ color: row.is_connected ? "green" : undefined }}
                      iconPath={isMobileUserAgent(v) ? mdiCellphone : mdiLaptop}
                    />
                    {!!os && (
                      <Icon
                        title={os}
                        size={1}
                        path={
                          os === "linux" ? mdiLinux
                          : os === "windows" ?
                            mdiMicrosoftWindows
                          : os === "mac" || os === "ios" ?
                            mdiApple
                          : ""
                        }
                      />
                    )}
                    {!!browser && (
                      <Icon
                        title={browser}
                        size={1}
                        path={
                          browser === "chrome" ? mdiGoogleChrome
                          : browser === "firefox" ?
                            mdiFirefox
                          : browser === "safari" ?
                            mdiAppleSafari
                          : browser === "edge" ?
                            mdiMicrosoftEdge
                          : ""
                        }
                      />
                    )}
                  </FlexRow>
                }
                render={() => <div className="">{v}</div>}
              />
            );
          },
        },
        {
          name: "last_usedd",
          select: { $ageNow: ["last_used", null, "second"] },
          label: t.Sessions["Last used"],
          renderValue: (value) => <StyledInterval value={value} />,
        },
        { name: "ip_address", hide: displayType === "api_token" },
        {
          name: "createdd",
          select: { $ageNow: ["created", null, "second"] },
          label: t.Sessions.Created,
          renderValue: (v) => renderInterval(v, true, true),
        },
        {
          name: "expiress",
          select: { $ageNow: ["expires", null, "hour"] },
          label: t.Sessions.Expires,
          hideIf: (_, row) => !row.active,
          renderValue: (v) => {
            return renderInterval(v, true, true);
          },
        },
        {
          name: "id_num",
          label: " ",
          style: { marginLeft: "auto" },
          render: (v) =>
            !!v && (
              <Btn
                title={t.Sessions.Disable}
                variant="faded"
                color="danger"
                iconPath={mdiDelete}
                onClickPromise={async () => {
                  // return dbs.sessions.update({ id_num: v }, { active: false })
                  await dbs.sessions.delete({ id_num: v });
                }}
              />
            ),
        },
      ]}
    />
  );
};

function isMobileUserAgent(v: string) {
  const toMatch = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
  ];

  return toMatch.some((toMatchItem) => {
    return v.match(toMatchItem);
  });
}

type StatusDotCircleIconProps = {
  title?: string;
  color: "green" | "red" | "gray";
} & Pick<DivProps, "className" | "style">;
export const StatusDotCircleIcon = ({
  title,
  color,
  style = {},
  className = "",
}: StatusDotCircleIconProps) => {
  return (
    <div
      title={title}
      className={classOverride("shadow", className)}
      style={{
        borderRadius: "100%",
        width: "12px",
        height: "12px",
        background: `var(--${color}-500)`,
        ...style,
      }}
    />
  );
};
