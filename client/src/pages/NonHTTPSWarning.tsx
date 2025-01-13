import { mdiAlertBox } from "@mdi/js";
import type { AppState } from "../App";
import { InfoRow } from "../components/InfoRow";
import Btn from "../components/Btn";
import React from "react";
import { pageReload } from "../components/Loading";

export const NonHTTPSWarning = ({
  dbs,
  auth,
}: Required<AppState>["prglState"]) => {
  const authUser = auth.user;
  if (
    location.protocol !== "https:" &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1" &&
    !authUser?.options?.hideNonSSLWarning
  ) {
    const canUpdateUsers = !!dbs.users.update as boolean;
    return (
      <InfoRow
        color="danger"
        iconPath={mdiAlertBox}
        className="m-p5 bg-color-0 ai-center"
        contentClassname="flex-row-wrap gap-1 ai-center"
      >
        <div>
          Your are accessing this page over a non-HTTPS connection! You should
          not enter any sensitive information on this site (passwords, secrets)
        </div>
        {canUpdateUsers && (
          <Btn
            variant="faded"
            onClickPromise={async () => {
              dbs.users.update(
                { id: authUser?.id },
                { options: { $merge: [{ hideNonSSLWarning: true }] } },
              );
              pageReload("hideNonSSLWarning toggle");
            }}
          >
            Do not show again
          </Btn>
        )}
      </InfoRow>
    );
  }

  return null;
};
