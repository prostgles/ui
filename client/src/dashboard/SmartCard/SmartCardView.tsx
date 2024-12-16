import React from "react";

export const SmartCardView = () => {
  return <>View not finished</>;
};
// import { ValidatedColumnInfo, TableInfo, AnyObject, SubscriptionHandler } from "prostgles-types";
// import RTComp from "../RTComp";
// import React from "react";
// import SmartCard, { SmartCardProps, FieldConfig, FieldConfigBase, ParsedFieldConfig } from "./SmartCard";
// import { mdiClose, mdiPlus, mdiSortReverseVariant, mdiSortVariant } from "@mdi/js";
// import Btn from "../../components/Btn";
// import SmartForm, { SmartFormProps } from "../SmartForm/SmartForm";
// import Select from "../../components/Select";
// import SmartFilter, { SmartGroupFilter, getSmartGroupFilter } from "../SmartFilter/SmartFilter";
// import FileInput, { Media } from "../../components/FileInput";
// import { CommonWindowProps, DashboardState, WindowData } from "src/dashboard/Dashboard";
// import Loading from "../../components/Loading";
// import SmartFilterBar from "../SmartFilter/SmartFilterBar";
// import { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";

// type NestedSmartCardProps = Pick<SmartCardProps, "footer" | "excludeNulls">;
// type NestedSmartFormProps = Pick<SmartFormProps, "hideNullBtn" | "cannotBeNullMessage" | "enableInsert" | "columns" | "insertBtnText" | "label">;

// export type FieldConfigTable = FieldConfigBase & {
//   fieldConfigs: FieldConfigNested[];
//   tableInfo: TableInfo;
//   tableColumns: ValidatedColumnInfo[];
//   getRowFilter?: (row: AnyObject) => AnyObject;
//   select?: string | AnyObject;
//   render?: (rows: AnyObject[]) => React.ReactNode;
//   smartFormProps?: NestedSmartFormProps;
//   smartCardProps?: NestedSmartCardProps;
// };
// type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

// // /** Used in SmartCardView */
// export type FieldConfigNested = FieldConfig<any> | FieldConfigTable;

// export type ParsedNestedFieldConfig = ParsedFieldConfig | FieldConfigTable;

// export type BasicMedia = { content_type: string; name: string; url: string }

// export type SmartCardViewProps = Pick<SmartCardProps, "db" | "tableName" | "columns" | "variant" | "excludeNulls"> & {

//   style?: React.CSSProperties;

//   tableInfo?: TableInfo;
//   fieldConfigs?: FieldConfigNested[];

//   filter?: AnyObject;
//   select?: string | AnyObject;
//   limit?: number;

//   dataItems?: AnyObject[];

//   hideColumns?: string[];
//   depth?: number;

//   title?: (row: AnyObject, columns: ValidatedColumnInfo[]) => React.ReactNode;
//   footer?: (row: AnyObject, columns: ValidatedColumnInfo[]) => React.ReactNode;

//   includeMedia?: boolean;
//   smartFormProps?: NestedSmartFormProps;
//   smartCardProps?: NestedSmartCardProps;

//   onDataChanged?: () => void;
//   sortableFields?: string[];
//   filterFields?: string[];
//   disableSubscribe?: boolean;

//   detailedFilter?: {
//     value: SmartGroupFilter;
//     onChange: (newDetailedFilter: SmartGroupFilter) => any;
//   }

//   /**
//    * Needed when filterFields are present
//    */
//   tables?: CommonWindowProps["tables"];
//   w?: SyncDataItem<WindowData<"card">>;
// }

// type S = {
//   fieldConfigs?: ParsedNestedFieldConfig[];
//   sortBy?: AnyObject;
//   items?: AnyObject[];
//   tableInfo?: TableInfo;
//   tableColumns?: ValidatedColumnInfo[];
//   joinedInfo?: {
//     [table: string]: {
//       tableInfo?: TableInfo;
//       tableColumns?: ValidatedColumnInfo[];
//     }
//   }
//   insertMode: boolean;
//   orderByKey?: string;
//   orderAsc?: boolean;
//   // _filter: AnyObject;
//   detailedFilter?: SmartGroupFilter;
//   loadingData?: boolean;
// }

// export default class SmartCardView extends RTComp<SmartCardViewProps, S> {
//   state: S = {
//     items: [],
//     tableInfo: undefined,
//     joinedInfo: {},
//     tableColumns: undefined,
//     insertMode: false,
//     detailedFilter: [],
//   }

