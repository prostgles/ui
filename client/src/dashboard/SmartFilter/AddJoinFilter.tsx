import type { DetailedJoinedFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { mdiSetCenter } from "@mdi/js";
import React from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { ParsedJoinPath } from "prostgles-types";
import { JoinPathSelectorV2 } from "../W_Table/ColumnMenu/JoinPathSelectorV2";
import { getFilterableCols } from "./SmartSearch/SmartSearch";

type JoinOpts = { path: ParsedJoinPath[]; type: DetailedJoinedFilter["type"] };
type AddJoinFilterProps = {
  tables: DBSchemaTableWJoins[];
  tableName: string;
  path?: ParsedJoinPath[];
  type?: DetailedJoinedFilter["type"];
  onChange: (joinOpts: undefined | JoinOpts) => void;
  disabledInfo?: string;
};

export const AddJoinFilter = ({
  tables,
  tableName,
  path,
  type = "$existsJoined",
  onChange,
  disabledInfo,
}: AddJoinFilterProps) => {
  const hasJoins = tables.find((table) => table.name === tableName)?.joinOptions
    .length;

  if (!hasJoins) return null;

  const title = path ? "Cancel" : "Join to...";
  return (
    <FlexCol className="gap-0 f-1" data-command="AddJoinFilter">
      {path && (
        <div className="flex-col f-1 o-auto br b-color">
          <Label className="px-1 py-p5 w-full bg-color-2">
            Current join path
          </Label>
          <JoinPathSelectorV2
            tables={tables}
            tableName={tableName}
            value={path}
            getFullOption={(joinPath) => ({
              disabledInfo:
                (
                  getFilterableCols(
                    tables.find(
                      (table) => table.name === joinPath.at(-1)?.table,
                    )?.columns ?? [],
                  ).length
                ) ?
                  undefined
                : "No filterable columns",
            })}
            onChange={({ path }) => {
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
