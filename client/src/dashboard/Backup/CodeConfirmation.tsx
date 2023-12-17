
import React, { useEffect, useState } from "react";
import Btn from "../../components/Btn";
import FormField from "../../components/FormField/FormField";
import Loading from "../../components/Loading";
import { PopupProps } from "../../components/Popup/Popup";
import PopupMenu from "../../components/PopupMenu";
import { useIsMounted } from "./CredentialSelector";

type CodeConfirmationProps = {
  button: React.ReactChild;
  message: React.ReactNode | (() => Promise< React.ReactNode>);
  confirmButton: (popupClose) => React.ReactNode;
  topContent?: (popupClose) => React.ReactNode;
  title?: React.ReactNode;
  show?: "button" | "confirmButton";
  className?: string;
  style?: React.CSSProperties;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  hideConfirm?: boolean;
  positioning?: PopupProps["positioning"]
}
export function CodeConfirmation({ button, confirmButton, message: rawMessage, show, topContent, className, style, contentClassName = "", contentStyle, hideConfirm = false, title, positioning = "center" }: CodeConfirmationProps): JSX.Element {


  const [message, setMessage] = useState<React.ReactNode>();

  useEffect(() => {
    if(typeof rawMessage === "function"){
      (async () => {
        setMessage(await rawMessage())
      })()
    } else {
      setMessage(rawMessage)
    }
  }, [rawMessage])

  const isMounted = useIsMounted();
  const getCode = () => Math.random().toFixed(3).slice(2, 5);
  const [key, setKey] = useState(getCode());
  const [hasConfirmed, sethasConfirmed] = useState(false);

  if(show) return show === "button"? <>{button} </>:  <>{confirmButton(()=>{})} </>;
  
  return <PopupMenu
    key={key}
    title={title}
    className={className}
    style={style}
    button={button} 
    initialState={{ ok: false, code: key, confirmCode: "" }}
    positioning={positioning}
    onClose={() => {
      setKey(getCode());
    }}
    clickCatchStyle={{ opacity: .4 }}
    contentClassName="p-1"
    render={(_popupClose) => {
      const popupClose = () => { 
        if(!isMounted()) return;
        setKey(getCode()); 
      }
      return <div className={"flex-col gap-1 ai-start o-auto p-p25 " + contentClassName} style={contentStyle}>
        {topContent?.(popupClose)}
        
        {!hideConfirm && <>
          {message ?? <Loading />}
          <CodeChecker key={key} onChange={sethasConfirmed} />
          <div className="flex-row gap-1 ai-center mt-1  w-full">
            <Btn onClick={popupClose} variant="outline">Close</Btn>
            {hasConfirmed && confirmButton(popupClose)}
          </div>
        </>}
      </div>
    }}
  />
}


export function CodeChecker({ className, style, onChange }: Pick<CodeConfirmationProps, "style" | "className"> & { onChange: (hasConfirmed: boolean)=>void }): JSX.Element {

  const getCode = () => {
    
    // return Math.random().toFixed(3).slice(2, 5);

    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    return [Math.random(), Math.random(), Math.random()].map(rand => {
      const randomCharacter = alphabet[Math.floor(rand * alphabet.length)];
      return randomCharacter;
    }).join("");
  };
  const [code, setCode] = useState(getCode());
  const [confirmCode, setConfirmCode] = useState("");


  return <div className={"flex-col " + (className ?? "")} style={style}>
    <p><span className="noselect">Confirm by typing this code: </span><strong title="confirmation-code">{code}</strong></p>
    <FormField
      name="confirmation" 
      value={confirmCode} 
      onChange={val => {
        setConfirmCode(val);
        onChange(val === code);
      }}
    />
  </div>
}