//   loaded = false;

//   dataArgs: {
//     select: AnyObject;
//     filter: AnyObject;
//     orderBy: AnyObject;
//   };

//   onDataChanged = () => {
//     this.setData();
//   }

//   dataRequest?: {
//     filterStr: string;
//     orderByStr: string;
//   }
//   setData = async (
//     fieldConfigs: S["fieldConfigs"] = this.state.fieldConfigs,
//     tableInfo: S["tableInfo"] = this.state.tableInfo,
//     tableColumns: S["tableColumns"] = this.state.tableColumns,
//   ) => {
//     if (!fieldConfigs) return;
//     const { tableName, db, dataItems, select, limit, disableSubscribe } = this.props;
//     const { detailedFilter = [] } = this.state;
//     const { orderByKey, orderAsc, } = this.getSort();

//     const filter = getSmartGroupFilter(this.props.detailedFilter?.value || detailedFilter )
//     if (!dataItems && db?.[tableName]) {
//       const filterStr = JSON.stringify(filter),
//         orderByStr = JSON.stringify({ orderByKey, orderAsc });

//       this.dataRequest = {
//         filterStr, orderByStr
//       }

//       /**
//        * If select not provided (from parent SmartCardView) then create from fieldConfigs
//        * Also add pkeys to allow updating record
//        */
//       let _select = select;
//       const makeSelect = async (fieldConfigs: ParsedNestedFieldConfig[], cols: ValidatedColumnInfo[], tableName: string): Promise<AnyObject> => {
//         let fcs = fieldConfigs.slice(0);
//         let finalSelect = {};

//         for await (const fc of fcs) {
//           if ("fieldConfigs" in fc) {
//             if (fc.name === tableInfo.fileTableName) {
//               finalSelect[fc.name] = {
//                 id: 1,
//                 name: 1,
//                 url: 1,
//                 content_type: 1,
//               }
//             } else {
//               finalSelect[fc.name] = fc.select;
//               if (!fc.select) {
//                 const nestedCols = await db[fc.name]?.getColumns();
//                 finalSelect[fc.name] = await makeSelect(SmartCard.parseFieldConfigs(fc.fieldConfigs, nestedCols), nestedCols, fc.name);
//               }
//             }
//             /**
//              * Specified select takes precedence
//              */
//           } else if (fc.select) {
//             finalSelect[fc.name] = fc.select;

//             /**
//              * Select column only if select is allowed (Some columns are update/insert only)
//              */
//           } else if (cols.find(c => c.name === fc.name && c.select)) {
//             finalSelect[fc.name] = 1;
//           }
//         }

//         /** Also add pkeys so that SmartCard can view/edit data */
//         if (db[tableName]?.update || db[tableName]?.insert || db[tableName]?.delete || db[tableName]?.find) {
//           const pkeyCols = cols.filter(c => c.is_pkey);
//           pkeyCols.map(c => {
//             if (c.is_pkey && !finalSelect[c.name]) {
//               finalSelect[c.name] = 1;
//             }
//           });
//         }

//         return finalSelect;
//       }

//       let params = {};
//       if (orderByKey) {
//         params = { orderBy: { [orderByKey]: Boolean(orderAsc) } }
//       }

//       if (Number.isFinite(limit) && limit > 0) {
//         params = {
//           ...params,
//           limit
//         }
//       }

//       if (!_select && fieldConfigs) {
//         _select = await makeSelect(fieldConfigs, tableColumns, tableName);
//       }

//       const setItems = (items) => {
//         if (this.dataRequest.filterStr === filterStr && this.dataRequest.orderByStr === orderByStr) {
//           this.setState({ items });
//         }
//       }

//       if (!disableSubscribe && db[tableName].subscribe) {
//         this.setState({ loadingData: true })
//         if (this.itemsSub?.[tableName]) await this.itemsSub?.[tableName].unsubscribe();
//         this.itemsSub[tableName] = await db[tableName].subscribe(filter,
//           { select: _select, ...params },
//           items => {
//             setItems(items);
//             this.setState({ loadingData: false });
//           });
//         await Promise.all(fieldConfigs.map(async fc => {
//           /**
//            * Nested subscriptions will not be re-created to avoid recursion
//            */
//           if ("fieldConfigs" in fc && fc.fieldConfigs && !this.itemsSub?.[fc.name]) {
//             this.itemsSub[fc.name] = await db[fc.name].subscribe({}, { limit: 0 }, () => {
//               this.setData();
//               this.setState({ loadingData: false });
//             });
//           }
//         }))
//       } else {
//         this.setState({ loadingData: true })
//         const items = await db[tableName].find(filter, { select: _select, ...params });
//         this.setState({ items, loadingData: false });
//       }

