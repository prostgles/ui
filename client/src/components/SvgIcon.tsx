import React from "react"

export const SvgIcon = (props: { icon: string, className?: string, style?: React.CSSProperties; size?: number }) => {
  const sizePx = `${props.size || 24}px`;
  return <img 
    src={`/icons/${props.icon}.svg`} 
    className={props.className} 
    style={{
      width: sizePx,
      height: sizePx,
      ...props.style,
    }} 
    alt={props.icon}
  />
}