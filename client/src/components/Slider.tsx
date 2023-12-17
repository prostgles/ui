import React from "react";
import "./Slider.css";
import RTComp from '../dashboard/RTComp';


type P = {
  style?: React.CSSProperties;
  className?: string;

  onChange: (val: number, event?: Parameters<React.ChangeEventHandler<HTMLInputElement>>[0]) =>void;
  min: number;
  max: number;
  step?: number;
  value?: number;

  defaultValue?: number;
  label?: string;
}

export default class Slider extends RTComp<P, any> {
  state = {
    ready: false
  }

  onMount() {
    
  }

  onDeltaCombined = (delta, deltaKeys) => {
    
    
  }

  render() {
    const { style = {}, className = "", min, max, value, label, onChange, step, defaultValue } = this.props;
    
    
    return (
      <div className={"slidecontainer flex-col"+ className}  style={style} >
        {label && <div className="slider-label mb-p25 text-gray-400 noselect" onDoubleClick={!Number.isFinite(defaultValue)? undefined : () => { onChange(defaultValue!) }}>{label}</div>}
        <input type="range" min={min} max={max} value={value ?? min ?? max} step={Math.min(1, step ?? Math.abs(min - max)/60)} className="slider pointer" onChange={e => onChange(+e.target.value, e) }/>
      </div>
    );

  }
}