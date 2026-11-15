import { FlexRow } from "@components/Flex";
import { SvgIcon } from "@components/SvgIcon";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";

export const SmartFormHeader = ({
  table,
  headerText,
}: {
  table: DBSchemaTableWJoins;
  headerText: string;
}) => (
  <FlexRow data-command="SmartForm.header.tableIconAndName" className="gap-p25">
    {table.icon && <SvgIcon size={24} icon={table.icon} />}
    <span className="text-ellipsis ws-nowrap" title={headerText}>
      {headerText}
    </span>
  </FlexRow>
);

export const getSmartFormHeaderText = (
  table: DBSchemaTableWJoins,
  row: AnyObject | undefined,
): string =>
  (table.card?.headerColumn &&
    (row?.[table.card.headerColumn] as string | undefined)) ||
  table.label ||
  table.comment ||
  table.name;
