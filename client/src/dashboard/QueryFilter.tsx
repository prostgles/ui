
export const zzzz=1;
// import React from 'react';
// import Select from '../components/Select';
// import FormField from '../components/FormField';
// import { isEmpty } from './Dashboard';
// import { ProstglesColumn } from './ProstglesTable';
// import { DBHandlerClient, TableHandlerClient } from 'prostgles-client/dist/prostgles';
// import { get } from "../utils";
// import { TextFilter_FullTextSearchFilterKeys } from "prostgles-types";
// import RTComp from './RTComp';
// import SearchList from "../components/SearchList";
// import Popup from "../components/Popup/Popup";
// import Btn from '../components/Btn';
// import ErrorComponent from '../components/ErrorComponent';
// import { mdiDelete } from "@mdi/js";
// import SmartFormField from '../components/SmartFormField';

// // type Filter = {
// //   operand?: "and" | "or";
// //   fieldName?: string;
// //   value: Date | number | string;
// //   type?: "ilike" | "like" | "notIlike" | "notLike" | "gt" | "lt" | "gte" | "lte" | "in" | "nin" | "not" | "tsQuery" ;
// // }

// type P = {
//   onChange?: (val: any, e: any) => void;
//   options?: string[];
//   value?: any;
//   style?: object;
//   className?: string;
//   id?: string;
// }

// // export default class QueryFilter extends React.Component<P, any> {
// //   render(){
// //     const { 
// //       onChange, 
// //       className = "",
// //       value,
// //       id= "",
// //       style={},
// //       options = []
// //     } = this.props;
// //     return (
// //       <div className={"select-wrapper b-gray-300 b-1 pr-1 rounded-md"}>
// //         <select style={style} value={value} onChange={!onChange? undefined : e => {
// //           onChange(e.target.value, e);
// //         }}>{options.map(val => (
// //           <option key={val}>{val}</option>
// //         ))}</select>
// //       </div>
// //     )
// //   }
// // }

// const basicTypes = ["=", ">", ">=", "<", "<=", "<>", "$isNull", "$isNotNull"];
// const list = ["$between"];
// const sel_list = ["$in", "$nin"];
// const stringTypes = ["$ilike", "$like"];
// const ftsTypes = TextFilter_FullTextSearchFilterKeys;
// const FTS_OPERANDS = ["@@"];

// const ALL_OPERANDS = [...basicTypes, ...sel_list, ...list, ...stringTypes, ...ftsTypes];

// type DataFilter = 
//   | {} 
//   | undefined 
//   | { [key: string]: any } 
//   | { $and: DataFilter[] } 
//   | { $or: DataFilter[] };

// type SingleFilter = { 
//   field: string; 
//   operator: string; 
//   value: any;
//   position: string;
// };

// export type ParsedFilter = 
//   | {} 
//   | SingleFilter 
//   | { $and: ParsedFilter[] } 
//   | { $or: ParsedFilter[] }; 

// export default class QueryFilter extends RTComp<{
//   onChange: (newFilter: any) => any;
//   cols: ProstglesColumn[];
//   filter?: SingleFilter;
//   tableName: string;
//   db: DBHandlerClient;
//   onDelete: () => any;
//   minimised?: boolean;
// }, {
//   err?: any;
//   fieldMenuAnchor?: HTMLDivElement;
// }> {

//   static removeBadFilters = async (f: DataFilter, tbl: Partial<TableHandlerClient>): Promise<DataFilter | {}> => {
//     let result = {};

//     if(f && tbl && tbl.find){
//       if("$and" in f){
//         result = { $and: await Promise.all(f.$and.map(f => QueryFilter.removeBadFilters(f, tbl))) }
  
//       } else if("$or" in f){
//         result = { $or: await Promise.all(f.$or.map(f => QueryFilter.removeBadFilters(f, tbl))) }
  
//       } else {
//         try {
//           QueryFilter.parse(f)
//           await tbl.find(f, { limit: 0 });
//           result = f;
//         } catch(e) {
//           console.error(e, f);
//         }
//       }
//     }

//     return result;
//   }

//   static parse = (f: DataFilter, position: string = "root"): ParsedFilter | undefined | {} => {
    
//     if(f){
//       if("$and" in f){
//         return { $and: f.$and.map((d, i) => QueryFilter.parse(d, position + i)) };

//       } else if("$or" in f){
//         return { $or: f.$or.map((d, i) => QueryFilter.parse(d, position + i)) };

