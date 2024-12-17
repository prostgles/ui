// import { mdiDatabaseImportOutline, mdiPencil, mdiPlus } from "@mdi/js";
// import React, { useState } from "react";
// import type { ForcedData, UpdateRule } from "../../../../../commonTypes/publishUtils";
// import Btn from "../../../components/Btn";
// import { generateUniqueID } from "../../../components/FileInput/FileInput";
// import { FlexCol, FlexRow } from "../../../components/Flex";
// import { Label } from "../../../components/Label";
// import type { TablePermissionControlsProps } from "../TableRules/TablePermissionControls";
// import { ForcedDataForm } from "./ForcedDataForm";
// import type { ContextDataSchema } from "./FilterControl";

// export type ForcedDataControlProps = Pick<Required<TablePermissionControlsProps>, "prgl" | "table" | "tableRules"> & {
//   forcedDataDetail: UpdateRule["forcedDataDetail"];
//   onChange: (forcedDataDetail: UpdateRule["forcedDataDetail"]) => void;
//   contextData: ContextDataSchema;
//   info: React.ReactNode;
//   title?: React.ReactNode;
// }

// export const ForcedDataControl = (props: ForcedDataControlProps) => {
//   const { forcedDataDetail, info, title } = props;
//   const fDataValues: ForcedData[] | undefined = structuredClone(forcedDataDetail);

//   const id = generateUniqueID();

//   const [showEditor, setShowEditor] = useState(false);
//   const toggleEditor = () => setShowEditor(v => !v);

//   return <FlexCol className="ForcedDataControl">
//     <FlexRow className="noselect">
//       <Label
//         htmlFor={id}
//         iconPath={mdiDatabaseImportOutline}
//         label={"Forced data"}
//         info={info}
//         popupTitle={title}
//       />
//       <Btn
//         data-command="ForcedDataControl.toggle"
//         iconPath={fDataValues?.length? mdiPencil : mdiPlus}
//         color="action"
//         variant="filled"
//         size="small"
//         onClick={toggleEditor}
//       />

//     </FlexRow>
//     {showEditor && <ForcedDataForm { ...props } /> }

//     {!showEditor && !!fDataValues?.length &&
//       <FlexCol className="gap-p5 ai-start b b-color rounded p-1 ml-3 w-fit shadow" style={{   }}>
//         {fDataValues.map((v, i)=> <div key={i}>
//           <strong className="mr-p5">{v.fieldName}:</strong>
//           {v.type === "context"? `{{${v.objectName}.${v.objectPropertyName}}}` : JSON.stringify(v.value)}</div>
//         )}
//       </FlexCol>
//     }
//   </FlexCol>
// }
