import { FlexCol } from "@components/Flex";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { SwitchToggle } from "@components/SwitchToggle";
import React from "react";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import type {
  ColumnConfig,
  NestedDisplay,
} from "@common/ColumnConfig/ColumnConfig";
import { getColumnDrillDownDisabledInfo } from "../ColumnDisplayFormat/getColumnDrillDownDisabledInfo";
import {
  ColumnStyleControls,
  type StyleColumnProps,
} from "./ColumnStyleControls";

type Props = Pick<StyleColumnProps, "db" | "tables" | "tableName"> & {
  column: ColumnConfigWithInfo;
  parentDisplay?: NestedDisplay["type"];
  onUpdate: (update: Partial<ColumnConfig>) => void;
};

export const ColumnStyleMenu = ({
  column,
  onUpdate,
  parentDisplay,
  ...props
}: Props) => {
  const { nested } = column;
  if (nested?.display?.type === "timechart") return null;
  const drillableRecords = nested?.display?.type === "drillable-records";
  const showNestedColumnStyles = !drillableRecords && nested;
  const columns =
    showNestedColumnStyles ? nested.columns.filter((c) => c.show) : [column];

  return (
    <FlexCol className="gap-1">
      {columns.map((c) => {
        const update = (
          changes: Partial<Pick<ColumnConfig, "style" | "label" | "display">>,
        ) => {
          if (!showNestedColumnStyles) {
            onUpdate(changes);
            return;
          }
          onUpdate({
            nested: {
              ...nested,
              columns: nested.columns.map((child) =>
                child.name === c.name ? { ...child, ...changes } : child,
              ),
            },
          });
        };
        return (
          <FlexCol key={c.name} data-key={c.name} className="gap-p5">
            {nested && (
              <div className="bold">{c.label || c.info?.label || c.name}</div>
            )}
            <FormFieldDebounced
              label="Label"
              type="text"
              value={c.label ?? ""}
              placeholder={c.info?.label || c.name}
              onChange={(label) => update({ label })}
            />
            <SwitchToggle
              label="Drill down to records"
              title="Open the records behind this value; useful for aggregates."
              disabledInfo={getColumnDrillDownDisabledInfo(
                c,
                showNestedColumnStyles ? "values" : parentDisplay,
              )}
              checked={drillableRecords || c.display === "drillable-records"}
              onChange={(checked) =>
                update({ display: checked ? "drillable-records" : undefined })
              }
            />
            <ColumnStyleControls
              {...props}
              tableName={nested?.path.at(-1)?.table ?? props.tableName}
              column={c}
              tsDataType={c.tsDataType}
              udt_name={c.udt_name}
              onUpdate={update}
            />
          </FlexCol>
        );
      })}
    </FlexCol>
  );
};