//     } else if (dataItems) {
//       this.setState({ items: dataItems });
//     }
//   }

//   itemsSub: Record<string, SubscriptionHandler> = {};
//   onDelta = async (dP, dS, dD) => {
//     const { tableName, db, dataItems, fieldConfigs: rawFCs, detailedFilter } = this.props;

//     if (tableName && db && !db[tableName]) {
//       console.error("Invalid/Dissallowed tableName given to SmartCardView -> " + tableName);
//     }

//     // const dFilter = smartFilter ?? this.state.detailedFilter;

//     // if(onFilter && smartFilter && JSON.stringify(smartFilter) !== ){

//     // }

//     if (
//       this.loaded && (
//         (dP && "detailedFilter" in dP) ||
//         (dP && "fieldConfigs" in dP) ||
//         (dP?.dataItems || dP?.select || dS && ("orderByKey" in dS || "orderAsc" in dS || "filter" in dS || "detailedFilter" in dS ))
//       )
//     ) {
//       this.setData()
//     } else if (db?.[tableName] && !this.loaded) {
//       let tableInfo = this.props.tableInfo || this.state.tableInfo;
//       let extraState = {};
//       let tableColumns = this.state.tableColumns;
//       if (!this.loaded) {
//         this.loaded = true;

//         tableInfo = tableInfo || await db[tableName].getInfo();
//         tableColumns = this.props.columns || await db[tableName].getColumns();

//         let joinedInfo = {};
//         const fieldConfigs = SmartCard.parseFieldConfigs(rawFCs || ["*"], tableColumns)
//         if (fieldConfigs) {
//           await Promise.all(fieldConfigs.map(async fc => {
//             if ("fieldConfigs" in fc) {
//               const tableInfo = await db[fc.name]?.getInfo();
//               const tableColumns = await db[fc.name]?.getColumns();
//               joinedInfo = {
//                 ...joinedInfo,
//                 [fc.name]: {
//                   tableInfo,
//                   tableColumns,
//                 }
//               }
//             }
//           }));
//         }
//         this.setData(fieldConfigs, tableInfo, tableColumns)
//         extraState = { tableInfo, tableColumns, joinedInfo, fieldConfigs }
//         this.setState(extraState);

//       }
//     }
//   }

//   renderMedia = (params: {
//     file: { url: string; type: string; name?: string },
//     i: string | number,
//     onDelete?: () => void;
//     onClick?: () => void;
//     style?: React.CSSProperties;
//   }) => {
//     const { file, i, onDelete, style = {}, onClick } = params;
//     const { type = "", url, name } = file;
//     let mediaPreview = null;
//     if (url) {
//       const style = {
//         maxWidth: "100%",
//         maxHeight: "100%",
//       }
//       if (type.startsWith("image")) {
//         mediaPreview = <img loading="lazy" src={url} style={style}></img>
//       } else if (type.startsWith("video")) {
//         mediaPreview = <video style={style} controls src={url}></video>
//       } else if (type.startsWith("audio")) {
//         mediaPreview = <audio style={style} controls src={url}></audio>
//       }
//     }

//     return <div key={i}
//       className={"m-p5 relative flex-col b b-color "}
//       style={{
//         width: "150px",
//         height: "150px",
//         ...style
//       }}
//     >
//       {!onClick ? null : <div className={"absolute w-full h-full pointer"} style={{ zIndex: 1 }} onClick={e => {
//         e.stopPropagation();
//         e.preventDefault();
//         onClick();
//       }}></div>}
//       {!onDelete ? null : <Btn style={{ position: "absolute", top: "10px", right: "10px", zIndex: 2, backgroundColor: "white" }}
//         className="shadow"
//         iconPath={mdiClose}
//         title="Remove file"
//         onClick={() => {
//           onDelete();
//         }}
//       />}
//       <div className={"f-1 min-w-0 min-h-0 flex-row ai-center"}>{mediaPreview}</div>
//       {!name ? null : <div
//         className="f-0 noselect p-p5 text-1p5 font-14 absolute w-full"
//         style={{
//           position: "absolute",
//           zIndex: 1,
//           bottom: 0,
//           color: "white",
//           background: "linear-gradient(to bottom, rgb(255 255 255 / 0%) 0%,#00000075 70%)",
//         }}
//       >{name}</div>}
//     </div>

