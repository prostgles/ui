import { useIsMounted } from "prostgles-client";
import React, { useEffect, useState } from "react";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import Window from "../Window/Window";
import { W_MethodControls } from "./W_MethodControls";
import { W_MethodMenu } from "./W_MethodMenu";

export type W_MethodProps = Omit<CommonWindowProps, "w"> & {
  w: WindowSyncItem<"method">;
};
export const W_Method = (props: W_MethodProps) => {
  const [w, setW] = useState(props.w);

  const getIsMounted = useIsMounted();
  useEffect(() => {
    const wSync = props.w.$cloneSync((newW, deltaW) => {
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
      w={w}
      childWindow={undefined}
      tables={props.prgl.tables}
      layoutMode={props.workspace.layout_mode ?? "editable"}
      getMenu={(w, closeMenu) => (
        <W_MethodMenu {...props} w={w} closeMenu={closeMenu} />
      )}
    >
      <W_MethodControls
        {...props.prgl}
        method_name={w.method_name}
        w={w}
        setState={setOpts}
        state={w.options}
      />
    </Window>
  );
};
