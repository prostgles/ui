import { mdiAlertCircleOutline } from '@mdi/js';
import Icon from '@mdi/react';
import React, { ReactNode } from 'react';
import { get, isEmpty } from '../utils';
import { classOverride } from './Flex';

export default class ErrorComponent extends React.Component<{ 
  error: any; 
  className?: string; 
  noScroll?: boolean;
  style?: React.CSSProperties, 
  pre?: boolean;
  findMsg?: boolean;
  withIcon?: boolean;
  maxTextLength?: number;
  title?: string;
  variant?: "outlined";
  color?: "warning" | "action" | "info";
}, any> {
  ref?: any;

  static parsedError = (val, findMsg?: boolean): string => {
    let res = "";

    if(typeof val === "string") res = val;
    else if(Array.isArray(val)) {
      res = val.map(v => ErrorComponent.parsedError(v)).join("\n");

    } else if(val && !isEmpty(val) && Object.keys(val).length) {
      if(findMsg) {
        res = get(val, "err.err_msg") || get(val, "err.constraint") || get(val, "err.txt")| get(val, "err.message") || val.err_msg || JSON.stringify(val);
      }
      if(!res) res = Object.keys(val).map(k => `${k}: ${JSON.stringify(val[k], null, 2)}`).join("\n");
    } else if(get(val, "toString")) res = val.toString();
    else res = JSON.stringify(val);
    
    if(typeof res === "string" && res.length) {
      res = res.trim();
      if(res.startsWith("\"") && res.endsWith("\"")) res = res.slice(1, -1);
      if(res.toLowerCase().startsWith("error: ")) res = res.slice(7);
      // res = res.replace(/['"]+/g, '');
      res = res.replace(/\\"/g, '"');
    }
    return res
  }

  scrollIntoView = () => {
    const { error } = this.props;
    if(error && this.ref && this.ref.scrollIntoView) {
      if(this.ref.scrollIntoViewIfNeeded){
        this.ref.scrollIntoViewIfNeeded();
      } else this.ref.scrollIntoView();
    }
  }
  componentDidMount(){
    this.scrollIntoView()
  }
  componentDidUpdate(){
    this.scrollIntoView();
  }
  render(){
    const { error, className = "", style = {}, pre = false, findMsg = false, withIcon = false, maxTextLength = 1000, title, noScroll = false, variant, color } = this.props;

    if([null, undefined].includes(error)){
      return null;
    }
    const colorClass = color? `text-${color}` : "text-danger";
    return (
      <div ref={e => { if(e) this.ref = e; }} 
        className={classOverride(`ErrorComponent flex-row ai-center text-danger p-1 o-auto min-w-0 min-h-0 o-auto ${colorClass} ${(pre? " ws-pre " : "")}`, className)} 
        style={{ 
          whiteSpace: "pre-line", 
          textAlign: "left", 
          display: !error? "none" : "flex",
          ...(!className.includes("p-") && { padding: "0 4px"}),
          ...style,
          ...(noScroll && { overflow: "hidden" }),
          minWidth: "150px", // To ensure it shows on mobile
          ...(variant === "outlined" && {
            border: `1px solid var(--${colorClass})`,
            borderRadius: "var(--rounded)",
            padding: ".5em 1em"
          }),
        }}
      >
        {withIcon && <Icon size={1} className="mr-1 as-start" path={mdiAlertCircleOutline} />}
        <div className={"flex-col gap-1 " + (noScroll? "ws-break" : "")}>
          {title && <div className="font-18 bold">{title}</div>}
          {(ErrorComponent.parsedError(error, findMsg) + "").slice(0, maxTextLength)}
        </div>
      </div>
    )
  }
}

export class ErrorTrap extends React.Component<{ children: ReactNode }, { error: any; errorInfo: any }> {

  state = {
    error: "",
    errorInfo: "",
  }


  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
  }

  render(){
    const { error, errorInfo } = this.state;
    const compName = get(this.props, "children.type.name");
    let errVal: any = { error, stack: get(errorInfo, "componentStack") || errorInfo }
    if(compName){
      errVal = {
        component: compName,
        ...errVal,
      }
    }
    if(error) return <ErrorComponent error={errVal} className="bg-0 p-2" />;

    return this.props.children;
  }
}