import { mdiAlertOutline } from "@mdi/js";
import React from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../../../commonTypes/utils";
import Btn from "../components/Btn";
import { InfoRow } from "../components/InfoRow";
import PopupMenu from "../components/PopupMenu";
import { t } from "../i18n/i18nUtils";
import type { useAppState } from "../useAppState/useAppState";

type P = Pick<ReturnType<typeof useAppState>, "serverState" | "user">;
export const XRealIpSpoofableAlert = ({ serverState, user }: P) => {
  return (
    <>
      {serverState?.xRealIpSpoofable && user?.type === "admin" && (
        <PopupMenu
          button={
            <Btn color="danger" iconPath={mdiAlertOutline} variant="filled">
              {t["App"]["Security issue"]}
            </Btn>
          }
          style={{ position: "fixed", right: 0, top: 0, zIndex: 999999 }}
          positioning="beneath-left-minfill"
          clickCatchStyle={{ opacity: 0.5 }}
          content={
            <InfoRow>
              Failed login rate limiting is based on x-real-ip header which can
              be spoofed based on your current connection.{" "}
              <NavLink to={ROUTES.SERVER_SETTINGS}>
                {t["App"]["Settings"]}
              </NavLink>
            </InfoRow>
          }
        />
      )}
    </>
  );
};