//       } else {
//         const key = Object.keys(f)[0];
//         if(key){
//           let ftsOperator = "";
//           const operator = ALL_OPERANDS.find(o => key.endsWith("." + o)) || "";
//           if(operator && ftsTypes.includes(operator)){
//             ftsOperator = FTS_OPERANDS.find(o => key.slice(0, - operator.length - 1).endsWith("." + o)) || "";
//           }
//           let field = "";
//           if(ftsOperator){
//             field = operator? key.slice(0, - operator.length - 1 - ftsOperator.length - 1) : key;
//           } else {
//             field = operator? key.slice(0, - operator.length - 1) : key;
//           }

//           let value = f[key];

//           // if(operator && list.includes(operator) && Array.isArray(value)){
//           //   value = JSON.stringify(value).slice(1, -1);
//           // }

//           if(operator === "$isNull"){
//             value = "";
//           }

//           return { field, operator: operator || "=", value, position  };
//         }

//       }
//     }

//     return {};
//   }

//   static encode = (f: ParsedFilter, opts?: { ignoreEmptyList?: boolean }): DataFilter | undefined => {
//     const { ignoreEmptyList = false } = opts || {};
//     if(f){
//       if("$and" in f){
//         return { $and: f.$and.map(ff => QueryFilter.encode(ff)) };

//       } else if("$or" in f){
//         return { $or: f.$or.map(ff => QueryFilter.encode(ff)) };

//       } else {
//         if(!Object.keys(f).find(k => k)) return {};
//         // if(Object.values(f).find(v => Array.isArray(v) && v.length === 0)) return {};

//         let { field = "", operator = "=", value = "" } = (f || { field: "", operator: "=", value: "" }) as SingleFilter;
//         if(operator && ftsTypes.includes(operator)){
//           operator = `@@.${operator}`;
//         }

//         if(operator && sel_list.includes(operator) && !Array.isArray(value)){
//           try {
//             value = JSON.parse(`[${value}]`);
//             if(!ignoreEmptyList && !value.length) throw "List cannot be empty";
//           } catch(e){
//             throw `Expecting a comma separated list: \n2,3,"a","b", ...`;
//           }
//         }
//         let op = (operator && operator !== "=")? `.${operator}` : "";

//         if(operator === "$isNull"){
//           op = "";
//           value = null;
//         }
//         if(operator === "$isNotNull"){
//           op = ".<>";
//           value = null;
//         }

//         return { [field? `${field}${op}` : ""]: value };
//       }
//     }

//     return undefined;
//   }

//   state = {
//     err: undefined,
//     fieldMenuAnchor: undefined
//   }

//   id = "filter-" + Date.now();
//   componentWillUnmount(){
//     // if(this.currFilter){
//     //   this.props.onChange({ ...this.currFilter });
//     //   this.currFilter = undefined;
//     // }
//   }

//   onMount(){
//     this.filter = this.props.filter;
//   }

//   filter: any = {};
//   inDebounce: any;
//   currFilter: any;
//   onChange = async (nf, delay = 300) => {
//     const { onChange, db, tableName } = this.props;

//     try {
//       const cf = QueryFilter.parse(this.filter);
//       // console.log(this.filter, cf);
//       const newFilter = { ...cf, ...nf };

//       const ignoreEmptyList = Object.keys(nf).join("") === "operator";
//       const newF = QueryFilter.encode(newFilter, { ignoreEmptyList });
//       this.filter = newF;
      
//       if(ignoreEmptyList){
//         onChange({ ...this.filter });
//         QueryFilter.encode(newFilter);
//       }

//       await db[tableName].find(this.filter, { limit: 0 });
//       onChange({ ...this.filter });
//       this.setState({ err: null });
//     } catch(err){
//       console.error(err)
//       this.setState({ err });
//     }
//     const f = QueryFilter.parse({ ...this.filter });
    
//     if(
//       f && 
//       ("$and" in f || "$or" in f || "field" in f)
//     ){
//       onChange({ ...this.filter })
//     }

//     // if(this.inDebounce) clearTimeout(this.inDebounce);
//     // this.currFilter = { ...this.currFilter, ...nf };
//     // this.inDebounce = setTimeout(() => {
//     //   if(this.currFilter) onChange({ ...this.currFilter });
//     //   this.currFilter = undefined;
//     //   this.inDebounce = null;
//     // }, delay)
//   }

//   onDelta(dP, dS, dD){
//     // const { db, tableName } = this.props;
//     // if(JSON.stringify(this.filter || {}) !== JSON.stringify(this.props.filter || {}) ){
//     //   db[tableName].find({ ...this.props.filter }, { select: "", limit: 1 })
//     //   .then(() => {
//     //     this.setState({ err: null })
//     //   })
//     //   .catch(err => {
//     //     this.setState({ err })
//     //   })
//     // }

//     if(dP && "filter" in dP) {
//       this.filter = this.props.filter;
//     }
//   }


