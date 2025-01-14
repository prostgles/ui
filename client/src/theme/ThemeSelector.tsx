import { mdiThemeLightDark } from "@mdi/js";
import React from "react";
import type { ExtraProps } from "../App";
import Select from "../components/Select/Select";
import { t } from "../i18n/i18nUtils";

type P = Pick<ExtraProps, "dbs"> & {
  userThemeOption: "light" | "dark" | "from-system";
  serverState: undefined | ExtraProps["serverState"];
  userId: string | undefined;
};
export const ThemeSelector = ({
  serverState,
  dbs,
  userId,
  userThemeOption,
}: P) => {
  return (
    <Select
      title={t.common.Theme}
      btnProps={{
        variant: "default",
        iconPath: mdiThemeLightDark,
        children:
          window.isLowWidthScreen || !!serverState?.isElectron ?
            t.common.Theme
          : "",
      }}
      data-command="App.colorScheme"
      value={userThemeOption}
      fullOptions={[
        { key: "light", label: "Light" },
        { key: "dark", label: "Dark" },
        { key: "from-system", label: "System" },
      ]}
      onChange={(theme) => {
        if (!userId) return;

        dbs.users.update({ id: userId }, { options: { $merge: [{ theme }] } });
      }}
    />
  );
};
