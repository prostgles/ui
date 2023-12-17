import React, { useState, useEffect } from 'react'; 
import { NavLink } from "react-router-dom";
 
function Chats(props: any) {
  const { db, user } = props;
  const [chats, setChats] = useState<any>([
    // { id: 1, last_sent: new Date(), other_user: "Support", last_message: "we have fixed your issue...", avatar_url: "/support_avatar.png" },
    // { id: 2, last_sent: new Date(), other_user: "John W", last_message: "OK, no problem!", avatar_url: "/worker_avatar.png" }
  ]);

  useEffect(() => {
    (async () => {
      if(db){
        // const chats = await db.chats.find({}, { select: { 
        //   "*": 1, 
        //   other_user: db.leftJoin.users({}, "*", { limit: 1 })
        // }});
        const chats = await db.chats.find({}, { select: { 
          "*": 1, 
          users: "*",
          last_message: db.leftJoin.messages({})
        }});
        console.log(chats);
        setChats(chats.map((c: any )=> {
          const otherUser = (c.users || []).find((u: any )=> u.id !== user.id);
          let other_user = "";
          if(otherUser) other_user = `${otherUser.first_name} ${otherUser.last_name}`
          return { ...c, 
            last_sent: new Date(), 
            other_user, 
            avatar_url: "/worker_avatar.png"
          }
        }))
      }
    })()
  }, []);

  return (
    <div className="bg-0">
      {chats.map((c: any)=> (
        <NavLink key={c.id} to={"/chat/" + c.id} className="flex-row no-decor text-gray-800 p-1 b b-gray-300 b-gray-900-hover">
          <div className="avatar mr-1 f-0">
            <img loading="lazy" className="w-full" src={c.avatar_url}></img>
          </div>
          <div className="flex-col mr-1 f-1">
            <div className="text-gray-800 font-medium">{c.other_user}</div>
            <div className="text-1 mt-p5">{c.last_message}</div>
          </div>
          <div className="text-1 f-0 mt-1">{c.last_sent}</div>
        </NavLink>
      ))} 
      <button onClick={e => {
        db.chats.insert({})
      }}>create</button>     
    </div>
  );
}

export default Chats;