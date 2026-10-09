import {
  ACTION_COLORS,
  ACTION_PROPERTIES,
  type ActionButtonState,
  ACTION_VARIANTS,
  type ActionCaseValue,
  type ActionProperty,
} from "@common/actionColumn";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { IconPalette } from "@components/IconPalette/IconPalette";
import { Select } from "@components/Select/Select";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiArrowUp, mdiClose, mdiPlus } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBSchemaTable } from "prostgles-types";
import React, { useState } from "react";
import { RenderFilter } from "../../../RenderFilter";
import { JoinPathSelectorV2 } from "../JoinPathSelectorV2";

export const ActionCaseControls = ({
  value,
  onChange,
  table,
}: {
  value: ActionCaseValue;
  onChange: (value: ActionCaseValue) => void;
  table: DBSchemaTable;
}) => {
  const { tables } = usePrgl();
  const [chooseJoin, setChooseJoin] = useState(false);
  const update = (patch: Partial<ActionCaseValue>) =>
    onChange({ ...value, ...patch });
  const conditionTable = value.joinPath?.at(-1)?.table ?? table.name;
  return (
    <FlexCol className="gap-p5" data-action-case>
      <div>Default button state</div>
      <ActionStateInput
        value={value.defaultValue}
        onChange={(defaultValue) => update({ defaultValue })}
      />
      <details>
        <summary className="pointer">
          Conditions ({value.conditions.length})
        </summary>
        <FlexCol className="p-p5 gap-1">
          <div className="text-2">
            First match wins; otherwise use the default above.
          </div>
          <SwitchToggle
            label="Use linked table"
            variant="row"
            checked={!!value.joinPath?.length || chooseJoin}
            onChange={(checked) => {
              setChooseJoin(checked);
              if (!checked && value.joinPath?.length) {
                update({ joinPath: undefined, conditions: [] });
              }
            }}
          />
          {(chooseJoin || !!value.joinPath?.length) && (
            <JoinPathSelectorV2
              tables={tables}
              tableName={table.name}
              value={value.joinPath}
              onChange={({ path }) => {
                update({
                  joinPath: path,
                  conditions:
                    path.at(-1)?.table === conditionTable ?
                      value.conditions
                    : [],
                });
                setChooseJoin(false);
              }}
            />
          )}
          {value.conditions.map((condition, index) => {
            const updateCondition = (patch: Partial<typeof condition>) =>
              update({
                conditions: value.conditions.map((c, i) =>
                  i === index ? { ...c, ...patch } : c,
                ),
              });
            return (
              <FlexCol key={index} className="card p-p5 gap-p5">
                <FlexRow>
                  <RenderFilter
                    filter={condition.filter}
                    tableName={conditionTable}
                    selectedColumns={undefined}
                    contextData={undefined}
                    itemName="condition"
                    mode={{ children: `When (${index + 1})`, variant: "faded" }}
                    onChange={(filter) => updateCondition({ filter })}
                  />
                  <Btn
                    iconPath={mdiArrowUp}
                    title="Move condition up"
                    disabledInfo={!index ? "Already first" : undefined}
                    onClick={() => {
                      const conditions = [...value.conditions];
                      [conditions[index - 1], conditions[index]] = [
                        conditions[index]!,
                        conditions[index - 1]!,
                      ];
                      update({ conditions });
                    }}
                  />
                  <Btn
                    iconPath={mdiClose}
                    title="Remove condition"
                    onClick={() =>
                      update({
                        conditions: value.conditions.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  />
                </FlexRow>
                <div>Then</div>
                <ActionStateInput
                  value={condition.value}
                  onChange={(value) => updateCondition({ value })}
                />
              </FlexCol>
            );
          })}
          <Btn
            iconPath={mdiPlus}
            onClick={() =>
              update({
                conditions: [
                  ...value.conditions,
                  {
                    filter: { $and: [] },
                    value: value.defaultValue ?? {},
                  },
                ],
              })
            }
          >
            Add condition
          </Btn>
        </FlexCol>
      </details>
    </FlexCol>
  );
};

const ActionStateInput = ({
  value = {},
  onChange,
}: {
  value?: ActionButtonState;
  onChange: (value: ActionButtonState) => void;
}) => (
  <FlexCol className="gap-p5">
    {ACTION_PROPERTIES.map((property) => (
      <div key={property} data-action-property={property}>
        <ActionValueInput
          property={property}
          label={PROPERTY_LABELS[property]}
          value={value[property]}
          onChange={(result) => onChange({ ...value, [property]: result })}
        />
      </div>
    ))}
  </FlexCol>
);

const PROPERTY_LABELS: Record<ActionProperty, string> = {
  text: "Button text",
  icon: "Button icon",
  variant: "Button variant",
  color: "Button color",
  disabledInfo: "Disabled explanation",
  isLoading: "Loading",
};

const ActionValueInput = ({
  property,
  label,
  value,
  onChange,
  optional = true,
}: {
  property: ActionProperty;
  label: string;
  value: string | boolean | undefined;
  onChange: (value: string | boolean | undefined) => void;
  optional?: boolean;
}) => {
  if (property === "icon") {
    return (
      <IconPalette
        label={{ label }}
        iconName={typeof value === "string" ? value : undefined}
        onChange={(icon) => onChange(icon ?? undefined)}
      />
    );
  }
  if (property === "isLoading") {
    return (
      <SwitchToggle
        label={label}
        checked={value === true}
        variant="row"
        onChange={(checked) => onChange(checked)}
      />
    );
  }
  if (property === "variant" || property === "color") {
    return (
      <Select
        label={label}
        data-command={
          property === "variant" ? "ActionFormat.variant" : undefined
        }
        optional={optional}
        value={typeof value === "string" ? value : undefined}
        options={property === "variant" ? ACTION_VARIANTS : ACTION_COLORS}
        onChange={onChange}
      />
    );
  }
  return (
    <FormField
      label={label}
      value={typeof value === "string" ? value : ""}
      onChange={(text) => onChange(text || undefined)}
    />
  );
};