//   type: string;
//   value: any;
//   render(){
//     let allFilters = [ ...basicTypes, ...sel_list, ... list, ...stringTypes, ...ftsTypes];

//     const { filter = {}, cols, onDelete, minimised, tableName, db } = this.props;
//     const { err, fieldMenuAnchor } = this.state;

//     const { field, operator, value, position } = (QueryFilter.parse({ ...filter }) || {}) as SingleFilter;
//     const col = cols.find(c => c.name === field);



//     const fieldPopup = !fieldMenuAnchor? null : 
//       <Popup open={true}
//         rootStyle={{ padding: 0 }}
//         anchorEl={fieldMenuAnchor}
//         positioning="beneath-left"
//         clickCatchStyle={{ opacity: 0 }}
//         onClose={() => {
//           this.setState({ fieldMenuAnchor: undefined })
//         }}
//       >
//         <SearchList
//           id="searchlist"
//           placeholder="Search..."
//           items={cols.map(c => ({
//             key: c.name,
//             label: c.name,
//             onPress: () => {
//               this.onChange({ field: c.name });
//               this.setState({ fieldMenuAnchor: undefined });
//             },
//             selected: c.name === field
//           }))}
//         />
//       </Popup>;

//     let inputType = "text";
//     let null_if_empty = false;
//     if(col){
//       if(col.tsDataType === "number" && basicTypes.includes(operator)){
//         inputType = "number";
//         allFilters = [ ...basicTypes, ...list ];
//         null_if_empty = true;
//       } else if(col.tsDataType === "Date" && basicTypes.includes(operator)){
//         inputType = SmartFormField.getInputType(col);
//         null_if_empty = true;
//       }
//     }

//     if(minimised){
//       let val = JSON.stringify(value || "").slice(1, -1);
//       if(value === null){
//         val = "NULL";
//       } else if(col && ["number", "boolean"].includes(col.tsDataType)){
//         val = value;
//       } else if(Array.isArray(value)){
//         val = `( ${val} )`
//       } else if(col && col.tsDataType === "string" && typeof col.tsDataType === "string"){
//         val = `'${value}'`
//       }
//       return <div className="flex-row ai-center noselect chip lg"
//         style={{
//           background: "rgb(236 247 255)",
//           border: "1px solid #e2e2e2"
//         }}
//       >
//         <div style={{ color: "#0047b1" }}>{field}</div>
//         <div style={{ padding: "4px", color: '#7464ce', fontSize: ".8em" }}>{operator}</div>
//         <div className={value === null? "italic" : ""}>{val}</div>
//       </div>
//     }

//     console.log(field, col)

//     return <div className="flex-col ">
//       <div className="flex-row ai-center p-p5 ">
//         {fieldPopup}

//         {/* <Btn className="chip gray pointer focusable" 
//           onClick={e => {
//             this.setState({ fieldMenuAnchor: e.currentTarget })
//           }}
//         >
//           {field || <div className="">field</div>}
//         </Btn> */}
//         <Select title="Field" variant="div" value={field} options={cols.map(c => c.name)} className="mr-p25"
//           onChange={field => {
//             this.onChange({ field });
//           }}
//         />
        
//         <Select title="Filter type" variant="div" options={allFilters} value={operator} className="w-fit text-gray-300 bg-gray-50 mr-p25" 
//           onChange={(fType: string) => {
//             let _value = value;
//             if(!Array.isArray(value) && sel_list.includes(fType)){
//               _value = [value || null];
//             } else if(Array.isArray(value) && !sel_list.includes(fType)){
//               _value = value[0] || null;
//             }
//             this.onChange({ operator: fType, value: _value });
//           }}
//         />
//         {!col? null : <SmartFormField
//           id={position}
//           db={db}
//           tableName={tableName} 
//           action={"update"}
//           // column={col}
//           tables={tables}
//           value={value}
//           onChange={fVal => {          
//             this.onChange({
//               value: (null_if_empty && fVal === "")? null : fVal 
//             });
//           }}
//           inputStyle={{
//             padding: ".25rem 0.55rem"
//           }}
//           variant="compact"
//           multiSelect={["$in", "$nin"].includes(operator)}
//         />}
//         {/* <FormField 
//           // error={err}
//           className="mr-p25"
//           inputStyle={{ padding: "4px 6px" }}
//           key={this.id} 
//           id={this.id}
//           type={inputType}
//           defaultValue={value} 
//           onChange={fVal => {          
//             this.onChange({ value: (null_if_empty && fVal === "")? null : fVal });
//           }}
//           placeholder={
//             [null, undefined].includes(value)? "[NULL]" :
//             list.includes(operator)? `78 , 432, "abc"` :
//             stringTypes.includes(operator)? `sometext%` : ""
//           }
//         /> */}
//         <Btn className="chip gray pointer focusable"
//           title="Delete this filter"
//           onClick={e => {
//             onDelete();
//           }}
//           iconPath={mdiDelete}
//         /> 
//       </div>
//       {err? <ErrorComponent style={{ padding: ".5em", fontSize: "12px" }} error={err} /> : null}
//     </div> ;

