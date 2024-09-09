import { useIsMounted } from "prostgles-client/dist/prostgles";
import React, { useEffect } from "react";
import sanitizeHtml from "sanitize-html";

const cachedSvgs = new Map<string, string>();

export const SvgIcon = ({ icon, className, size, style }: { icon: string, className?: string, style?: React.CSSProperties; size?: number }) => {

  const getIsMounted = useIsMounted();
  const iconPath = `/icons/${icon}.svg`;
  const [svg, setSvg] = React.useState(cachedSvgs.get(iconPath));
  useEffect(() => {
    const iconNameContainsOnlyLetters = /^[a-zA-Z]+$/.test(icon);
    if(!iconNameContainsOnlyLetters){
      console.error(`Icon name "${icon}" must contain only letters`);
      return;
    }
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
  }, [iconPath, getIsMounted, icon]);

  const sizePx = `${size || 24}px`;
  return <div
    className={className}
    style={{
      width: sizePx,
      height: sizePx,
      ...style,
    }}
    dangerouslySetInnerHTML={!svg? undefined : { __html: svg }}
  />

}