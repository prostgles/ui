import type { FunctionComponent } from "react";
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import Chat from "../components/Chat/Chat";
import Loading from "../components/Loading";
import { get } from "../utils";

type P = any;
// {
//   db: any;
//   methods: any;
//   user: any;
//   chat: ChatData;
//   setTitle: any;
// };

type ChatData = {
  id: number | string;
  other_user: string;
  avatar_url: string;
};

let msgSub: any = null;

const ChatWrapped: FunctionComponent<P> = (props) => {
  const { db, methods, user } = props;
  const [loading, setLoading] = useState(true);
  const [chatNotFound, setChatNotFound] = useState<any>(false);
  const [messages, setMessages] = useState<any>([]);
  const chat_id: string = get(props, "match.params.id");

  const [chat, setChat] = useState<ChatData>({
    id: 2,
    other_user: "John W",
    avatar_url: "/worker_avatar.png",
  });
  // console.log(props);

  useEffect(() => {
    return () => {
      if (msgSub) msgSub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (db && user) {
        if (chat_id) {
          const chat = await methods.getChat(chat_id);
          // db.chats.findOne({ id: chat_id }, { select: { "*": 1, users: { first_name: 1, last_name: 1 } }});
          console.log(chat);
          // setChat({
          //   id: chat_id,
          //   other_user:
          // })

          if (!chat) {
            setChatNotFound(true);
            setLoading(false);
          } else {
            setChat({
              id: chat_id,
              other_user:
                get(chat, "other_participants.0.first_name") +
                " " +
                get(chat, "other_participants.0.last_name"),
              avatar_url: "/worker_avatar.png",
            });

            if (msgSub) await msgSub.unsubscribe();
            msgSub = await db.messages.subscribe(
              { chat_id },
              {
                select: {
                  "*": 1,
                  media: { local_url: 1, content_type: 1, final_name: 1 },
                },
                orderBy: { sent: 1 },
              },
              (messages: any[]) => {
                setMessages(
                  messages.map((m) => ({
                    ...m,
                    message: m.text,
                    incoming: m.user_id !== user.id,
                    media:
                      m.media && m.media.length ?
                        {
                          ...m.media[0],
                          url: m.media[0].local_url,
                          name: m.media[0].final_name,
                        }
                      : undefined,
                  })),
                );
              },
            );
            setLoading(false);
          }
        }
        // const messages = await db.messages.find({ chat_id: props.}, { select: "*"});
        // console.log(chats);
        // setChats(chats.map((c: any )=> ({ ...c,
        //   last_sent: new Date(), other_user: "John W", avatar_url: "/worker_avatar.png"
        // })))
        // const messages = await db.messages.find({ chat_id: props.}, { select: "*"});
      }
    })();
  }, [db]);

  const onSend = async (
    message?: string,
    media?: any,
    mediaName?: string,
    mediaContentType?: string,
  ) => {
    if (db && db.messages && db.messages.insert && (message || media)) {
      let m;
      if (media && methods && methods.upload) {
        m = await methods.upload(media, mediaName, mediaContentType);
        console.log(m, media, mediaName);
      }
      db.messages.insert({ chat_id, text: message, media_id: m ? m.id : null });
    }
    // return setMessages([...messages, { message, incoming: false, sender_id: -1 }])
  };

  useEffect(() => {
    console.log(props);
    props.setTitle(
      <div className="avatar mr-1 f-0">
        <img loading="lazy" className="w-full" src={chat.avatar_url}></img>
      </div>,
    );

    const { db } = props;
    console.log(db);
  }, []);

  if (loading) return <Loading />;

  if (chatNotFound)
    return (
      <div>
        <p>Chat not found</p>
        <NavLink to="/chats">Go back to chats</NavLink>
      </div>
    );

  return (
    <div
      className="flex-col bg-color-0 h-fit shadow"
      style={{ maxHeight: "calc(99vh - 75px)", minWidth: 0 }}
    >
      <div className="f-0 flex-row p-1 bg-color-1 ai-center">
        <div className="avatar mr-1 f-0">
          <img loading="lazy" className="w-full" src={chat.avatar_url}></img>
        </div>
        <NavLink to={"/profile/1"} className="text-0p5 font-medium">
          {chat.other_user}
        </NavLink>
      </div>
      <Chat
        className="f-1"
        style={{ minHeight: 0 }}
        onSend={onSend}
        messages={messages}
      />
    </div>
  );
};

export default ChatWrapped;
