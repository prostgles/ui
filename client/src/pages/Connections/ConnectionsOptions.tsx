import { mdiAlert, mdiCogOutline } from "@mdi/js";
import React from "react";
import type { AppContextProps } from "../../App";
import Btn from "@components/Btn";
import ConfirmationDialog from "@components/ConfirmationDialog";
import PopupMenu from "@components/PopupMenu";
import { SwitchToggle } from "@components/SwitchToggle";
import { t } from "../../i18n/i18nUtils";
import type { useConnections } from "./useConnections";

type P = Pick<AppContextProps, "dbs" | "user"> &
  ReturnType<typeof useConnections>;

export const ConnectionsOptions = ({
  dbs,
  connections,
  isAdmin,
  user,
  setShowDbNames,
  showDbNames,
  setShowStateConfirm,
  showStateConfirm,
  showStateConn,
}: P) => {
  if (!user || !connections) return null;

  const canViewStateDB =
    !!connections.length &&
    connections.some((c) => "is_state_db" in c && c.is_state_db);

  if (!isAdmin) return null;
  return (
    <>
      <PopupMenu
        className="ml-auto"
        clickCatchStyle={{ opacity: 0 }}
        positioning="beneath-right"
        onClickClose={false}
        contentClassName="p-p5"
        data-command="ConnectionsOptions"
        button={<Btn title={t.common.Options} iconPath={mdiCogOutline} />}
      >
        {canViewStateDB && (
          <SwitchToggle
            label={t.Connections["Show state connection"]}
            data-command="ConnectionsOptions.showStateDatabase"
            checked={!!showStateConn}
            onChange={(checked, e) => {
              if (checked) {
                setShowStateConfirm(e.currentTarget);
              } else {
                dbs.users.update(
                  { id: user.id },
                  { options: { $merge: [{ showStateDB: false }] } },
                );
              }
            }}
          />
        )}
        <SwitchToggle
          label={t.Connections["Show database names"]}
          data-command="ConnectionsOptions.showDatabaseNames"
          checked={showDbNames}
          onChange={(showDbNames) => {
            setShowDbNames(showDbNames);
          }}
        />
      </PopupMenu>
      {showStateConfirm && (
        <ConfirmationDialog
          positioning={"beneath-center"}
          anchorEl={showStateConfirm}
          iconPath={mdiAlert}
          message={
            t.Connections[
              "Editing state data directly may break functionality. Proceed at your own risk!"
            ]
          }
          onClose={() => {
            setShowStateConfirm(undefined);
          }}
          onAccept={async () => {
            await dbs.users.update(
              { id: user.id },
              { options: { $merge: [{ showStateDB: true }] } },
            );
            setShowStateConfirm(undefined);
          }}
          acceptBtn={{
            color: "action",
            text: "OK",
            dataCommand: "Connections.add",
          }}
          asPopup={true}
        />
      )}
    </>
  );
};
