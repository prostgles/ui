import React, { useState } from 'react';
import Btn from "../../components/Btn"; 
import { mdiCog } from '@mdi/js'; 
import type { SyncDataItem } from 'prostgles-client/dist/SyncedTable';
import { useEffectAsync } from 'prostgles-client/dist/react-hooks';
import FormField from "../../components/FormField/FormField";
import PopupMenu from '../../components/PopupMenu';
import { SwitchToggle } from "../../components/SwitchToggle";
import { DashboardProps } from '../Dashboard/Dashboard';
import { Workspace } from "../Dashboard/dashboardUtils";
import { useLocalSettings } from "../localSettings";
import { DashboardHotkeys } from "./DashboardHotkeys";
export { useEffectAsync };

const layoutType = [
  { key: "tab", label: "Tabs", subLabel: "Windows placed in the same tab" }, 
  { key: "col", label: "Columns", subLabel: "Windows placed top to bottom" },
  { key: "row", label: "Rows", subLabel: "Windows placed left to right" },
]

type P = Pick<DashboardProps, "prgl"> & {
  workspace: SyncDataItem<Workspace, true>;
}

export const DashboardMenuSettings = ({ workspace, prgl: { dbsMethods } }: P) => {
  const [dbSize, setDbSize] = useState("");

  useEffectAsync(async () => {
    if(!dbsMethods.getDBSize) return;
    setDbSize(await dbsMethods.getDBSize(workspace.connection_id));

  }, [dbsMethods, setDbSize, workspace]);

  const localSettings = useLocalSettings();
  
  return  <PopupMenu 
    button={(
      <Btn iconPath={mdiCog}
        title="Show settings"
        className=""
      />
    )}
    positioning="beneath-left"
    clickCatchStyle={{ opacity: 0.2 }}
    title="Workspace settings"
    render={() => {
      return <div className="flex-col gap-2 p-1"> 
        <SwitchToggle label={{ variant: "normal",
            label: "Hide all counts",
            info: "This will disable counts for the dashboard menu and table headers. Usefull when there is a performance downgrade",
            style: { color: "black" },
          }}
          style={{ marginLeft: "-.5em", color: "black" }}
          checked={!!workspace.options.hideCounts} 
          onChange={hideCounts => {
            workspace.$update({ options: { hideCounts } }, { deepMerge: true }); 
          }}
        /> 

        <SwitchToggle label={{ 
            label: "Show all my queries",
            info: "Will allow using queries from all your connections and not just the current one. Requires a page refresh",
            style: { color: "black" },
          }}
          style={{ marginLeft: "-.5em" }}
          checked={!!workspace.options.showAllMyQueries} 
          onChange={showAllMyQueries => {
            workspace.$update({ options: { showAllMyQueries  } }, { deepMerge: true });
            setTimeout(() => {
              window.location.reload()
            }, 500)
          }}
        /> 

        <FormField label={{ 
            label: "Default layout type",
            info: "Controls new window placement",
            style: { color: "black" },
          }}
          asColumn={true}
          fullOptions={layoutType} 
          value={workspace.options.defaultLayoutType} 
          onChange={defaultLayoutType => {
            workspace.$update({ options: { defaultLayoutType } }, { deepMerge: true }); 
          }} 
        />

        <div className="flex-row-wrap">
    
          <FormField label={{ 
              label: "Centered layout", 
              info: "Sets dashboard maximum width. Useful for wide screens. Will refresh page when changed",
              style: { color: "black" },
            }}
            asColumn={true}
            type="checkbox"
            value={localSettings.centeredLayout?.enabled} 
            onChange={enabled => {
              localSettings.$set({
                centeredLayout: {
                  enabled,
                  maxWidth: localSettings.centeredLayout?.maxWidth ?? 1200
                }
              })
              window.location.reload();
            }}
          />
          {localSettings.centeredLayout && <FormField 
              label={{ 
                label: "Max width (px)",
                style: { color: "black" }, 
              }} 
              asColumn={true}
              type="number"
              inputProps={{
                min: 500,
                max: 10000,
                step: 1
              }} 
              value={localSettings.centeredLayout.maxWidth || 700} 
              onChange={maxWidth => {
                if(!Number.isInteger(+maxWidth)) return;
                const maxAllowed = Math.round(.9 * window.innerWidth);
                if(+maxWidth > maxAllowed){
                  alert(`Cannot set a value higher than 90% (${maxAllowed}) of your current screen width`);
                  return;
                }
                localSettings.$set({
                  centeredLayout: {
                    enabled: true,
                    maxWidth: +maxWidth || 1200
                  }
                })
                window.location.reload();
              }} 
            />
            }
        </div>
        <div className="flex-col gap-1">
          <DashboardHotkeys />
        </div>
        {dbSize && <div className="text-1p5 font-18 ta-left">Database total size: {dbSize}</div>}
      </div>
    }}
  >
  </PopupMenu>
}