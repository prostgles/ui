import React, { FunctionComponent, ReactChild, useEffect, useState } from 'react';
import "./Chat.css";

import { mdiAttachment, mdiFile, mdiMicrophone, mdiStop } from '@mdi/js';
import Icon from '@mdi/react';
type Message = {
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
  style?: object;
  className?: string;
  onSend: (msg?: string, media?: Blob | ArrayBuffer | File , mediaName?: string, mediaContentType?: string) => Promise<any | void>;
  messages: Message[];
}

class AudioRecorder {
  mediaOptions?: any;
  recorder?: MediaRecorder;

  constructor(){
    this.mediaOptions = {
      tag: 'audio',
      type: 'audio/ogg',
      ext: '.ogg',
      gUM: {audio: true}
    };
    this.recorder = undefined; 
  }

  start(cb: (result: Blob) => any | void){
    let chunks: any = [];
    navigator.mediaDevices.getUserMedia(this.mediaOptions.gUM).then(stream => {
     
      this.recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      this.recorder.ondataavailable = (e: any) => {
        chunks.push(e.data);
        if(this.recorder && this.recorder.state == 'inactive'){
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
const Chat:FunctionComponent<P> = (props) => {
  const {
    className = "",
    style = {},
    messages,
    onSend
  } = props;
  
  const [recording, setRecording] = useState(false);
  const [scrollRef, setScrollRef] = useState<HTMLDivElement>();
  const startRecording = () => {
    audioRec.start(blob => {
      onSend("", blob, "recording.ogg", "audio/webm");
    });
    setRecording(true);
  }
  const stopRecording = () => {
    if(audioRec && recording) {
      audioRec.stop();
      setRecording(false);
    }
  }

  useEffect(() => {
    if(scrollRef){
      if(scrollRef.scrollTo) scrollRef.scrollTo(0, scrollRef.scrollHeight)
    }
  }, [messages]);

  const [msg, setMsg] = useState("");
  

  if(!messages) return null; 

  const spinner = (
    <div className="spinner">
      <div className="bounce1"></div>
      <div className="bounce2"></div>
      <div className="bounce3"></div>
    </div>
  );

  const sendMsg = async (msg: string) => {
    if(msg && msg.trim().length){
      await onSend(msg);
      setMsg("");
    }
  }

  let ref: HTMLTextAreaElement;

  const makeMessage = (m: Message, i: number) => {
    let content = m.message;
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
    <div className={"chat-container chat-component " + className} style={style}>
      <div className="message-list " ref={e => { if(e){ setScrollRef(e); }}}>
        {messages.map(makeMessage)}            
      </div>
                
      <div className="send-wrapper">
        <textarea ref={e => {
          if(e) ref = e;
        }}
          className="no-scroll-bar bg-1 text-0" 
          rows={1} 
          value={msg}
          onKeyDown={e => {
            if(ref && e.key.toLocaleLowerCase() === "enter"){
              e.preventDefault();
              sendMsg(ref.value)
            }
          }}
          onChange={e => { setMsg(e.target.value) }}
        ></textarea>
        {/* <button className="bg-transparent p-p5 ml-p5 mr-p5 bg-active-hover" onClick={async (e)=>{
          sendMsg(ref.value)
        }}>
          <svg viewBox="0 0 24 24" role="presentation"><path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"></path></svg>
        </button> */}
        <label className="button bg-transparent p-p5 ml-p5 mr-p5 bg-active-hover" style={{ background: "transparent", padding: ".5em"}}>
          <input type="file" style={{ display: "none" }} onChange={async e => {
            console.log(e.target.files);
            const file = e.target.files?.[0];
            if(file){
              onSend("", file , file.name, file.type);
            }
          }}/>
          <Icon path={mdiAttachment} color={"rgb(5, 149, 252)"}/>
        </label>
        <button className=" bg-transparent p-p5 ml-p5 mr-p5 bg-active-hover" 
          onClick={async (e)=>{
            if(recording) stopRecording();
            else startRecording();
          }}
        >
          <Icon path={recording? mdiStop : mdiMicrophone} color={recording? "rgb(226 0 0)" : "rgb(5, 149, 252)"}/>
        </button>
      </div>
    </div>
  );
}


export default Chat;