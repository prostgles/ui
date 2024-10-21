import type { FunctionComponent, ReactChild} from "react";
import React, { useEffect, useRef, useState } from "react";
import "./Chat.css";

import { mdiAt, mdiAttachment, mdiFile, mdiMicrophone, mdiSend, mdiStop } from "@mdi/js";
import { Icon } from "../Icon/Icon";
import { classOverride, FlexRow } from "../Flex";
import FileInput, { generateUniqueID } from "../FileInput/FileInput";
import Btn from "../Btn";
import Loading from "../Loading";

export type Message = {
  message: ReactChild;
  sender_id: number | string;
  incoming: boolean;
  sent: Date;
  media?: {
    url: string;
    content_type: string;
    name: string;
  }
};

type P = {
  style?: React.CSSProperties;
  className?: string;
  onSend: (msg?: string, media?: Blob | ArrayBuffer | File , mediaName?: string, mediaContentType?: string) => Promise<any | void>;
  messages: Message[];
  allowedMessageTypes?: Partial<{
    audio: boolean;
    file: boolean;
  }>;
}

class AudioRecorder {
  mediaOptions?: any;
  recorder?: MediaRecorder;

  constructor(){
    this.mediaOptions = {
      tag: "audio",
      type: "audio/ogg",
      ext: ".ogg",
      gUM: {audio: true}
    };
    this.recorder = undefined; 
  }

  start(cb: (result: Blob) => any | void){
    const chunks: any = [];
    navigator.mediaDevices.getUserMedia(this.mediaOptions.gUM).then(stream => {
     
      this.recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      this.recorder.ondataavailable = (e: any) => {
        chunks.push(e.data);
        if(this.recorder && this.recorder.state == "inactive"){
          cb(new Blob(chunks, { type: this.mediaOptions.type }));
        }
      };
      this.recorder.start();
    }).catch(console.error);
  }

  stop(){
    if(this.recorder) {
      this.recorder.stream.getTracks().forEach(function(track) {
        track.stop();
      });
      this.recorder.stop();
    }
    else console.error("WTF", this);
  }
}
const audioRec = new AudioRecorder();

export const Chat: FunctionComponent<P> = (props) => {
  const {
    className = "",
    style = {},
    messages,
    onSend,
    allowedMessageTypes = {
      audio: false,
      file: false
    }
  } = props;
  
  const [recording, setRecording] = useState(false);
  const [scrollRef, setScrollRef] = useState<HTMLDivElement>();
  const ref = useRef<HTMLTextAreaElement>(null);
  const startRecording = () => {
    audioRec.start(blob => {
      onSend("", blob, "recording.ogg", "audio/webm");
    });
    setRecording(true);
  }
  const stopRecording = () => {
    if(recording) {
      audioRec.stop();
      setRecording(false);
    }
  }

  useEffect(() => {
    if(scrollRef){ 
      scrollRef.scrollTo(0, scrollRef.scrollHeight)
    }
  }, [messages, scrollRef]);

  const [msg, setMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const sendMsg = async (msg: string) => {
    if(msg && msg.trim().length){
      setSendingMsg(true);
      try {
        await onSend(msg);
        setMsg("");
      } catch(e){
        console.error(e);
      }
      setSendingMsg(false);
    }
  }

  const makeMessage = (m: Message, i: number) => {
    const content = m.message;
    if(m.media){
      if(typeof m.media.content_type !== "string"){ 
        console.error("Bad media content_type");
      } else if(m.media.content_type.includes("video")){
        return (
          <div className={"message media " + (m.incoming? "incoming" : "")} key={i} >
            <video controls style={{ maxHeight: "320px", height: "fit-content" }} controlsList="nodownload">
              <source src={m.media.url} type={m.media.content_type} />
            </video>
          </div>
        );
      } else if(m.media.content_type.includes("audio")){
        return (
          <div className={"message media " + (m.incoming? "incoming" : "")} key={i} style={{ color: "white" }}>
            <audio controls controlsList="nodownload" src={m.media.url}/>
          </div>
        );
      } else if(m.media.content_type.includes("image")){
        return (
          <div className={"message media " + (m.incoming? "incoming" : "")} key={i} style={{ border: "1px solid " + (!m.incoming? "rgb(5, 149, 252)" : "#cacaca")}}>
            <img  loading="lazy" style={{ maxHeight: "300px", maxWidth: "260px" }} src={m.media.url}/>
          </div>
        );
      } else {
        return  (
          <div className={"message flex-row ai-center" + (m.incoming? "incoming" : "")} key={i} style={{ border: "1px solid " + (!m.incoming? "rgb(5, 149, 252)" : "#cacaca")}}>
            <Icon path={mdiFile} size={0.5} className="f-0 mr-p5"/>
            <a href={m.media.url} target="_blank" style={{ color: "inherit" }}>{m.media.name}</a>
          </div>
        );
      }

    }
    return  <div className={"message " + (m.incoming? "incoming" : "")} key={i} >
      {content}
    </div>
  }

  return (
    <div className={classOverride("chat-container chat-component ", className)} style={style}>
      <div className="message-list " ref={e => { if(e){ setScrollRef(e); }}}>
        {messages.map(makeMessage)}            
      </div>
                
      <div className={"send-wrapper relative " + (sendingMsg? "no-interaction not-allowed" : "")}>
        <textarea 
          ref={ref}
          className="no-scroll-bar bg-color-2 text-0" 
          rows={1} 
          value={msg}
          onKeyDown={e => {
            if(ref.current && !e.shiftKey && e.key.toLocaleLowerCase() === "enter"){
              e.preventDefault();
              sendMsg(ref.current.value)
            }
          }}
          onChange={e => { setMsg(e.target.value) }}
        ></textarea> 
        <FlexRow className="as-end gap-p5 p-p5">
          <Btn
            iconPath={mdiSend} 
            loading={sendingMsg}
            onClick={async (e)=>{
              if(!ref.current) return;
              sendMsg(ref.current.value)
            }}
          />
          {allowedMessageTypes.file && 
            <label className="pointer button bg-transparent bg-active-hover" style={{ background: "transparent", padding: ".5em"}}>
              <input type="file" style={{ display: "none" }} onChange={async e => {
                console.log(e.target.files);
                const file = e.target.files?.[0];
                if(file){
                  onSend("", file , file.name, file.type);
                }
              }}/>
              <Icon path={mdiAttachment} />
            </label> 
          }
          {allowedMessageTypes.audio && 
            <Btn className=" bg-transparent" 
              onClick={async (e)=>{
                if(recording) stopRecording();
                else startRecording();
              }}
              color={recording? "action" : "default"}
              iconPath={recording? mdiStop : mdiMicrophone}
            />
          }
        </FlexRow>
      </div>
    </div>
  );
}