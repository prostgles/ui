import { ROUTES } from "@common/utils";
import {
  mdiAccountMultiple,
  mdiServerNetwork,
  mdiServerSecurity,
} from "@mdi/js";
import { useMemo } from "react";
import type { PrglState } from "src/App";
import { t } from "src/i18n/i18nUtils";
import { isDefined } from "src/utils";

export const useNavBarItems = ({ user, serverState }: PrglState) => {
  return useMemo(() => {
    return [
      {
        label: t["App"]["Connections"],
        to: ROUTES.CONNECTIONS,
        iconPath: mdiServerNetwork,
      },
      serverState.isElectron ? undefined : (
        {
          label: t["App"]["Users"],
          to: ROUTES.USERS,
          forAdmin: true,
          iconPath: mdiAccountMultiple,
        }
      ),
      {
        label: t["App"]["Server settings"],
        to: ROUTES.SERVER_SETTINGS,
        forAdmin: true,
        iconPath: mdiServerSecurity,
      },

      // { label: "Permissions", to: "/access-management", forAdmin: true },
    ]
      .filter(isDefined)
      .filter((o) => !o.forAdmin || user?.type === "admin");
  }, [user, serverState]);
};
