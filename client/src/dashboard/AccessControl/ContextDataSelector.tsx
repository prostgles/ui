import { mdiCardAccountDetailsOutline, mdiClose } from "@mdi/js";
import React from "react";
import type { ContextValue } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import { classOverride } from "../../components/Flex";
import Select from "../../components/Select/Select";
import type { FilterColumn } from "../SmartFilter/smartFilterUtils";
import type { ContextDataSchema } from "./OptionControllers/FilterControl";

type P = {
  className?: string;
  onChange: (contextValue?: ContextValue | undefined) => void;
  value: ContextValue | undefined;
  contextData: ContextDataSchema;
  column: FilterColumn;
};

export const ContextDataSelector = ({
  className = "",
  onChange,
  value,
  contextData,
  column,
}: P) => {
  const ctxCols = contextData.flatMap((t) =>
    t.columns
      .filter((c) => c.tsDataType === column.tsDataType)
      .map((c) => ({
        id: t.name + "." + c.name,
        tableName: t.name,
        ...c,
      })),
  );
  const valueId =
    value ? `${value.objectName}.${value.objectPropertyName}` : undefined;

  return (
    <div
      className={classOverride(
        "ContextDataSelector flex-row gap-0 ai-center ",
        className,
      )}
    >
      <Select
        title="From session data"
        btnProps={
          value ?
            {
              variant: "default",
            }
          : {
              iconPath: mdiCardAccountDetailsOutline,
              children: null,
              color: "action",
              variant: "default",
            }
        }
        data-command="ContextDataSelector"
        value={valueId}
        className={className}
        iconPath=""
        style={{ maxHeight: "unset" }}
        fullOptions={ctxCols.map((ctxCol) => ({
          key: ctxCol.id,
          label: `{{${ctxCol.tableName}.${ctxCol.name}}}`,
          subLabel: ctxCol.data_type,
        }))}
        onChange={(id) => {
          const ctxCol = ctxCols.find((c) => c.id === id);
          if (!ctxCol) return;

          onChange({
            objectName: ctxCol.tableName,
            objectPropertyName: ctxCol.name,
          });
        }}
      />
      {value && (
        <Btn
          iconPath={mdiClose}
          title="Clear session value"
          onClick={() => {
            onChange(undefined);
          }}
        />
      )}
    </div>
  );
};
