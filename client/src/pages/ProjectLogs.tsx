export default { ____________d: 1 };

// import React from 'react';
// import FormField from '../components/FormField/FormField';
// import Checkbox from '../components/Checkbox';
// import Loading from '../components/Loading';
// import XTerm from '../components/XTerm';

// import { mdiDatabase, mdiLinkBoxVariantOutline, mdiTableMultiple, mdiAccountCheckOutline, mdiHome, mdiMicrosoftVisualStudioCode, mdiInformationOutline, mdiPulse } from '@mdi/js';

// import { BrowserRouter, Switch, Route, Link, matchPath } from 'react-router-dom';

// import { format, eachDayOfInterval, getHours, getMinutes, startOfDay, differenceInHours } from 'date-fns';
// import { enGB, eo, de, ro } from 'date-fns/esm/locale'

// import { get } from "../utils";
// import { NavLink } from 'react-router-dom';
// import RTComp, { DeepPartial } from "../dashboard/RTComp";
// import Dashboard from "../dashboard/Dashboard";

// import prostgles from  "prostgles-client";
// import io from "socket.io-client";
// import { DBHandlerClient, SQLResult, Auth } from "prostgles-client/dist/prostgles";

// import { TimeChart } from "../dashboard/Charts";

// import PopupMenu from '../components/PopupMenu';
// import Rules from "./Rules";

// type P = {
//   id: any;
//   db: DBHandlerClient;
// }

// type S = {
//   id: string;
//   url: string;
//   url_code_server?: string;
//   dbProject: DBHandlerClient;
//   dev_mode?: boolean;
//   iframeLoaded: boolean;
//   iframeCached: boolean;
//   status?: "creating" | "error" | "live" | "";
//   timeChartData: any[];
// }

// type D = {

// }

// export default class ProjectLogs extends RTComp<P, S> {

//   state = {
//     id: null,
//     name: "",
//     logs: "",
//     url: "",
//     timeChartData: [],
//     status: "" as S["status"],
//     notFound: false,
//     loading: true,
//     dbProject: undefined,
//     iframeLoaded: false,
//     iframeCached: false,
//     url_code_server: undefined,
//   }

//   loaded = false;
//   sub = null;
//   async onDelta(deltaP: Partial<P>, deltaS: Partial<S>, deltaD?: DeepPartial<D>){
//     const { dbProject, status } = this.state;
//     const { db, id } = this.props;

//     const delta = { ...deltaP, ...deltaS, ...deltaD }
//     console.log("project", delta)

//     if(db && !this.sub){
//       const proj = await db.projects.findOne({ id });
//       let ns: any = { loading: false };
//       this.sub = await db.projects.subscribe({ id }, { select: ["id", "logs"]}, (project, delta) => {
//         if(project && project.length){
//           this.setState(project[0]);
//           // console.log(get(project, "0.logs.app.log"));
//         }
//       });

//       if(proj) {
//       } else {
//         ns = {
//           ...ns,
//           notFound: true
//         }
//       }
//       this.setState(ns)
//     }
//   }

//   onUnmount(){
//     if(this.sub) this.sub.unsubscribe();
//   }

//   render(){
//     const {
//       name, logs, notFound, loading = true,
//       url_code_server, dbProject,
//       iframeLoaded = false, iframeCached = false,
//     } = this.state;
//     const { id, db } = this.props;

//     if(!this.sub) return <Loading />

//     return (
//       <div className="f-1 flex-col bg-color-0 h-fit min-h-0 " >
//         <ProjectResourceMonitor project_id={id} db={db} className="f-1 min-h-0 min-w-0" />
//         <div className="f-0 mt-1">Console (read-only)</div>
//         <XTerm className="o-auto f-1 w-full mt-p5 noselect pe-none" style={{ maxHeight: "200px", }} value={get(logs, "app.log")} />
//       </div>
//     )
//   }
// }

// export function getStatusColor(status: string){

//   let statusColor = "red";
//   if(status === "live"){
//     statusColor = "green"
//   } else if(status === "creating" || status === "restarting"){
//     statusColor = "yellow"
//   }
//   return statusColor;
// }

// type Log = {
//   name: string;
//   data: any[];
// }

// export class ProjectResourceMonitor extends RTComp<{
//   db: DBHandlerClient;
//   project_id: string;
//   className?: string;
// }, {
//   loading:boolean;
//   logs: Log[]
// }> {

//   state = {
//     loading: true,
//     logs: []
//   }

//   loaded = false;
//   sub = null;
//   interval = null;
//   async onDelta(deltaP, deltaS, deltaD?){
//     const { loading } = this.state;
//     const { db, project_id } = this.props;
//     if(db && !this.loaded){
//       this.loaded = true;
//       let ns: any = { loading: false };

//       // this.sub = await db.logs.subscribe({ $existsJoined: { "project_resources": { project_id } } }, {}, (logs, delta) => {
//       //   console.log(logs);
//       // });
//       const resources = await db.project_resources.find({ project_id });
//       // this.interval = setInterval(async () => {
//         let logs = [];
//         for(const resource of resources){
//           let data = await db.logs.find({ resource_id: resource.id }, { select: { date: { $date_trunc: ["second", "tstamp"] }, cpu_mhz: 1 }, orderBy: { tstamp: -1 } });
//           logs.push({
//             name: resource.id,
//             data: data.map(d => ({
//               ...d,
//               value: d.cpu_mhz
//             }))
//           })
//           this.setState({ loading: false, logs });

//       // db.logs.find({ resource_id: 1 }, { select: { resource_id: 1, cpu_perc: 1, date: { $date_trunc: ["second", "tstamp"] } } })
//       //   .then(data => {
//       //     this.setState({
//       //       timeChartData: data.map(d => ({ ...d, color: [0,0,0], value: d.cpu_perc }))
//       //     })
//       //   });
//         }
//       // }, 1000)

//     }
//   }

//   onUnmount(){
//     if(this.sub) this.sub.unsubscribe();
//     if(this.interval) clearInterval(this.interval);
//     this.interval = null;
//   }

//   render(){
//     const { logs, loading  } = this.state;
//     const { db, className } = this.props;

//     if(loading) return <Loading />

//     // need three charts with network/cpu/ram + volume size on disk info
//     const getYLabel = (val) => `${val} MHz`,
//       chartData = logs.map((l, i)=> [
//         { getYLabel, data: l.data.reverse().map((d, i)=> ({ ...d, date: !i? new Date(2018, 0, 1) : d.date  })), color: "black" },
//         { getYLabel, data: l.data.reverse().map((d, i) => ({ ...d, value: d.value * Math.random() })), color: "violet" },
//         { getYLabel, data: l.data.reverse().map((d, i) => ({ ...d, value: d.value * Math.random() })), color: "green" }
//       ]
//     );

//     let content: any = <div>No logs yet</div>;
//     if(logs.length){
//       content = chartData.map((d, i)=> (<div key = {i}>
//         <div className="f-0 mt-1">
//           CPU
//         </div>
//         <TimeChart key={i} className="b mt-p5" layers={d} style={{ maxHeight: "200px" }} />
//       </div>))
//     }

//     return content;
//     return (
//       <div className={"f-1 flex-col bg-color-0 h-fit " + className}>
//         {content}
//       </div>
//     )
//   }
// }
