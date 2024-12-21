import { mdiCog, mdiTable, mdiViewGridPlus } from "@mdi/js";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { useEffectAsync, usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import Btn from "../../components/Btn";
import FormField from "../../components/FormField/FormField";
import { pageReload } from "../../components/Loading";
import PopupMenu from "../../components/PopupMenu";
import { SwitchToggle } from "../../components/SwitchToggle";
import type { DashboardProps } from "../Dashboard/Dashboard";
import type { Workspace } from "../Dashboard/dashboardUtils";
import { useLocalSettings } from "../localSettings";
import { DashboardHotkeys } from "./DashboardHotkeys";
import { SettingsSection } from "./SettingsSection";
export { useEffectAsync };

const layoutType = [
  { key: "tab", label: "Tabs", subLabel: "Windows placed in the same tab" },
  { key: "col", label: "Columns", subLabel: "Windows placed top to bottom" },
  { key: "row", label: "Rows", subLabel: "Windows placed left to right" },
];

type P = Pick<DashboardProps, "prgl"> & {
  workspace: SyncDataItem<Workspace, true>;
};

export const DashboardMenuSettings = ({
  workspace,
  prgl: { dbsMethods },
}: P) => {
  const dbSize = usePromise(
    async () => dbsMethods.getDBSize?.(workspace.connection_id),
    [dbsMethods, workspace],
  );

  const localSettings = useLocalSettings();

  return (
    <PopupMenu
      button={
        <Btn
          iconPath={mdiCog}
          title="Show settings"
          className=""
          data-command="dashboard.menu.settingsToggle"
        />
      }
      data-command="dashboard.menu.settings"
      positioning="center"
      clickCatchStyle={{ opacity: 0.2 }}
      title="Dashboard settings"
      contentClassName="p-0"
      render={() => {
        return (
          <div className="flex-col gap-2 p-1">
            <SettingsSection title="Dashboard menu" iconPath={mdiTable}>
              <FormField
                label={{
                  label: "Sort table list",
                }}
                fullOptions={[
                  {
                    key: "name",
                    label: "Name",
                    subLabel: "Sort by name",
                  },
                  {
                    key: "extraInfo",
                    label: "Extra info",
                    subLabel: "Sort by table list extra info (size/count)",
                  },
                ]}
                value={workspace.options.tableListSortBy}
                onChange={(tableListSortBy) => {
                  workspace.$update(
                    { options: { tableListSortBy } },
                    { deepMerge: true },
                  );
                }}
              />
              <FormField
                label={{
                  label: "Table list extra info",
                  info: "Table/view information shown after the table name in the table list",
                }}
                fullOptions={[
                  {
                    key: "none",
                    label: "None",
                    subLabel: "No extra info",
                  },
                  {
                    key: "count",
                    label: "Count",
                    subLabel: "Total number of rows current user has access to",
                  },
                  {
                    key: "size",
                    label: "Size",
                    subLabel: "Total size of the table (must be superuser)",
                  },
                ]}
                value={workspace.options.tableListEndInfo}
                onChange={(tableListEndInfo) => {
                  workspace.$update(
                    { options: { tableListEndInfo } },
                    { deepMerge: true },
                  );
                }}
              />
              <SwitchToggle
                label={{
                  label: "Show all my queries",
                  info: "Will allow using queries from all your connections and not just the current one",
                }}
                style={{ marginLeft: "-.5em" }}
                checked={!!workspace.options.showAllMyQueries}
                onChange={(showAllMyQueries) => {
                  workspace.$update(
                    { options: { showAllMyQueries } },
                    { deepMerge: true },
                  );
                }}
              />
            </SettingsSection>

            <SettingsSection
              title="Dashboard layout"
              iconPath={mdiViewGridPlus}
            >
              <SwitchToggle
                label={{
                  variant: "normal",
                  label: "Hide all counts",
                  info: "This will disable counts for the table/view headers. Usefull when there is a performance downgrade",
                }}
                style={{
                  marginLeft: "-.5em",
                }}
                checked={!!workspace.options.hideCounts}
                onChange={(hideCounts) => {
                  workspace.$update(
                    { options: { hideCounts } },
                    { deepMerge: true },
                  );
                }}
              />
              <SwitchToggle
                label={{
                  label: "Centered layout",
                  info: "Centered layout allows you to center align the dashboard area. This is particularly useful when working on a wide monitor",
                }}
                style={{ marginLeft: "-.5em" }}
                checked={!!localSettings.centeredLayout?.enabled}
                onChange={(enabled) => {
                  localSettings.$set({
                    centeredLayout: {
                      enabled,
                      maxWidth: localSettings.centeredLayout?.maxWidth ?? 1200,
                    },
                  });
                  pageReload("centeredLayout toggled");
                }}
              />

              <FormField
                label={{
                  label: "Default layout type",
                  info: "Controls new window placement",
                }}
                data-command="dashboard.menu.settings.defaultLayoutType"
                fullOptions={layoutType}
                value={workspace.options.defaultLayoutType}
                onChange={(defaultLayoutType) => {
                  workspace.$update(
                    { options: { defaultLayoutType } },
                    { deepMerge: true },
                  );
                }}
              />
            </SettingsSection>
            <div className="flex-col gap-1">
              <DashboardHotkeys />
            </div>
            {dbSize && (
              <div className="mt-2 text-1 font-18 ta-left">
                Database total size: {dbSize}
              </div>
            )}
          </div>
        );
      }}
    ></PopupMenu>
  );
};
