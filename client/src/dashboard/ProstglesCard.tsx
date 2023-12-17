// import React, { ReactElement } from "react";
// import { DashboardState, CommonWindowProps } from "./Dashboard/Dashboard";
// import Loading from "../components/Loading";
// import RTComp from "./RTComp";
// import ErrorComponent from "../components/ErrorComponent";
// import { mdiAlertCircleOutline } from '@mdi/js';
// import Btn from "../components/Btn";
// import Popup from '../components/Popup/Popup';
// import { SyncDataItem } from "prostgles-client/dist/SyncedTable";
// import { SmartCardView } from "./SmartCard/SmartCardView";
// import Window from "./Window";
// import ColumnsMenu from "./W_Table/ColumnMenu/ColumnsMenu";
// import Tabs from "../components/Tabs";
// import FormField from "../components/FormField/FormField";
// import { FieldConfig, FieldConfigTable } from "./SmartCard/SmartCard";
// import { WindowData } from "./Dashboard/dashboardUtils";

// type P = CommonWindowProps<"card"> & {
//   table: Required<DashboardState>["tables"][number];
//   tables: Required<DashboardState>["tables"];
// };

// type S = {
//   loading: boolean;
//   wSync: any;
//   error: any;
//   showError: boolean;
//   w?: SyncDataItem<WindowData<"card">, true>;
// }
// type D = {
//   w: SyncDataItem<WindowData<"card">, true>;
// }

// export default class ProstglesCard extends RTComp<P, S, D> {

//   ref?: HTMLDivElement;

//   state: S = {
//     loading: false, 
//     wSync: null,
//     error: null,
//     showError: false,
//   }

//   onMount() {
//   }
//   onUnmount() {
//     this.state.wSync?.$unsync?.();
//   }


//   onDelta = async (dp, ds, dd) => {
//     const delta = ({ ...dp, ...ds, ...dd });
//     console.log(delta)
//     let ns: any = {};

//     const { prgl: {db}, w } = this.props;
//     if (db && !this.state.wSync) {
//       let wSync = w.$cloneSync((w: any, delta) => {
//         let d = this.d.w
//         this.setData({ w }, { w: delta });
//         this.setState({ w })
//         // if(!d)  this.forceUpdate()
//       });
//       this.setState({ wSync })
//     }

//   }

//   getMenu = (w: D["w"])=> {
//     const { prgl: {db} , tables, } = this.props;

//     const { nested_tables } = w;

//     let nestedColTabls;
//     if(nested_tables){ 
//       nestedColTabls = {};
//       Object.entries(nested_tables).map(([key, val]) => {
//         nestedColTabls[key] = {
//           content: <div className="flex-col p-1">
//             <div className="flex-col p-p5 text-gray-400 ta-left">Nested table ({key})</div>
//             <Btn onClick={() => {
//               const ntbl = { ...w.nested_tables }
//               delete ntbl[key];

//               w.$update({
//                 nested_tables: {
//                   ...ntbl
//                 }
//               });
//             }}></Btn>
//             <ColumnsMenu 
//               w={w as any} 
//               db={db} 
//               tables={tables} 
//               nestedColumnName={key} 
//               suggestions={this.props.suggestions}
//               onClose={() => {}} 
//             />
  
//           </div>
//         }
//       })
//     }
    
//     return (
//       <Tabs 
//         compactMode={true}
//         variant="vertical"
//         items={{
//           Title: {
//             content: <div className="flex-col p-1">
//               <FormField value={w.name} onChange={e => {
//                 w.$update({ name: e })
//               }}/>
//             </div>
//           },
//           Columns: {
//             content: <div className="flex-col p-1">
//               <div className="flex-col p-p5 text-gray-400 ta-left">Root table ({w.table_name})</div>
//               <ColumnsMenu 
//                 {...this.props}
//                 w={w as any} 
//                 db={db} 
//                 tables={tables} 
//                 onClose={() => {}} 
//               />

