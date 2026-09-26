import { FlexCol } from "@components/Flex";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { Select } from "@components/Select/Select";
import React from "react";
import type { ColumnConfigWithInfo } from "../../W_Table";
import type { ColumnConfig } from "../ColumnConfig";
import {
  ColumnStyleControls,
  type StyleColumnProps,
} from "./ColumnStyleControls";

type Props = Pick<StyleColumnProps, "db" | "tables" | "tableName"> & {
  column: ColumnConfigWithInfo;
  isNested?: boolean;
  onUpdate: (update: Partial<ColumnConfig>) => void;
};

export const ColumnStyleMenu = ({
  column,
  onUpdate,
  isNested,
  ...props
}: Props) => {
  const { nested } = column;
  if (nested?.display?.type === "timechart") return null;
  const entities = nested?.display?.type === "entities";
  const showNestedColumnStyles =
    !entities && nested && nested.columns.some((c) => c.style);
  const columns =
    showNestedColumnStyles ? nested.columns.filter((c) => c.show) : [column];

  return (
    <FlexCol className="gap-1">
      {columns.map((c) => {
        const update = (
          changes: Partial<Pick<ColumnConfig, "style" | "label" | "action">>,
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
        const isAggregate = c.computedConfig?.funcDef.isAggregate;
        const actions = [
          { key: "none" as const, label: "None" },
          ...(!isAggregate ?
            [{ key: "record" as const, label: "Open record" }]
          : []),
          ...((nested || isNested) && isAggregate ?
            [{ key: "relatedRecords" as const, label: "Open related records" }]
          : []),
        ];
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
            <Select
              label="Click action"
              fullOptions={actions}
              value={c.action?.type ?? "none"}
              onChange={(type) =>
                update({ action: type === "none" ? undefined : { type } })
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
