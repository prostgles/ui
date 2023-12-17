
import { SyncDataItem } from "prostgles-client/dist/SyncedTable";
import React, { useState } from "react";
import { useIsMounted } from "../Backup/CredentialSelector";
import { CommonWindowProps } from "../Dashboard/Dashboard";
import { WindowData, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { useEffectAsync } from "../DashboardMenu/DashboardMenuSettings";
import Window from "../Window";
import { MethodControls } from "./MethodControls";
import { ProstglesMethodMenu } from "./ProstglesMethodMenu";

export type ProstglesMethodProps = Omit<CommonWindowProps, "w"> & {  w: WindowSyncItem<"method">; }
export const ProstglesMethod = (allProps: ProstglesMethodProps) => {
  const { prgl: {db, methods}, tables, ...props } = allProps;
 
  const [w, setW] = useState(allProps.w);

  const getIsMounted = useIsMounted();
  useEffectAsync(async () => {
    const wSync = await props.w.$cloneSync((newW, deltaW) => { 
      if(!getIsMounted()) return;
      setW(newW) 
    });

    return wSync.$unsync;
  }, []);
  
  const setOpts = (newOpts: Partial<typeof w["options"]>) => {
    w.$update({ options: { ...w.options, ...newOpts} }, { deepMerge: false });
  } 
  
  return <Window 
    w={w as any}
    getMenu={(w, closeMenu)=> (
      <ProstglesMethodMenu 
        { ...allProps } 
        w={w as any} 
        closeMenu={closeMenu} 
      />
    )}
  >
    <MethodControls 
      {...allProps.prgl}
      method_name={w.method_name} 
      w={w} 
      setState={setOpts} 
      state={w.options} 
    />
  </Window>;
}