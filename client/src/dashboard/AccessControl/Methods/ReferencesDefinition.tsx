import React, { useState } from "react";
import Btn from "../../../components/Btn";
import FormField from "../../../components/FormField/FormField";
import Popup from "../../../components/Popup/Popup";
import Select from "../../../components/Select/Select";
import { SwitchToggle } from "../../../components/SwitchToggle";
import { omitKeys } from "prostgles-types";
import type { ArgumentDefinitionProps } from "./ArgumentDefinition";

export const ReferencesDefinition = ({
  onChange,
  tables,
  ...arg
}: ArgumentDefinitionProps) => {
  const [showRef, setShowRef] = useState(false);

  const refTable = tables.find((t) => t.name === arg.references?.table);

  const updateRef = (newRef: Partial<(typeof arg)["references"]>) => {
    if (!newRef) {
      onChange(omitKeys(arg, ["references"]));
    } else {
      onChange({
        ...arg,
        references: { column: "", ...(arg.references || {}), ...newRef } as any,
      });
    }
  };

  return (
    <>
      <Btn
        variant="faded"
        style={{ alignSelf: "end" }}
        color={arg.references ? "action" : undefined}
        onClick={() => {
          setShowRef(true);
        }}
      >
        References
      </Btn>
      {showRef && (
        <Popup
          onClickClose={false}
          focusTrap={true}
          contentClassName="flex-col gap-1 p-1"
          footerButtons={[
            {
              label: "Remove reference",
              variant: "faded",
              color: "danger",
              onClick: () => {
                onChange(omitKeys(arg, ["references"]));
                setShowRef(false);
              },
            },
            {
              label: "Done",
              color: "action",
              variant: "filled",
              onClick: () => {
                setShowRef(false);
              },
            },
          ]}
        >
          <Select
            label="table"
            value={arg.references?.table}
            options={tables.map((t) => t.name)}
            onChange={(table) => {
              updateRef({ table });
            }}
          />
          {refTable && (
            <Select
              label={arg.references?.isFullRow ? "Display column" : "column"}
              value={arg.references?.column || undefined}
              fullOptions={
                refTable.columns
                  .filter((c) =>
                    ["string", "number", "Date"].includes(c.tsDataType),
                  )
                  .map((t) => ({
                    key: t.name,
                    label: t.name,
                    subLabel: t.data_type,
                  }))!
              }
              onChange={(column) => {
                const colInfo = refTable.columns.find(
                  (c) => c.name === column,
                )!;
                onChange({
                  ...arg,
                  type: colInfo.tsDataType as any,
                  references: { ...arg.references!, column },
                });
              }}
            />
          )}
          {!!arg.references?.table && (
            <>
              <SwitchToggle
                label={{
                  label: "Include full row",
                  variant: "normal",
                  info: (
                    <>Entire row will be passed as the argument ({arg.name})</>
                  ),
                }}
                className="mr-auto"
                checked={!!arg.references.isFullRow}
                onChange={(isFullRow) => {
                  updateRef({ isFullRow });
                }}
              />
              {!!arg.references.isFullRow && (
                <>
                  <SwitchToggle
                    label={{
                      label: "Show in row card actions",
                      variant: "normal",
                      info: (
                        <>
                          After clicking on row view/edit the row panel footer
                          actions will include this method
                        </>
                      ),
                    }}
                    className="mr-auto"
                    checked={!!arg.references.showInRowCard}
                    onChange={(v) => {
                      updateRef({ showInRowCard: v ? {} : undefined });
                    }}
                  />

                  {!!arg.references.showInRowCard && (
                    <FormField
                      label="Action label"
                      value={arg.references.showInRowCard.actionLabel}
                      type="text"
                      onChange={(actionLabel) =>
                        updateRef({ showInRowCard: { actionLabel } })
                      }
                    />
                  )}
                </>
              )}
            </>
          )}
        </Popup>
      )}
    </>
  );
};
