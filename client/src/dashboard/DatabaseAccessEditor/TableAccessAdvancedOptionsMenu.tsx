import { isObject } from "@common/publishUtils";
import Btn from "@components/Btn";
import Popup from "@components/Popup/Popup";
import { mdiCog } from "@mdi/js";
import React, { useState } from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { TableAccessAdvancedOptions } from "./TableAccessAdvancedOptions";
import type {
  TableAccessPermissions,
  TableRuleType,
} from "./TableAccessEditor";
import { classOverride } from "@components/Flex";

type P = {
  ruleType: TableRuleType;
  tableRules: TableAccessPermissions;
  table: DBSchemaTableWJoins;
  onChange: (newRule: TableAccessPermissions) => void;
  className?: string;
};
export const TableAccessAdvancedOptionsMenu = ({
  ruleType,
  tableRules,
  table,
  onChange,
  className,
}: P) => {
  const ruleValue = tableRules[ruleType];
  const [show, setShow] = useState(false);

  return (
    <>
      <Btn
        data-command={`${ruleType}RuleAdvanced`}
        size="small"
        className={classOverride(
          isObject(ruleValue) ? "" : "show-on-parent-hover",
          className,
        )}
        style={{
          visibility: ruleValue ? undefined : "hidden",
        }}
        iconPath={mdiCog}
        color={isObject(ruleValue) ? "action" : undefined}
        onClick={() => setShow(!show)}
      />
      {show && (
        <Popup
          title={`${ruleType.toUpperCase()} rule options for ${JSON.stringify(table.name)}`}
          positioning="center"
          clickCatchStyle={{ opacity: 1 }}
          onClose={() => setShow(false)}
          contentClassName="flex-col gap-1 p-1"
        >
          <TableAccessAdvancedOptions
            table={table}
            onChange={onChange}
            ruleType={ruleType}
            tableRules={tableRules}
          />
        </Popup>
      )}
    </>
  );
};
