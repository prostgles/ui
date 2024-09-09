import { useIsMounted } from "prostgles-client/dist/prostgles";
import React, { useEffect } from "react";
import sanitizeHtml from "sanitize-html";

const cachedSvgs = new Map<string, string>();

export const SvgIcon = (props: { icon: string, className?: string, style?: React.CSSProperties; size?: number }) => {

  const getIsMounted = useIsMounted();
  const iconPath = `/icons/${props.icon}.svg`;
  const [svg, setSvg] = React.useState(cachedSvgs.get(iconPath));
  useEffect(() => {
    if (cachedSvgs.has(iconPath)) return;
    fetch(iconPath)
      .then(res => res.text())
      .then(svgRaw => {
        const svg = sanitizeHtml(svgRaw, {
          allowedTags: ["svg", "path"],
          allowedAttributes: {
            svg: ["width", "height", "view", "style", "xmlns", "viewBox", "role"],
            path: ["d", "style"],
          },
          parser: {
            lowerCaseTags: false,
            lowerCaseAttributeNames: false
          }
        })
        cachedSvgs.set(iconPath, svg);
        if(!getIsMounted()) return;
        setSvg(svg);
      })
  }, [iconPath, getIsMounted]);

  const sizePx = `${props.size || 24}px`;
  return <div
    className={props.className}
    style={{
      width: sizePx,
      height: sizePx,
      ...props.style,
    }}
    dangerouslySetInnerHTML={!svg? undefined : { __html: svg }}
  />

}