import React, { useState } from "react";
import { useIsMounted } from "../Backup/CredentialSelector";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { useEffectAsync } from "../DashboardMenu/DashboardMenuSettings";
import Window from "../Window";
import { W_MethodMenu } from "./W_MethodMenu";
import { W_MethodControls } from "./W_MethodControls";

export type W_MethodProps = Omit<CommonWindowProps, "w"> & {
  w: WindowSyncItem<"method">;
};
export const W_Method = (allProps: W_MethodProps) => {
  const { tables, ...props } = allProps;

  const [w, setW] = useState(allProps.w);

  const getIsMounted = useIsMounted();
  useEffectAsync(async () => {
    const wSync = await props.w.$cloneSync((newW, deltaW) => {
      if (!getIsMounted()) return;
      setW(newW);
    });

    return wSync.$unsync;
  }, [props.w, getIsMounted]);

  const setOpts = (newOpts: Partial<(typeof w)["options"]>) => {
    w.$update({ options: { ...w.options, ...newOpts } }, { deepMerge: false });
  };

  return (
    <Window
      w={w as any}
      getMenu={(w, closeMenu) => (
        <W_MethodMenu {...allProps} w={w as any} closeMenu={closeMenu} />
      )}
    >
      <W_MethodControls
        {...allProps.prgl}
        method_name={w.method_name}
        w={w}
        setState={setOpts}
        state={w.options}
      />
    </Window>
  );
};
