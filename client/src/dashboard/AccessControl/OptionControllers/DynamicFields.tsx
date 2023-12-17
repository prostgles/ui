import { mdiClose, mdiPlus, mdiTableFilter } from "@mdi/js";
import React, { useEffect, useState } from "react";
import { ContextDataObject, TableRules, UpdateRule, validateDynamicFields } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import ErrorComponent from "../../../components/ErrorComponent";
import { Label } from "../../../components/Label"; 
import { TablePermissionControlsProps } from "../TableRules/TablePermissionControls";
import FieldFilterControl from "./FieldFilterControl";
import { FilterControl, ContextDataSchema } from "./FilterControl";
import { FlexRow } from "../../../components/Flex";

type P = Pick<Required<TablePermissionControlsProps>, "prgl" | "table" | "tableRules"> & {
  rule: TableRules["update"];
  onChange: (rule: UpdateRule)=>void;
  contextDataSchema: ContextDataSchema;
  contextData: ContextDataObject;
}
export const DynamicFields = ({ rule: r, contextDataSchema, table, onChange, prgl: {db, tables, methods, theme}, contextData }: P) => {

  const rule: UpdateRule = (r === true || !r)? { fields: "*" } : r;

  const setValue = (df: Required<UpdateRule>["dynamicFields"][number] | undefined, index: number | undefined) => {
    onChange({
      ...rule,
      dynamicFields: df === undefined? rule.dynamicFields?.filter((_, i) => i !== index) :
        index === undefined? [
          ...rule.dynamicFields ?? [],
          df
        ] : 
        rule.dynamicFields?.map((_df, _i) => _i === index? df : _df)
    })
  }

  const [error, setError] = useState<any>();
  useEffect(() => {
    (async () => {
      const valid = await validateDynamicFields(rule.dynamicFields, db[table.name] as any, contextData, table.columns.map(c => c.name));
      setError(valid.error);
    })()
  }, [rule.dynamicFields])

  return <div className="DynamicFields flex-col gap-p5 min-s-0 f-0">
      <FlexRow>
        <Label 
          label={"Dynamic fields"}
          iconPath={mdiTableFilter}  
          info={`Any update targeting records from these filters will be allowed to update the custom fields provided\n\nExample use case: allow updating message.content if user.id = message.user_id. \n\nBy default only message.seen can be updated`}
          popupTitle={"UPDATE dynamic fields rule"} 
        />
        <Btn iconPath={mdiPlus} 
          variant="filled"
          color="action"
          size="small"
          onClick={() => { 
            setValue({ fields: rule.fields, filterDetailed: { $and: [] } }, undefined) 
          }}
        />
      </FlexRow>
      {!!error && <div className="o-auto"
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: "80%",
          padding: "2em",
        }}
      >
        <ErrorComponent error={error} /> 
      </div>}
      <div className="flex-col gap-p5 o-auto  f-1 min-s-0 p-1 ml-3">
        {rule.dynamicFields?.map(({ fields, filterDetailed }, i) => { // //  + (i%2? " bg-gray-50 " : " bg-1 ")
          return <div key={i} className={"p-1 ml-1 shadow flex-row gap-p5 b b-gray-300  rounded "}> 
            <div className="flex-col gap-p5">
              <FieldFilterControl 
                label="Fields" 
                columns={table.columns} 
                value={fields}
                onChange={newFields => {
                  setValue({ fields: newFields, filterDetailed }, i);
                }} 
              />
              <FilterControl
                db={db}
                methods={methods}
                tableName={table.name}
                tables={tables}
                detailedFilter={filterDetailed as any} 
                label={"Filter"}
                onChange={newFilter => {
                  setValue(!newFilter? undefined : { fields, filterDetailed: newFilter }, i)
                }}
                onSetError={setError}
                contextData={contextDataSchema}
                containerClassname={""}
              />
            </div>
            <Btn iconPath={mdiClose} 
              onClick={() => { 
                setValue(undefined, i) 
              }}
            >
        
            </Btn>
          </div>
        })}
      </div>

  </div>
}