//   }

//   // getRowFilter = (item?: AnyObject): undefined | AnyObject => {
//   //     const { tableColumns } = this.state;
//   //     if(tableColumns && item){
//   //         const pkey = tableColumns.find(c => c.is_pkey);
//   //         if(pkey && item[pkey.name]){
//   //             return {
//   //                 [pkey.name]: item[pkey.name]
//   //             }
//   //         }
//   //     }
//   //     return undefined;
//   // }

//   onUnmount() {
//     Object.values(this.itemsSub).map(v => v?.unsubscribe());
//   }

//   getSort = () => {
//     const { fieldConfigs } = this.state;
//     const { sortableFields } = this.props;
//     const { orderByKey = sortableFields?.[0], orderAsc = true } = this.state;
//     if (!fieldConfigs) return {};
//     if (orderByKey && !fieldConfigs?.find(f => f.name === orderByKey)) {
//       // console.error("Invalid sortableFields. Could not orderByKey: " + orderByKey)
//       return {};
//     }
//     return { orderByKey, orderAsc };
//   }

//   render() {
//     const { tableName, depth = 0, footer, db, includeMedia, title,
//       smartFormProps = {}, variant = "row-wrap", sortableFields,
//       smartCardProps, filterFields, tables, w
//     } = this.props;

//     const { items, joinedInfo, tableInfo,
//       tableColumns, insertMode, fieldConfigs,
//       loadingData
//     } = this.state;

//     const detailedFilter = this.props.detailedFilter?.value || this.state.detailedFilter || [];

//     const { orderByKey, orderAsc } = this.getSort();

//     if (!tableInfo || !fieldConfigs) return null;

//     const pkeyCol = tableColumns?.find(c => c.is_pkey && fieldConfigs.find(fc => fc.name === c.name && !fc.select))

//     /** If nested then remove card style */
//     const fixStyle = (style: React.CSSProperties = {}, extra: React.CSSProperties = {}): React.CSSProperties => {
//       return !depth ? style : { ...style, boxShadow: "unset", borderRadius: "unset", ...extra };
//     }
//     const getFile = (media: AnyObject): Media => ({
//       ...media,
//       id: media.id,
//       url: media.url,
//       content_type: media.content_type,
//       // type: media.content_type,
//       name: media.original_name
//     })

//     let popup;

//     if (tableInfo?.isFileTable) {
//       return <>
//         {popup}
//         <div className="flex-row f-1 o-auto min-w-0 min-h-o" style={{ maxHeight: "500px" }}>
//           <FileInput media={items.map(getFile)} />
//         </div>
//       </>
//     }

//     const rootStyle = fixStyle(this.props.style, { border: "unset" });

//     let insertPopup;
//     if (insertMode && smartFormProps?.enableInsert) {
//       let defaultData;
//       /* If parent row then add parent fields */
//       // if(parent?.row){
//       //     tableColumns.filter(c => c.references?.ftable === parent.tableName && c.references.fcols?.length === 1)
//       //         .map(c => {
//       //             defaultData = defaultData || {};
//       //             defaultData = {
//       //                 ...defaultData,
//       //                 [c.name]: parent.row[c.references.fcols[0]]
//       //             }
//       //         })

//       // }
//       insertPopup = <SmartForm asPopup={true}
//         db={db}
//         tables={tables}
//         tableName={tableName}
//         hideChangesOptions={true}
//         defaultData={defaultData}
//         includeMedia={includeMedia}
//         {...smartFormProps}
//         onClose={(dataChanged) => {
//           if (dataChanged) {
//             if (this.props?.onDataChanged) {
//               this.props.onDataChanged();
//             } else {
//               this.setData();
//             }
//           }
//           this.setState({ insertMode: false })
//         }}
//       />
//     }

//     const orderableFields: {
//       name: string;
//       label: string;
//     }[] = [];
//     fieldConfigs.forEach(f => {
//       const res = sortableFields?.includes(f.name);
//       if (res && "fieldConfigs" in f) {
//         console.error(`Cannot sort by a joined table field: ` + f.name);
//         return false
//       }
//       if(res){
//         orderableFields.push({
//           name: f.name,
//           label: f.label
//         })
//       }
//       return res;
//     });
//     tableColumns.map(c => {
//       if(sortableFields?.includes(c.name) && !orderableFields.some(of => of.name === c.name)){
//         orderableFields.push({
//           name: c.name,
//           label: c.label
//         })
//       }
//     })

