import { mdiCardAccountDetailsOutline, mdiClose } from "@mdi/js";
import Select from "../../components/Select/Select";
import React from "react";
import { ContextValue } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import { ContextDataSchema } from "./OptionControllers/FilterControl";
import { ValidatedColumnInfo } from "prostgles-types";
import { classOverride } from "../../components/Flex";

type P = {
  className?: string;
  onChange: (contextValue?: ContextValue | undefined) => void;
  value: ContextValue | undefined;
  contextData: ContextDataSchema;
  column: ValidatedColumnInfo;
}

export const ContextDataSelector = ({ className = "", onChange, value, contextData, column }: P) => {
  const ctxCols = contextData.flatMap(t => t.columns.filter(c => c.tsDataType === column.tsDataType).map(c => ({
    id: t.name+"."+c.name,
    tableName: t.name,
    ...c
  })));
  const valueId = value? `${value.objectName}.${value.objectPropertyName}` : undefined;

  return <div className={classOverride("ContextDataSelector flex-row gap-p5 ai-center ", className)}>
    <Select title="From context data"  
      btnProps={value? undefined : {
        iconPath: mdiCardAccountDetailsOutline,
        children: null,
        color: "action",
        variant: "default" 
      }}
      value={valueId}
      className={className}
      style={{ maxHeight: "unset"}}
      fullOptions={ctxCols.map(ctxCol => ({
        key: ctxCol.id, 
        label: `${ctxCol.tableName}.${ctxCol.name}`,
        subLabel: ctxCol.data_type,
      }))}
      onChange={id => {
        const ctxCol = ctxCols.find(c => c.id === id);
        if(!ctxCol) return;

        onChange({
          objectName: ctxCol.tableName,
          objectPropertyName: ctxCol.name
        });
      }}
    />
    {value && <Btn iconPath={mdiClose}
      title="Remove context value"
      onClick={() => {
        onChange(undefined);
      }}
    />}
  </div>
}