//   }
// }



// export class FilterComp extends RTComp<{
//   onChange: (newFilter: any) => any;
//   cols: ProstglesColumn[];
//   filter?: any;
//   tableName: string;
//   db: DBHandlerClient;
//   minimised?: boolean;
//   onClose?: Function;
// }, {
//   err?: any
// }> {
  
//   renderFilter = (args?: { _f: DataFilter, idx: number, onDelete: any; onUpdate: any; }) => {
//     const { db, tableName, onChange, cols, minimised } = this.props;
//     const { _f = this.filter || this.props?.filter, idx = 0, onDelete = undefined, onUpdate } = args || {};

//     let f = (_f || {}) as DataFilter;
//     let groupFilters, operator;
//     if("$and" in f){
//       groupFilters = f.$and;
//       operator = "and"
//     } else if("$or" in f){
//       groupFilters = f.$or;
//       operator = "or"
//     }

//     let res = [];

//     if(minimised && groupFilters) {
//       groupFilters = groupFilters.slice(0).filter(gf => !minimised || Object.keys(gf).find(k=>k))
//     }

//     if(groupFilters){
//       groupFilters.map((gf, i) => {
//         const _onDelete = onDelete || (() => {
//             const op = `$${operator}`;
//             let nf = { [op]: groupFilters.filter((_g, _i) => _i !== i) };
//             if(!nf[op].length){
//               nf = null;
//             }
//             onChange(nf);
//           });
//         const _onUpdate = onUpdate || ((newFilter) => {
//           let ng = groupFilters.map((_g, _i) => _i === i? newFilter : _g );
//             onChange({ [`$${operator}`]: ng });
//         });
//         const _args = { _f: gf, idx: i, onDelete: _onDelete, onUpdate: _onUpdate  };
//         let fn = this.renderFilter(_args);
//         res.push(fn);
//         if(i < groupFilters.length - 1){
//           res.push(<div key={"s" + i} style={{ padding: "0 6px" }} className="noselect">{operator}</div>);
//         }
//       });
//       return <div className={"group-filter w-fit " + ((minimised && ("$and" in f))? "flex-row ai-center bg-gray-50 " : "flex-col")} >
//         {res}
//       </div>
//     } else {
//       return <QueryFilter 
//         key={idx} 
//         db={db} 
//         tableName={tableName} 
//         onChange={onUpdate || onChange} 
//         cols={cols} 
//         filter={f as SingleFilter}
//         onDelete={onDelete || (async () => {
//           onChange(null);
//         })}
//         minimised={minimised}
//       />
//     }

//     return res;
//   }


//   onChange = (nf = null, delay = 300) => {
//     const { onChange } = this.props;
//     if(!nf){
//       onChange(nf);
//       return;
//     }

//     const cf = QueryFilter.parse({ ...nf });
//     console.log(this.filter, cf, nf);
//     const newF = QueryFilter.encode({ ...cf });
//     console.log(newF);

//     this.filter = newF;
//     onChange(newF);
//   }


//   onMount(){
//     this.filter = this.props.filter;
//   }

//   onDelta(dP, dS, dD){
//     if(dP && "filter" in dP) {
//       this.filter = this.props.filter;
//     }
//   }

//   filter: any;
//   render(){
//     const addGroupFilter = (op: "$and" | "$or") => {
//       let newFilter = { ...this.filter };
//       if(op in newFilter){
//         newFilter[op].push({})
//       } else {
//         newFilter = {
//           [op]: [
//             { ...this.filter },
//             { }
//           ]
//         }
//       }
//       console.log(newFilter)
//       this.onChange(newFilter);
//     }

//     const { minimised, onClose } = this.props;

//     return <div className={"group-filter " + ((minimised && this.filter?.$and)? "flex-row ai-center bg-gray-50 " : "flex-col")}>
//       {this.renderFilter()}

//       {minimised? null : <>
//         <div className="flex-row">
//           <Btn onClick={() => addGroupFilter("$and") } className="mr-p5">and</Btn>
//           <Btn onClick={() => addGroupFilter("$or")  }>or </Btn>
//         </div>
//         <Btn className="chip gray pointer focusable"
//           title="Delete this filter"
//           onClick={e => {
//             this.onChange();
//             if(onClose) onClose();
//           }}
//           iconPath={mdiDelete}
//         /> 
//       </>}
//     </div>;
//   }
// }