//     const onFilterChange = detailedFilter => {

//       console.log({ detailedFilter })
//       if(this.props.detailedFilter){
//         this.props.detailedFilter.onChange(detailedFilter);
//       } else {
//         this.setState({ detailedFilter })
//       }
//     }

//     let AddRowButton = (smartFormProps?.enableInsert && db?.[tableName]?.insert) ?
//       <Btn className="f-0 mr-2 shadow mt-p5 absolute b b-active"
//         style={{ backgroundColor: "white", right: "1em", bottom: "1em", zIndex: 2 }}
//         iconPath={mdiPlus}
//         onClick={() => { this.setState({ insertMode: true }) }}
//         variant="outline"
//         color="action"
//       /> :
//       null,

//       SortButton = !orderableFields.length ?
//         null :
//         <div className={"ml-auto flex-row min-h-0 f-0 relative ai-center pl-p5"}>
//           <Select
//             id="orderbycomp"
//             buttonClassName="shadow bg-color-0"
//             label="Sort by"
//             asRow={true}
//             value={orderByKey}
//             fullOptions={orderableFields.map(f => ({
//               key: f.name,
//               label: f.label || f.name,
//             }))}
//             onChange={(orderByKey) => {
//               this.setState({ orderByKey })
//             }}
//           />
//           <Btn iconPath={orderAsc ? mdiSortReverseVariant : mdiSortVariant} onClick={() => { this.setState({ orderAsc: !orderAsc }) }} />
//         </div>

//     const fieldConfigsL0 = (fieldConfigs || []).filter(fc => !("fieldConfigs" in fc) || fc.render)
//     const fieldConfigsL1 = (fieldConfigs || []).filter(fc => ("fieldConfigs" in fc && !fc.render))  //   && !fc.hide

//     return <div
//       className={"flex-col min-h-0 f-1 relative  "}
//       style={{}}
//     >
//       <SmartFilterBar
//         table_name={tableName}
//         db={db}
//         onChange={detailedFilter => {
//           this.setState({ detailedFilter })
//         }}
//         filter={detailedFilter}
//         tables={tables}
//         leftContent={insertPopup}
//         rightContent={SortButton}
//       />
//       {AddRowButton}
//       <div className="flex-col o-auto f-1 relative p-1 pt-0 min-h-0">
//         {loadingData && <Loading variant="cover" delay={1} /> }
//         {(items.length && depth) ? <div className="bottom-fader" /> : null}
//         {items.map((item, i) => (
//         <div key={pkeyCol ? (item[pkeyCol.name] || i) : i}
//           className={"flex-col " + (i? " mt-1 " : "") + (parent ? "" : " card ") + (depth ? " b b-color " : "")}
//           style={{}}
//         >
//           <SmartCard
//             tables={tables}
//             db={db}
//             tableName={tableName}
//             style={rootStyle}
//             defaultData={item}
//             variant={variant}
//             disableVariantToggle={true}
//             includeMedia={includeMedia}
//             title={title && title(item, tableColumns)}
//             fieldConfigs={fieldConfigsL0 as FieldConfig[]}
//             {...smartCardProps}
//             smartFormProps={smartFormProps}
//             footer={() => (
//               <div className={"flex-col "}>
//                 {fieldConfigsL1.map((fc: FieldConfigTable, i) => (
//                   <div key={"j" + i} className={"flex-col mt-p5 " + (!parent ? "p-1" : "")}>
//                     <div className="mb-p25 mt-p5 p-p5 font-bold noselect">{fc.label || fc.name}</div>
//                     <SmartCardView
//                       db={db}
//                       tableName={fc.name}
//                       style={{ border: "unset", padding: 0 }}
//                       dataItems={item[fc.name]}
//                       fieldConfigs={fc.fieldConfigs}
//                       columns={joinedInfo?.[fc.name]?.tableColumns}
//                       depth={depth + 1}
//                       includeMedia={includeMedia}
//                       smartFormProps={fc.smartFormProps}
//                       excludeNulls={fc?.smartCardProps?.excludeNulls}
//                       smartCardProps={fc?.smartCardProps}
//                       onDataChanged={this.props?.onDataChanged || this.onDataChanged}
//                     />
//                   </div>
//                 ))}
//                 {smartCardProps?.footer?.(item)}
//               </div>
//             )}
//           />
//           {footer?.(item, tableColumns)}
//         </div>))}
//       </div>
//     </div>
//   }
// }
