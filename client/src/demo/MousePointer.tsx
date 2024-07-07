import React from "react";
import ReactDOM from "react-dom";
import { getModalRoot } from "../components/Popup/Popup";
import { setPointer } from "./demoUtils";

const mousePointerStyle: React.CSSProperties = {
  position: "fixed",
  display: "none",
  zIndex: 219999,
  left: "0",
  top: "0",
  width: "20px",
  height: "20px",
  backgroundColor: "#2f2e2e69",
  borderRadius: "50%",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none"
};

export const MousePointer = () => {
  const pointerNode = <div 
    ref={e => {
      if(e){
        setPointer(e);
      }
    }} 
    style={mousePointerStyle} 
    className="shadow"
  />;

  return ReactDOM.createPortal(pointerNode, getModalRoot(true));
}