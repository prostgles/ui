// import { mdiClose, mdiPlus } from "@mdi/js";
// import { isObject } from "prostgles-types";
// import React from "react";
// import type { ForcedData } from "../../../../../commonTypes/publishUtils";
// import Btn from "../../../components/Btn";
// import { FlexCol, FlexRow } from "../../../components/Flex";
// import FormField from "../../../components/FormField/FormField";
// import Select from "../../../components/Select/Select";
// import SmartFormField from "../../SmartForm/SmartFormField/SmartFormField";
// import { ContextDataSelector } from "../ContextDataSelector";
// import type { ForcedDataControlProps } from "./ForcedDataControl";

// export const ForcedDataForm = ({
//   onChange, forcedDataDetail, table, contextData, prgl: {db, tables, methods: dbMethods, theme }
// }: ForcedDataControlProps) => {

//   const fDataValues: ForcedData[] | undefined = structuredClone(forcedDataDetail);
//   const sortingArr = (fDataValues ?? []).map(d => d.fieldName);

//   const activeCols = table.columns.filter(c =>
//     c.insert &&
//     fDataValues?.some(v =>
//       v.fieldName === c.name)
//   ).sort((a, b) =>
//     sortingArr.indexOf(a.name) - sortingArr.indexOf(b.name)
//   );

//   const remainingCols = table.columns.filter(c => !activeCols.some(v => v.name === c.name));

//   const onRemove = (fieldNames) => {
//     const newForcedDataDetail = (fDataValues ?? []).filter(fd => !fieldNames.includes(fd.fieldName));
//     onChange(newForcedDataDetail);
//   };
//   const onUpdate = (newFd: ForcedData, isNew = false) => {
//     const newForcedDataDetail = (fDataValues ?? []).map(fd => fd.fieldName === newFd.fieldName? newFd : fd).concat(isNew? [newFd] : []);
//     onChange(newForcedDataDetail);
//   };

//   return <FlexCol className="gap-2 p-1 ml-2 rounded b b-color  shadow">
//       {/* <InfoRow color="info" variant="naked">{info}</InfoRow> */}

//       {activeCols.map(c => {
//         const fData = fDataValues?.find(v => v.fieldName === c.name);

//         if(fData?.type === "context"){

//           return <FormField key={c.name}
//             label={c.label}
//             className="w-fit"
//             hint="From user context data"
//             inputContent={(
//               <ContextDataSelector
//                 className="ml-auto"
//                 value={fData}
//                 column={c}
//                 contextData={contextData}
//                 onChange={arg => {
//                   if(arg){
//                     onUpdate({ fieldName: c.name, type: "context", ...arg });
//                   } else {
//                     onRemove([c.name])
//                   }
//                 }}
//               />
//           )}/>
//         }

//         const ctxTable = contextData.find(ct => ct.name === "user")
//         const userCtxCols = ctxTable?.columns.filter(cc => cc.tsDataType === c.tsDataType);

//         return <SmartFormField
//           theme={theme}
//           variant="column"
//           style={{
//             // marginRight: "1em",
//             width: c.udt_name.startsWith("json")? undefined : "fit-content"
//           }}
//           key={c.name}
//           db={db}
//           methods={dbMethods}
//           column={{
//             ...c,
//             /** This is added to prevent default behaviour of collapsing columns with defaults */
//             has_default: false
//           }}
//           hideNullBtn={true}
//           tableName={table.name}
//           tableInfo={tables.find(t => t.name === table.name)!.info}
//           tables={tables}
//           action="insert"
//           rightContent={!!userCtxCols?.length &&
//             <FlexRow className="gap-p5 ml-1 as-end">
//               <ContextDataSelector
//                 value={undefined}
//                 column={c}
//                 contextData={contextData}
//                 onChange={arg => {
//                   if(arg){
//                     onUpdate({ fieldName: c.name, type: "context", ...arg });
//                   } else {
//                     onRemove([c.name])
//                   }
//                 }}
//               />
//               <Btn onClick={() => onRemove([c.name])} iconPath={mdiClose} />
//             </FlexRow>
//           }
//           value={isObject(fData?.value)? undefined : fData?.value}
//           onChange={value => {
//             onUpdate({ fieldName: c.name, type: "fixed", value });
//           }}
//         />
//       })}
//       {!!remainingCols.length && <Select
//         btnProps={{
//           color: "action",
//           iconPath: mdiPlus,
//           iconPosition: "left",
//           variant: "faded",
//           children: "Add column",
//           iconClassname: ""
//         }}
//         style={{ maxHeight: "unset"}}
//         fullOptions={remainingCols.map(c => ({
//           key: c.name,
//           label: c.name,
//           subLabel: c.udt_name,
//           disabledInfo: !c.insert? "Cannot insert into this column. Might be generated or not allowed" : undefined,
//         }))}
//         onChange={fieldName => {
//           onUpdate({ fieldName, type: "fixed", value: undefined }, true);
//         }}
//         data-command="ForcedDataControl.addColumn"
//       />}
//   </FlexCol>
// }
