import { path, style } from "d3";
import React, { useEffect } from "react";
import sanitizeHtml from "sanitize-html";

const cachedSvgs = new Map<string, string>();

export const SvgIcon = (props: { icon: string, className?: string, style?: React.CSSProperties; size?: number }) => {

  const [svg, setSvg] = React.useState<string | null>(cachedSvgs.get(props.icon) || null);
  const iconPath = `/icons/${props.icon}.svg`;
  useEffect(() => {
    if (!cachedSvgs.has(iconPath)) {
      fetch(iconPath)
        .then(res => res.text())
        .then(svgRaw => {
          const svg = sanitizeHtml(svgRaw, {
            allowedTags: ["svg", "path"],
            allowedAttributes: { 
              svg: ["width", "height", "view", "style", "xmlns", "viewBox", "role"], 
              path: ["d", "style"],
            },
          })
          cachedSvgs.set(iconPath, svg);
          setSvg(svg);
        })
    }
  }, [iconPath]);

  const sizePx = `${props.size || 24}px`; 
  return <div 
    className={props.className} 
    style={{
      width: sizePx,
      height: sizePx,
      ...props.style,
    }}
    dangerouslySetInnerHTML={svg? { __html: svg } : undefined}
    children={svg? null : <img 
      src={iconPath} 
      className={props.className} 
      style={{
        width: sizePx,
        height: sizePx,
        ...props.style,
      }} 
      alt={props.icon}
    />}
  /> 
  
}