//             </div>
//           },
//           // "Nested tables": {
//           //   content: <div className="flex-col p-1">
//           //     <PopupMenu 
//           //     positioning="inside"
//           //     button={
//           //       <Btn variant="outline" 
//           //         color="action" 
//           //         // onClick={() => {
//           //         //   this.setState({ showAddNested: true })
//           //         // }}
//           //       >Add</Btn>
//           //     }
//           //     render={close => (
//           //       <JoinPathSelector 
//           //         className="w-full"
//           //         tableName={w.table_name} 
//           //         tables={tables}
//           //         onSelect={path => {
//           //           const lastTable = path[path.length-1];
//           //           const tbl = tables.find(t => t.name === lastTable);
//           //           if(tbl){
//           //             w.$update({
//           //               nested_tables: {
//           //                 ...w.nested_tables,
//           //                 [lastTable]: {
//           //                   path,
//           //                   cols: tbl.columns.map(c => ({
//           //                     name: c.name,
//           //                     show: true
//           //                   }))
//           //                 }
//           //               }
//           //             });
//           //           }
//           //           close();

//           //         }}
//           //       />
//           //     )}
//           //   />
              
//           //     <Tabs 
//           //       compactMode={true}
//           //       variant="vertical"
//           //       items={nestedColTabls}
//           //     />

//           //   </div>
//           // }
//         }} 
//       />
//     )
//   }

//   render() {
//     const { loading, error, showError } = this.state;
//     const { w } = this.state;
//     const { prgl:{db}, table , tables } = this.props;

//     // const table = tables.find(t => )
//     if (!w) return <div className="relative"><Loading variant="cover" /></div>

//     let infoSection;

//     if (error) {
//       infoSection = (
//         <div className="flex-row relative" style={{ position: "absolute", top: "1em", left: "1em", zIndex: 22 }} >
//           {!error ? null : <Btn className="text-red-500" iconPath={mdiAlertCircleOutline} onClick={() => { this.setState({ showError: true }) }} />}
//         </div>
//       )
//     }
//     let errorPopup;
//     if (showError) {
//       errorPopup = (
//         <Popup onClose={() => {
//           this.setState({ showError: false })
//         }}>
//           <div className="bg-0">
//             <ErrorComponent error={error} />
//           </div>
//         </Popup>
//       )
//     }

//     const rootFConfigs: FieldConfig[] = (w.columns || []).filter(c => c.show).map(c => {
//       if(c.computedConfig){
//         return {
//           name: c.computedConfig.funcDef.key,
//           label: c.name,
//           select: { [c.computedConfig.funcDef.key]: [c.computedConfig.column] },
//           renderValue: v => v
//         }
//       }
//       return c.name
//     })

//     const nestedConfigs: FieldConfigTable[] = Object.keys(w.nested_tables || {})
//       .map(tName => {
//         const tbl = tables.find(t => t.name === tName)!
//         return {
//           name: tName,
//           tableInfo: tbl.info,
//           tableColumns: tbl.columns,
//           fieldConfigs: w.nested_tables[tName].cols.map(c => {
//             if(c.computedConfig){
//               return {
//                 name: c.computedConfig.column,
//                 label: c.name,
//                 select: { [c.computedConfig.funcName]: [c.computedConfig.column] },
//                 renderValue: v => v
//               }
//             }
//             return c.name
//           })
//         }
//       })

//     let content = <>
//       {errorPopup}
//       <div className="relative f-1 flex-col min-h-0 min-w-0 o-auto bg-gray-200"
//         ref={r => {
//           if (r) this.ref = r;
//         }}
//       >
//         {infoSection}
//         <SmartCardView
//           db={db}
//           w={w}
//           tableName={w.table_name}
//           tables={tables}
//           style={{ padding: "1em"}}
//           fieldConfigs={[
//             ...rootFConfigs,
//             ...nestedConfigs
//           ]}
//           sortableFields={table.columns.map(c => c.name)} //  .filter(c => c.udt_name !== "json")
//           filterFields={table.columns.map(c => c.name)}
//           smartFormProps={{ enableInsert: true }}
//           detailedFilter={{
//             value: w.filter || [],
//             onChange: (filter) => {
//               this.d.w?.$update({ filter })
//             }
//           }}
//         />
//       </div>
//     </>

//     return <Window
//       w={w as any}
//       // onWChange={w => {
//       //   this.setData({ w })
//       // }}
//       getMenu={this.getMenu as any}
//     >
//       {content}
//     </Window>;
//   }
// }
