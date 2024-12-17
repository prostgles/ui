// import React, { FunctionComponent, ReactChild, useEffect, useState } from 'react';
// import "./Scheduler.css";

// type P = {
//   style?: object;
//   className?: string;
//   items: {
//     content: ReactChild;
//     from: Date;
//     to: Date;
//     onClick?: any;
//     post_code: string;
//   }[]
// }

// export const SECOND = 1000,
// MINUTE = 60 * SECOND,
// HOUR = 60 * MINUTE,
// DAY = 24 * HOUR;

// const Scheduler:FunctionComponent<P> = (props) => {
//   const {
//     className = "",
//     style = {}
//   } = props;
//   const locale = enGB;

//   let items = props.items.sort((a, b) => +a.from - (+b.from));

//   const [day, setDay] = useState<any>(null);
//   const [days, setDays] = useState<any[]>([]);

//   const getFromHour = (f: Date, int = false) => {
//     if(f <= startOfDay(new Date())){
//       return 0;
//     } else {
//       let res = getHours(f);
//       if(!int) res += getMinutes(f)/60;
//       return res;
//     }
//   }
//   const getToHour = (f: Date, int = false, continueEnd = false) => {
//     if(f >= startOfDay(Date.now() + DAY)){
//       if(continueEnd) return 24 + getHours(f);
//       return 24;
//     } else {
//       let res = getHours(f);
//       if(!int) res += getMinutes(f)/60;
//       return res;
//     }
//   }

//   const HOUR_HEIGHT = 80;

//   useEffect(()=>{
//     let start = new Date();
//     if(items && items.length){
//       start = items[0]!.from;
//     }
//     let end = new Date(+start + 7 * 24 * 3600 * 1000)

//     var days = eachDayOfInterval({ start, end });
//     setDay(days[0]);
//     setDays(days);
//   }, [items]);

//   const getDayItems = (day: Date) => {
//     return items.filter(d => +d.from < +day + DAY - MINUTE && +d.to > +day);
//   }

//   let dayItems = getDayItems(day);

//   let startHour = 7;
//   let endHour = 21;
//   if(dayItems && dayItems.length){
//     let f = dayItems[0]!;
//     startHour = getFromHour(f.from, true) || startHour;
//     if(startHour) startHour--;

//     let l = dayItems[dayItems.length-1]!;
//     endHour = getToHour(l.to, true) || endHour;
//     if(endHour < 24) endHour++;
//   }
//   let nt = endHour - startHour + 1;
//   let ticks = new Array(Math.max(1, nt)).fill(startHour).map((d,i)=> d + i);

//   const getDaySelector = () => (
//     <div className="day-wrapper flex-row p-p25 f-0" style={{ overflow: "auto", maxWidth: "100vw" }}>
//       {days.map((d, i) => (
//         <button key={i} className={"day flex-col f-0 b " + (i? "ml-p5" : "") + (day === d? " active " : " secondary bg-color-0 ")}
//           onClick={()=>{
//             setDay(d);
//           }}
//         >
//           <div>{format(d, "dd MMM", { locale } )}</div>
//           <div className="capitalize text-xl font-medium" >{format(d, "EEE", { locale } )}</div>
//           <div className="">{getDayItems(d).length} </div>
//         </button>
//       ))}
//     </div>
//   );

//   if(!day) return null;
//   return (
//     <div className={"scheduler min-h-0 flex-col" + className} style={style}>
//       {getDaySelector()}
//       <div className={"flex-row p-1 f-1 o-auto min-h-0 relative b"}>

//         <div className={"flex-col f-1"}>
//           {ticks.map((h, i) => (
//             <div key={i} className="flex-row f-0" style={{ height: HOUR_HEIGHT + "px"}}>
//               <div className="f-0 text-2">{h === 24? "00" : h}:00</div>
//               <div className="f-1  ml-p5 mt-p5" style={{ height: "1px"}} ></div>
//             </div>
//           ))}
//         </div>

//         {dayItems.map(({ content, from, to, post_code, onClick }, i) => {
//           const topOffset = HOUR_HEIGHT * (getFromHour(from) - startHour);
//           const btmOffset = HOUR_HEIGHT * (getToHour(to) - startHour);
//           console.log(getFromHour(from), getToHour(to))
//           const hours = +(differenceInMinutes(to, from)/60).toFixed(1);

//           // debugger
//           return (
//             <button key={i} onClick={onClick} className="item rounded shadow-xl p-p5 absolute bg-color-0 w-fit flex-row text-white"
//             style={{
//               left: "70px",
//               top: `${topOffset + 2 + 24}px`,
//               height: `${btmOffset - topOffset - 2 }px`
//             }}>
//               <div className="flex-col-wrap mr-2 h-full jc-between ai-start" >
//                 <div className="mr-1">{format(from, "HH:mm", { locale } )}</div>
//                 <div>{format(to, "HH:mm", { locale } )}</div>
//               </div>
//               <div className="flex-col-wrap ai-start" style={{ }}>
//                 <div className="text-medium mb-1 mr-1">{`${hours} hour${hours > 1? "s" : ""}`}</div>
//                 <div className="text-medium">{post_code}</div>
//               </div>
//             </button>
//           )
//         })}

//       </div>
//     </div>
//   );
// }

// export default Scheduler;
