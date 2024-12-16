import React from "react";
import "./Hotkey.css";

type P = {
  keyStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  label: string;
  keys: string[];
};
export const Hotkey = ({ label, keys, keyStyle, style }: P) => {
  return (
    <div className="flex-row-wrap ai-center gap-p5 noselect " style={style}>
      {label && <div className="mr-p25">{label}:</div>}
      <div className="flex-row ai-center gap-p25">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            {!!i && <span>+</span>}
            <div className="hotkey shadow" style={keyStyle}>
              {key}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
