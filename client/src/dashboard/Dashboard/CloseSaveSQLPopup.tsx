import React from "react";
import type { WindowSyncItem } from "./dashboardUtils";
import Popup from "../../components/Popup/Popup";
import FormField from "../../components/FormField/FormField";
import Btn from "../../components/Btn";
import { mdiContentSave, mdiDelete } from "@mdi/js";

type P = {
  namePopupWindow?: { w: WindowSyncItem; node: HTMLButtonElement };
  onClose: VoidFunction;
  windows: WindowSyncItem[];
};
export const CloseSaveSQLPopup = ({
  namePopupWindow: nw,
  windows,
  onClose,
}: P) => {
  const namePopupWindow = nw ? windows.find((w) => w.id === nw.w.id) : null;
  if (namePopupWindow && nw) {
    return (
      <Popup
        title={"Save query?"}
        onClose={onClose}
        anchorEl={nw.node}
        positioning={"beneath-left"}
        clickCatchStyle={{ opacity: 0.2 }}
        footerButtons={[
          {
            label: "Delete",
            color: "danger",
            "data-command": "CloseSaveSQLPopup.delete",
            variant: "outline",
            iconPath: mdiDelete,
            onClickPromise: async () => {
              await namePopupWindow.$update({ closed: true, deleted: true });
              onClose();
            },
          },
          {
            label: "Save",
            color: "action",
            variant: "filled",
            iconPath: mdiContentSave,
            onClickPromise: async () => {
              if (!namePopupWindow.name) alert("Cannot have an empty name");
              else {
                await namePopupWindow.$update(
                  {
                    closed: true,
                    deleted: false,
                    options: { sqlWasSaved: true },
                  },
                  { deepMerge: true },
                );
              }
              setTimeout(() => {
                onClose();
              }, 500);
            },
          },
        ]}
        content={
          <div className="flex-col">
            <FormField
              type="text"
              asColumn={true}
              label="Name"
              defaultValue={namePopupWindow.name}
              required={true}
              onChange={(v) => {
                namePopupWindow.$update(
                  { name: v, options: { sqlWasSaved: true } },
                  { deepMerge: true },
                );
              }}
            />
          </div>
        }
      />
    );
  }

  return <></>;
};
