import Btn from "@components/Btn";
import { mdiDockLeft, mdiDockWindow } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { t } from "../../i18n/i18nUtils";
import { getIsPinnedMenu } from "../Dashboard/Dashboard";
import { Feedback } from "../Feedback";

export const DashboardMenuFooter = ({
  onClose,
}: {
  onClose: VoidFunction | undefined;
}) => {
  const { user, dbs, dbsMethods } = usePrgl();
  const pinnedMenu = getIsPinnedMenu(user);
  return (
    <footer className="relative f-0 flex-row ai-center bt b-color p-p5">
      {user && (
        <Btn
          iconPath={pinnedMenu ? mdiDockWindow : mdiDockLeft}
          disabledInfo={
            window.isLowWidthScreen ?
              t.DashboardMenuHeader["Cannot be used in a low width device"]
            : undefined
          }
          title={t.DashboardMenuHeader["Pin/Unpin"]}
          data-command="DashboardMenu.togglePinned"
          data-key={pinnedMenu ? "pinned" : "unpinned"}
          aria-pressed={pinnedMenu}
          size="small"
          onClickPromise={async () => {
            await dbs.users.update(
              { id: user.id },
              { options: { $merge: [{ pinnedMenu: !pinnedMenu }] } },
            );
            onClose?.();
          }}
        />
      )}
      <div className="ml-auto">
        <Feedback dbsMethods={dbsMethods} />
      </div>
    </footer>
  );
};
