// import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
// import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
// import React from "react";
// import Select from "../../../components/Select/Select";
// import type { FilterColumn } from "../../SmartFilter/smartFilterUtils";
// import { getSuggestions } from "./fieldUtils";
// import type { SmartFormFieldProps } from "./SmartFormField";

// type P = Pick<SmartFormFieldProps, "rawValue" | "db" | "tables"> & {
//   column: ValidatedColumnInfo & { references: NonNullable<ValidatedColumnInfo["references"]> };
//   onChange: (newValue: string | number | null) => Promise<void>
// }
// export const SmartFormFieldForeignKey = ({ column, db, onChange, rawValue }: P) => {

//   const onSearchOptions = async (term: string) => {
//     const table = column.references.table;
//     const col = column.references.column;
//     const res = await db[table].find(
//       { [col]: { $ilike: `%${term}%` } },
//       { select: { [col]: 1 }, limit: 20 }
//     );
//     return res.map((r: any) => r[col]);
//   };

//   return <Select 
//     className="FormField_Select noselect f-1 bg-color-0"
//     style={{ 
//       fontSize: "16px", 
//       fontWeight: 500, 
//       paddingLeft: "6px" 
//     }}
//     variant="div"
//     // fullOptions={(options?.map(key => ({ key }))) ?? fullOptions ?? []}
//     onSearch={onSearchOptions} 
//     onChange={onChange} 
//     value={rawValue}
//     labelAsValue={true} 
//   />
// }

// const isTextColumn = (col: ValidatedColumnInfo) => col.udt_name === "text" || col.udt_name === "varchar" || col.udt_name === "citext" || col.udt_name === "char";

// const getBestTextColumn = (columns: ValidatedColumnInfo[]) => {
//   const pkey = columns.find(c => c.is_pkey);
//   if(pkey && isTextColumn(pkey)) return pkey;
// }

// type Args = { 
//   term: string; 
//   col: FilterColumn; 
//   table: string; 
//   filter: AnyObject;
//   db: DBHandlerClient; 
// };
// const getData = async (args: Args): Promise<(string | null)[]> => {
//   const { term, col, table, filter, db } = args;
//   return getSuggestions({ db, table, column: col, term, filter });
// }