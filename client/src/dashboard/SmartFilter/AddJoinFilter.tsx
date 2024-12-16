import React from "react";
import type {
  JOINED_FILTER_TYPES,
  JoinedFilter,
} from "../../../../commonTypes/filterUtils";
import type { DBSchemaTablesWJoins, JoinV2 } from "../Dashboard/dashboardUtils";
import {
  JoinPathSelector,
  getHasJoins,
} from "../W_Table/JoinPathSelector/JoinPathSelector";
import { getFilterableCols } from "./SmartSearch/SmartSearch";
import { Label } from "../../components/Label";
import { FlexCol, FlexRow } from "../../components/Flex";
import Btn from "../../components/Btn";
import { mdiSetCenter, mdiSetNone } from "@mdi/js";

type JoinOpts = { path: JoinV2[]; type: JoinedFilter["type"] };
type AddJoinFilterProps = {
  tables: DBSchemaTablesWJoins;
  tableName: string;
  path?: JoinV2[];
  type?: JoinedFilter["type"];
  onChange: (joinOpts: undefined | JoinOpts) => void;
  disabledInfo?: string;
};
export const JOIN_FILTER_TYPES = [
  {
    key: "$existsJoined",
    label: "Exists",
    subLabel: "At least one matching record exists in the target table",
    iconPath: mdiSetCenter,
  },
  {
    key: "$notExistsJoined",
    label: "Not Exists",
    subLabel: "No matching records exists in the target table",
    iconPath: mdiSetNone,
  },
] satisfies {
  key: (typeof JOINED_FILTER_TYPES)[number];
  label: string;
  subLabel: string;
  iconPath: string;
}[];

export const AddJoinFilter = ({
  tables,
  tableName,
  path,
  type = "$existsJoined",
  onChange,
  disabledInfo,
}: AddJoinFilterProps) => {
  const joinableTables = tables.filter(
    (t) => getFilterableCols(t.columns).length,
  );
  const hasJoins = getHasJoins(tableName, tables);

  if (!hasJoins) return null;

  const title = path ? "Cancel" : "Join to...";
  return (
    <FlexCol className="gap-0">
      {path && (
        <div className="flex-col f-1 o-auto br b-color">
          <Label className="px-1 py-p5 w-full bg-color-2">
            Current join path
          </Label>
          <JoinPathSelector
            tables={joinableTables}
            tableName={tableName}
            onSelect={(path) => {
              onChange({ path, type });
            }}
          />
        </div>
      )}
      <FlexRow className={"p-p5"}>
        {!path && (
          <Btn
            title={title}
            iconPath={mdiSetCenter}
            disabledInfo={disabledInfo}
            data-command="SmartAddFilter.JoinTo"
            color={"action"}
            variant={"faded"}
            onClick={() => {
              onChange({ path: [], type });
            }}
          >
            {title}
          </Btn>
        )}
      </FlexRow>
    </FlexCol>
  );
};
