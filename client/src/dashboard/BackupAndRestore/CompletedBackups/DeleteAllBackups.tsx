import Btn from "@components/Btn";
import { CodeConfirmation } from "../CodeConfirmation";
import { InfoRow } from "@components/InfoRow";
import { mdiDelete } from "@mdi/js";
import React from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { DBSSchema } from "@common/publishUtils";
import { type AnyObject } from "prostgles-types";

type DeleteAllBackupsProps = {
  filter: AnyObject;
  filterName: string;
};

export const DeleteAllBackups = ({
  filter,
  filterName,
}: DeleteAllBackupsProps) => {
  const { dbs, dbsMethods } = usePrglCore();
  const onDeleteAll = async () => {
    let bkp: DBSSchema["backups"] | undefined;
    do {
      bkp = await dbs.backups.findOne(filter);
      if (bkp) {
        await dbsMethods.bkpDelete!({ bkpId: bkp.id, force: true });
      }
    } while (bkp);
  };

  return (
    <CodeConfirmation
      className="ml-p25"
      positioning="center"
      data-command="BackupControls.DeleteAll"
      button={
        <Btn iconPath={mdiDelete} color="danger" title="Will need to confirm">
          Delete all...
        </Btn>
      }
      message={
        <InfoRow style={{ alignItems: "center" }} color="danger">
          Will delete ALL backup files from storage for{" "}
          <strong>{filterName}</strong>. This action is not reversible!
        </InfoRow>
      }
      confirmButtons={[
        {
          iconPath: mdiDelete,
          variant: "outline",
          color: "danger",
          "data-command": "BackupControls.DeleteAll.Confirm",
          onClickPromise: onDeleteAll,
          children: "Force delete backups",
        },
      ]}
    />
  );
};
